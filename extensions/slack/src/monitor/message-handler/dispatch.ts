import { resolveHumanDelayConfig } from "openclaw/plugin-sdk/agent-runtime";
import {
  createStatusReactionController,
  DEFAULT_TIMING,
  logAckFailure,
  logTypingFailure,
  removeAckReactionAfterReply,
  type StatusReactionAdapter,
} from "openclaw/plugin-sdk/channel-feedback";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import {
  resolveChannelStreamingBlockEnabled,
  resolveChannelStreamingNativeTransport,
  resolveChannelStreamingPreviewToolProgress,
} from "openclaw/plugin-sdk/channel-streaming";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { resolveAgentOutboundIdentity } from "openclaw/plugin-sdk/outbound-runtime";
import { clearHistoryEntriesIfEnabled } from "openclaw/plugin-sdk/reply-history";
import { resolveSendableOutboundReplyParts } from "openclaw/plugin-sdk/reply-payload";
import type { ReplyDispatchKind, ReplyPayload } from "openclaw/plugin-sdk/reply-runtime";
import { danger, logVerbose, shouldLogVerbose } from "openclaw/plugin-sdk/runtime-env";
import { resolvePinnedMainDmOwnerFromAllowlist } from "openclaw/plugin-sdk/security-runtime";
import { normalizeOptionalLowercaseString } from "openclaw/plugin-sdk/text-runtime";
import { reactSlackMessage, removeSlackReaction } from "../../actions.js";
import { createSlackDraftStream } from "../../draft-stream.js";
import { normalizeSlackOutboundText } from "../../format.js";
import {
  compileSlackInteractiveReplies,
  isSlackInteractiveRepliesEnabled,
} from "../../interactive-replies.js";
import { SLACK_TEXT_LIMIT } from "../../limits.js";
import { recordSlackThreadParticipation } from "../../sent-thread-cache.js";
import {
  applyAppendOnlyStreamUpdate,
  buildStatusFinalPreviewText,
  resolveSlackStreamingConfig,
} from "../../stream-mode.js";
import type { SlackStreamSession } from "../../streaming.js";
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { normalizeSlackAllowOwnerEntry } from "../allow-list.js";
import { resolveStorePath, updateLastRoute } from "../config.runtime.js";
import {
  createSlackReplyDeliveryPlan,
  deliverReplies,
  readSlackReplyBlocks,
  resolveSlackThreadTs,
} from "../replies.js";
import { createReplyDispatcherWithTyping, dispatchInboundMessage } from "../reply.runtime.js";
import { finalizeSlackPreviewEdit } from "./preview-finalize.js";
import type { PreparedSlackMessage } from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Slack reactions.add/remove expect shortcode names, not raw unicode emoji.
const UNICODE_TO_SLACK: Record<string, string> = {
  "👀": "eyes",
  "🤔": "thinking_face",
  "🔥": "fire",
  "👨‍💻": "male-technologist",
  "👨💻": "male-technologist",
  "👩‍💻": "female-technologist",
  "⚡": "zap",
  "🌐": "globe_with_meridians",
  "✅": "white_check_mark",
  "👍": "thumbsup",
  "❌": "x",
  "😱": "scream",
  "🥱": "yawning_face",
  "😨": "fearful",
  "⏳": "hourglass_flowing_sand",
  "⚠️": "warning",
  "✍": "writing_hand",
  "🧠": "brain",
  "🛠️": "hammer_and_wrench",
  "💻": "computer",
};

function toSlackEmojiName(emoji: string): string {
  const trimmed = emoji.trim().replace(/^:+|:+$/g, "");
  return UNICODE_TO_SLACK[trimmed] ?? trimmed;
}

export function isSlackStreamingEnabled(params: {
  mode: "off" | "partial" | "block" | "progress";
  nativeStreaming: boolean;
}): boolean {
  if (params.mode !== "partial") {
    return false;
  }
  return params.nativeStreaming;
}

export function shouldEnableSlackPreviewStreaming(params: {
  mode: "off" | "partial" | "block" | "progress";
  isDirectMessage: boolean;
  threadTs?: string;
}): boolean {
  // Always enable preview streaming when the configured mode is anything
  // other than "off", regardless of channel type. The earlier carve-out
  // for "DM without thread" prevented Telegram-parity bullet consolidation
  // from kicking in for the most common Slack scenario (a regular DM with
  // the bot, where replies don't establish a thread by default), letting
  // every mid-turn tool/block payload fan out as a separate
  // chat.postMessage. Posting a single "Working…" message to the DM main
  // channel and editing it via chat.update is the correct UX for that
  // case too — matching Telegram's lane behaviour.
  return params.mode !== "off";
}

export function shouldInitializeSlackDraftStream(params: {
  previewStreamingEnabled: boolean;
  useStreaming: boolean;
}): boolean {
  return params.previewStreamingEnabled && !params.useStreaming;
}

export function resolveSlackStreamingThreadHint(params: {
  replyToMode: "off" | "first" | "all" | "batched";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
  isThreadReply?: boolean;
}): string | undefined {
  return resolveSlackThreadTs({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: false,
    isThreadReply: params.isThreadReply,
  });
}

type SlackTurnDeliveryAttempt = {
  kind: ReplyDispatchKind;
  payload: ReplyPayload;
  threadTs?: string;
  textOverride?: string;
};

function buildSlackTurnDeliveryKey(params: SlackTurnDeliveryAttempt): string | null {
  const reply = resolveSendableOutboundReplyParts(params.payload, {
    text: params.textOverride,
  });
  const slackBlocks = readSlackReplyBlocks(params.payload);
  if (!reply.hasContent && !slackBlocks?.length) {
    return null;
  }
  return JSON.stringify({
    kind: params.kind,
    threadTs: params.threadTs ?? "",
    replyToId: params.payload.replyToId ?? null,
    text: reply.trimmedText,
    mediaUrls: reply.mediaUrls,
    blocks: slackBlocks ?? null,
  });
}

export function createSlackTurnDeliveryTracker() {
  const deliveredKeys = new Set<string>();
  return {
    hasDelivered(params: SlackTurnDeliveryAttempt) {
      const key = buildSlackTurnDeliveryKey(params);
      return key ? deliveredKeys.has(key) : false;
    },
    markDelivered(params: SlackTurnDeliveryAttempt) {
      const key = buildSlackTurnDeliveryKey(params);
      if (key) {
        deliveredKeys.add(key);
      }
    },
  };
}

function shouldUseStreaming(params: {
  streamingEnabled: boolean;
  threadTs: string | undefined;
}): boolean {
  if (!params.streamingEnabled) {
    return false;
  }
  if (!params.threadTs) {
    logVerbose("slack-stream: streaming disabled — no reply thread target available");
    return false;
  }
  return true;
}

export async function resolveSlackStreamRecipientTeamId(params: {
  client: Pick<PreparedSlackMessage["ctx"]["app"]["client"], "users">;
  token: string;
  userId?: PreparedSlackMessage["message"]["user"];
  fallbackTeamId?: string;
}): Promise<string | undefined> {
  if (params.userId) {
    try {
      const info = await params.client.users.info({
        token: params.token,
        user: params.userId,
      });
      const teamId = info.user?.team_id ?? info.user?.profile?.team;
      if (teamId) {
        return teamId;
      }
    } catch (err) {
      logVerbose(`slack-stream: users.info team lookup failed (${formatErrorMessage(err)})`);
    }
  }
  return params.fallbackTeamId;
}

export async function dispatchPreparedSlackMessage(prepared: PreparedSlackMessage) {
  const { ctx, account, message, route } = prepared;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;

  // Resolve agent identity for Slack chat:write.customize overrides.
  const outboundIdentity = resolveAgentOutboundIdentity(cfg, route.agentId);
  const slackIdentity = outboundIdentity
    ? {
        username: outboundIdentity.name,
        iconUrl: outboundIdentity.avatarUrl,
        iconEmoji: outboundIdentity.emoji,
      }
    : undefined;

  if (prepared.isDirectMessage) {
    const sessionCfg = cfg.session;
    const storePath = resolveStorePath(sessionCfg?.store, {
      agentId: route.agentId,
    });
    const pinnedMainDmOwner = resolvePinnedMainDmOwnerFromAllowlist({
      dmScope: cfg.session?.dmScope,
      allowFrom: ctx.allowFrom,
      normalizeEntry: normalizeSlackAllowOwnerEntry,
    });
    const senderRecipient = normalizeOptionalLowercaseString(message.user);
    const skipMainUpdate =
      pinnedMainDmOwner &&
      senderRecipient &&
      normalizeOptionalLowercaseString(pinnedMainDmOwner) !== senderRecipient;
    if (skipMainUpdate) {
      logVerbose(
        `slack: skip main-session last route for ${senderRecipient} (pinned owner ${pinnedMainDmOwner})`,
      );
    } else {
      await updateLastRoute({
        storePath,
        sessionKey: route.mainSessionKey,
        deliveryContext: {
          channel: "slack",
          to: `user:${message.user}`,
          accountId: route.accountId,
          threadId: prepared.ctxPayload.MessageThreadId,
        },
        ctx: prepared.ctxPayload,
      });
    }
  }

  const { statusThreadTs, isThreadReply } = resolveSlackThreadTargets({
    message,
    replyToMode: prepared.replyToMode,
  });

  const reactionMessageTs = prepared.ackReactionMessageTs;
  const messageTs = message.ts ?? message.event_ts;
  const incomingThreadTs = message.thread_ts;
  let didSetStatus = false;
  const statusReactionsEnabled =
    Boolean(prepared.ackReactionPromise) &&
    Boolean(reactionMessageTs) &&
    cfg.messages?.statusReactions?.enabled !== false;
  const slackStatusAdapter: StatusReactionAdapter = {
    setReaction: async (emoji) => {
      await reactSlackMessage(message.channel, reactionMessageTs ?? "", toSlackEmojiName(emoji), {
        token: ctx.botToken,
        client: ctx.app.client,
      }).catch((err) => {
        if (formatErrorMessage(err).includes("already_reacted")) {
          return;
        }
        throw err;
      });
    },
    removeReaction: async (emoji) => {
      await removeSlackReaction(message.channel, reactionMessageTs ?? "", toSlackEmojiName(emoji), {
        token: ctx.botToken,
        client: ctx.app.client,
      }).catch((err) => {
        if (formatErrorMessage(err).includes("no_reaction")) {
          return;
        }
        throw err;
      });
    },
  };
  const statusReactionTiming = {
    ...DEFAULT_TIMING,
    ...cfg.messages?.statusReactions?.timing,
  };
  const statusReactions = createStatusReactionController({
    enabled: statusReactionsEnabled,
    adapter: slackStatusAdapter,
    initialEmoji: prepared.ackReactionValue || "eyes",
    emojis: cfg.messages?.statusReactions?.emojis,
    timing: cfg.messages?.statusReactions?.timing,
    onError: (err) => {
      logAckFailure({
        log: logVerbose,
        channel: "slack",
        target: `${message.channel}/${message.ts}`,
        error: err,
      });
    },
  });

  if (statusReactionsEnabled) {
    void statusReactions.setQueued();
  }

  // Shared mutable ref for "replyToMode=first". Both tool + auto-reply flows
  // mark this to ensure only the first reply is threaded.
  const hasRepliedRef = { value: false };
  const replyPlan = createSlackReplyDeliveryPlan({
    replyToMode: prepared.replyToMode,
    incomingThreadTs,
    messageTs,
    hasRepliedRef,
    isThreadReply,
  });

  const typingTarget = statusThreadTs ? `${message.channel}/${statusThreadTs}` : message.channel;
  const typingReaction = ctx.typingReaction;
  const { onModelSelected, ...replyPipeline } = createChannelReplyPipeline({
    cfg,
    agentId: route.agentId,
    channel: "slack",
    accountId: route.accountId,
    transformReplyPayload: (payload) =>
      isSlackInteractiveRepliesEnabled({ cfg, accountId: route.accountId })
        ? compileSlackInteractiveReplies(payload)
        : payload,
    typing: {
      start: async () => {
        didSetStatus = true;
        await ctx.setSlackThreadStatus({
          channelId: message.channel,
          threadTs: statusThreadTs,
          status: "is typing...",
        });
        if (typingReaction && message.ts) {
          await reactSlackMessage(message.channel, message.ts, typingReaction, {
            token: ctx.botToken,
            client: ctx.app.client,
          }).catch(() => {});
        }
      },
      stop: async () => {
        if (!didSetStatus) {
          return;
        }
        didSetStatus = false;
        await ctx.setSlackThreadStatus({
          channelId: message.channel,
          threadTs: statusThreadTs,
          status: "",
        });
        if (typingReaction && message.ts) {
          await removeSlackReaction(message.channel, message.ts, typingReaction, {
            token: ctx.botToken,
            client: ctx.app.client,
          }).catch(() => {});
        }
      },
      onStartError: (err) => {
        logTypingFailure({
          log: (message) => runtime.error?.(danger(message)),
          channel: "slack",
          action: "start",
          target: typingTarget,
          error: err,
        });
      },
      onStopError: (err) => {
        logTypingFailure({
          log: (message) => runtime.error?.(danger(message)),
          channel: "slack",
          action: "stop",
          target: typingTarget,
          error: err,
        });
      },
    },
  });

  const slackStreaming = resolveSlackStreamingConfig({
    streaming: account.config.streaming,
    nativeStreaming: resolveChannelStreamingNativeTransport(account.config),
  });
  const streamThreadHint = resolveSlackStreamingThreadHint({
    replyToMode: prepared.replyToMode,
    incomingThreadTs,
    messageTs,
    isThreadReply,
  });
  const previewStreamingEnabled = shouldEnableSlackPreviewStreaming({
    mode: slackStreaming.mode,
    isDirectMessage: prepared.isDirectMessage,
    threadTs: streamThreadHint,
  });
  const streamingEnabled = isSlackStreamingEnabled({
    mode: slackStreaming.mode,
    nativeStreaming: slackStreaming.nativeStreaming,
  });
  const useStreaming = shouldUseStreaming({
    streamingEnabled,
    threadTs: streamThreadHint,
  });
  const shouldUseDraftStream = shouldInitializeSlackDraftStream({
    previewStreamingEnabled,
    useStreaming,
  });
  let streamSession: SlackStreamSession | null = null;
  let streamFailed = false;
  let usedReplyThreadTs: string | undefined;
  let observedReplyDelivery = false;
  const deliveryTracker = createSlackTurnDeliveryTracker();

  const deliverNormally = async (params: {
    payload: ReplyPayload;
    kind: ReplyDispatchKind;
    forcedThreadTs?: string;
  }): Promise<void> => {
    const replyThreadTs = params.forcedThreadTs ?? replyPlan.nextThreadTs();
    if (
      deliveryTracker.hasDelivered({
        kind: params.kind,
        payload: params.payload,
        threadTs: replyThreadTs,
      })
    ) {
      logVerbose("slack: suppressed duplicate normal delivery within the same turn");
      return;
    }
    await deliverReplies({
      replies: [params.payload],
      target: prepared.replyTarget,
      token: ctx.botToken,
      accountId: account.accountId,
      runtime,
      textLimit: ctx.textLimit,
      replyThreadTs,
      replyToMode: prepared.replyToMode,
      ...(slackIdentity ? { identity: slackIdentity } : {}),
    });
    observedReplyDelivery = true;
    // Record the thread ts only after confirmed delivery success.
    if (replyThreadTs) {
      usedReplyThreadTs ??= replyThreadTs;
    }
    replyPlan.markSent();
    deliveryTracker.markDelivered({
      kind: params.kind,
      payload: params.payload,
      threadTs: replyThreadTs,
    });
  };

  const deliverWithStreaming = async (params: {
    payload: ReplyPayload;
    kind: ReplyDispatchKind;
  }): Promise<void> => {
    const reply = resolveSendableOutboundReplyParts(params.payload);
    if (
      streamFailed ||
      reply.hasMedia ||
      readSlackReplyBlocks(params.payload)?.length ||
      !reply.hasText
    ) {
      await deliverNormally({
        payload: params.payload,
        kind: params.kind,
        forcedThreadTs: streamSession?.threadTs,
      });
      return;
    }

    const text = reply.trimmedText;
    let plannedThreadTs: string | undefined;
    try {
      if (!streamSession) {
        const streamThreadTs = replyPlan.nextThreadTs();
        plannedThreadTs = streamThreadTs;
        if (!streamThreadTs) {
          logVerbose(
            "slack-stream: no reply thread target for stream start, falling back to normal delivery",
          );
          streamFailed = true;
          await deliverNormally({ payload: params.payload, kind: params.kind });
          return;
        }
        if (
          deliveryTracker.hasDelivered({
            kind: params.kind,
            payload: params.payload,
            threadTs: streamThreadTs,
            textOverride: text,
          })
        ) {
          logVerbose("slack-stream: suppressed duplicate stream start payload");
          return;
        }

        streamSession = await startSlackStream({
          client: ctx.app.client,
          channel: message.channel,
          threadTs: streamThreadTs,
          text,
          teamId: await resolveSlackStreamRecipientTeamId({
            client: ctx.app.client,
            token: ctx.botToken,
            userId: message.user,
            fallbackTeamId: ctx.teamId,
          }),
          userId: message.user,
        });
        observedReplyDelivery = true;
        usedReplyThreadTs ??= streamThreadTs;
        replyPlan.markSent();
        deliveryTracker.markDelivered({
          kind: params.kind,
          payload: params.payload,
          threadTs: streamThreadTs,
          textOverride: text,
        });
        return;
      }
      if (
        deliveryTracker.hasDelivered({
          kind: params.kind,
          payload: params.payload,
          threadTs: streamSession.threadTs,
          textOverride: text,
        })
      ) {
        logVerbose("slack-stream: suppressed duplicate append payload");
        return;
      }

      await appendSlackStream({
        session: streamSession,
        text: "\n" + text,
      });
      deliveryTracker.markDelivered({
        kind: params.kind,
        payload: params.payload,
        threadTs: streamSession.threadTs,
        textOverride: text,
      });
    } catch (err) {
      runtime.error?.(
        danger(`slack-stream: streaming API call failed: ${formatErrorMessage(err)}, falling back`),
      );
      streamFailed = true;
      await deliverNormally({
        payload: params.payload,
        kind: params.kind,
        forcedThreadTs: streamSession?.threadTs ?? plannedThreadTs,
      });
    }
  };

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    ...replyPipeline,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload, info) => {
      if (useStreaming) {
        await deliverWithStreaming({ payload, kind: info.kind });
        return;
      }

      const reply = resolveSendableOutboundReplyParts(payload);
      const slackBlocks = readSlackReplyBlocks(payload);
      const draftMessageId = draftStream?.messageId();
      const draftChannelId = draftStream?.channelId();
      const trimmedFinalText = reply.trimmedText;

      // Telegram-parity bullet consolidation:
      // Mid-turn text-only payloads (kind === "tool" | "block") get folded
      // into the existing draftStream "Working…" preview as bullet lines
      // via chat.update — same single Slack message, no fan-out. Only the
      // final reply finalizes the draft (replaces the preview with the
      // answer text).
      //
      // Skips:
      //   - media payloads (need upload)
      //   - errors (need their own message)
      //   - Slack Block-Kit-laden payloads (need rich rendering)
      //   - empty text
      // Those continue to use the canFinalizeViaPreviewEdit /
      // deliverNormally path below.
      //
      // Explicit kind allow-list ("tool" | "block") instead of `!== "final"`
      // so future ReplyDispatchKind additions don't accidentally route
      // through here without a deliberate review.
      // Note: previewToolProgressEnabled is intentionally NOT in this
      // condition. That config flag was originally meant to gate the
      // `Working… • tool: x` preview emitted by core's onToolStart-style
      // callbacks. Tying mid-turn fan-out prevention to it meant any
      // workspace that disabled the toolProgress preview kept getting one
      // chat.postMessage per tool/block payload — defeating the purpose
      // of the consolidation branch. As long as a draftStream exists, we
      // always want mid-turn payloads to fold into it.
      const canConsolidateAsBullet =
        Boolean(draftStream) &&
        (info.kind === "tool" || info.kind === "block") &&
        !reply.hasMedia &&
        !payload.isError &&
        !slackBlocks?.length &&
        trimmedFinalText.length > 0;
      if (canConsolidateAsBullet) {
        // While partial token streaming is rendering agent text into the
        // draft preview, do not overwrite it with a tool/block bullet.
        // The agent's own narrative prose carries the signal — same as
        // Telegram lanes.
        if (previewToolProgressSuppressed) {
          logVerbose(
            `slack: skipping ${info.kind} bullet consolidation (partial streaming active)`,
          );
          return;
        }
        const finalThreadTs = usedReplyThreadTs ?? statusThreadTs;
        if (deliveryTracker.hasDelivered({ kind: info.kind, payload, threadTs: finalThreadTs })) {
          observedReplyDelivery = true;
          return;
        }
        // Transition narrative → bullets: rotate (forceNewMessage) so the
        // current narrative draft is preserved as a permanent Slack
        // message, and a fresh draft begins to host the ephemeral bullet
        // preview.
        if (currentDraftKind === "narrative" && draftStream) {
          draftStream.forceNewMessage();
          previewToolProgressLines = [];
          appendRenderedText = "";
          appendSourceText = "";
          statusUpdateCount = 0;
        }
        // Inline the bullet append + draftStream.update so this works
        // regardless of the previewToolProgressEnabled flag. Format:
        // "Working…\n• …\n• …" capped to last 8 lines, dedup-suppressed
        // when the latest line matches the previous one.
        const normalized = trimmedFinalText.replace(/\s+/g, " ").trim();
        if (normalized) {
          const previous = previewToolProgressLines.at(-1);
          if (previous !== normalized) {
            previewToolProgressLines = [...previewToolProgressLines, normalized].slice(-8);
            const renderedText = [
              "Working…",
              ...previewToolProgressLines.map((entry) => `• ${entry}`),
            ].join("\n");
            logVerbose(
              `slack: consolidating ${info.kind} payload (${trimmedFinalText.length} chars) into draft preview bullet`,
            );
            draftStream?.update(renderedText);
            hasStreamedMessage = true;
            currentDraftKind = "bullets";
          }
        }
        observedReplyDelivery = true;
        deliveryTracker.markDelivered({ kind: info.kind, payload, threadTs: finalThreadTs });
        return;
      }

      // Final transition: if the current draft is a bullet-only Working…
      // preview, delete it before posting the answer as a fresh permanent
      // message. We do NOT want to chat.update the bullets into the answer
      // because that visually "becomes" a new message anyway and obscures
      // the boundary between scaffolding and final content.
      if (
        info.kind === "final" &&
        currentDraftKind === "bullets" &&
        draftStream &&
        !reply.hasMedia &&
        !payload.isError &&
        trimmedFinalText.length > 0
      ) {
        await draftStream.clear();
        currentDraftKind = null;
        previewToolProgressLines = [];
        appendRenderedText = "";
        appendSourceText = "";
        // Fall through to deliverNormally below — the draftMessageId /
        // draftChannelId computed above are stale now that we cleared.
        await deliverNormally({ payload, kind: info.kind });
        return;
      }

      const canFinalizeViaPreviewEdit =
        previewStreamingEnabled &&
        streamMode !== "status_final" &&
        !reply.hasMedia &&
        !payload.isError &&
        (trimmedFinalText.length > 0 || Boolean(slackBlocks?.length)) &&
        typeof draftMessageId === "string" &&
        typeof draftChannelId === "string";

      if (canFinalizeViaPreviewEdit) {
        const finalThreadTs = usedReplyThreadTs ?? statusThreadTs;
        if (deliveryTracker.hasDelivered({ kind: info.kind, payload, threadTs: finalThreadTs })) {
          observedReplyDelivery = true;
          return;
        }
        draftStream?.stop();
        try {
          await finalizeSlackPreviewEdit({
            client: ctx.app.client,
            token: ctx.botToken,
            accountId: account.accountId,
            channelId: draftChannelId,
            messageId: draftMessageId,
            text: normalizeSlackOutboundText(trimmedFinalText),
            ...(slackBlocks?.length ? { blocks: slackBlocks } : {}),
            threadTs: finalThreadTs,
          });
          observedReplyDelivery = true;
          deliveryTracker.markDelivered({ kind: info.kind, payload, threadTs: finalThreadTs });
          return;
        } catch (err) {
          logVerbose(
            `slack: preview final edit failed; falling back to standard send (${formatErrorMessage(err)})`,
          );
        }
      } else if (previewStreamingEnabled && streamMode === "status_final" && hasStreamedMessage) {
        try {
          const statusChannelId = draftStream?.channelId();
          const statusMessageId = draftStream?.messageId();
          if (statusChannelId && statusMessageId) {
            await ctx.app.client.chat.update({
              token: ctx.botToken,
              channel: statusChannelId,
              ts: statusMessageId,
              text: "Status: complete. Final answer posted below.",
            });
          }
        } catch (err) {
          logVerbose(`slack: status_final completion update failed (${formatErrorMessage(err)})`);
        }
      } else if (reply.hasMedia) {
        await draftStream?.clear();
        hasStreamedMessage = false;
      }

      await deliverNormally({ payload, kind: info.kind });
    },
    onError: (err, info) => {
      runtime.error?.(danger(`slack ${info.kind} reply failed: ${formatErrorMessage(err)}`));
      replyPipeline.typingCallbacks?.onIdle?.();
    },
  });

  const draftStream = shouldUseDraftStream
    ? createSlackDraftStream({
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        maxChars: Math.min(ctx.textLimit, SLACK_TEXT_LIMIT),
        resolveThreadTs: () => {
          const ts = replyPlan.nextThreadTs();
          if (ts) {
            usedReplyThreadTs ??= ts;
          }
          return ts;
        },
        onMessageSent: () => replyPlan.markSent(),
        log: logVerbose,
        warn: logVerbose,
      })
    : undefined;
  let hasStreamedMessage = false;
  const streamMode = slackStreaming.draftMode;
  const previewToolProgressEnabled =
    Boolean(draftStream) && resolveChannelStreamingPreviewToolProgress(account.config);
  let previewToolProgressSuppressed = false;
  let previewToolProgressLines: string[] = [];
  let appendRenderedText = "";
  let appendSourceText = "";
  let statusUpdateCount = 0;

  // Telegram-parity tool ephemerality: track what the CURRENT draftStream
  // message holds so we can rotate or delete it at the right transitions.
  //
  //   - "narrative"   — partial-text or block-text content from the agent.
  //                     Keep this message permanent: rotate (forceNewMessage)
  //                     to start a fresh draft for the next phase.
  //   - "bullets"     — `Working…\n• …` tool-progress preview only.
  //                     Delete this message (chat.delete) at every
  //                     transition: turning into narrative, finalizing the
  //                     turn, rotating on assistant boundary, or cleanup.
  //   - null          — no content has been written to the current draft yet.
  //
  // Behaviour:
  //   narrative  → bullets   : rotate (preserve narrative as a permanent message)
  //   bullets    → narrative : clear   (delete the bullet-only ephemeral message)
  //   bullets    → final     : clear + deliverNormally (final answer is its own message)
  //   narrative  → final     : canFinalizeViaPreviewEdit (replace narrative with answer)
  //   bullets    → cleanup   : clear   (don't leave a dangling Working… message)
  let currentDraftKind: "narrative" | "bullets" | null = null;

  const pushPreviewToolProgress = (line?: string) => {
    if (!draftStream || !previewToolProgressEnabled || previewToolProgressSuppressed) {
      return;
    }
    const normalized = line?.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    const previous = previewToolProgressLines.at(-1);
    if (previous === normalized) {
      return;
    }
    previewToolProgressLines = [...previewToolProgressLines, normalized].slice(-8);
    draftStream.update(
      ["Working…", ...previewToolProgressLines.map((entry) => `• ${entry}`)].join("\n"),
    );
    hasStreamedMessage = true;
  };

  const updateDraftFromPartial = (text?: string) => {
    const trimmed = text?.trimEnd();
    if (!trimmed) {
      return;
    }

    // Transition bullets → narrative: delete the ephemeral bullet-only
    // draft so it doesn't pollute the channel with a stale Working… preview.
    // The next chat.postMessage from the same draftStream creates a fresh
    // permanent message that hosts the agent's narrative text.
    if (currentDraftKind === "bullets" && draftStream) {
      void draftStream.clear();
      previewToolProgressLines = [];
      appendRenderedText = "";
      appendSourceText = "";
      statusUpdateCount = 0;
    }

    previewToolProgressSuppressed = true;
    previewToolProgressLines = [];

    if (streamMode === "append") {
      const next = applyAppendOnlyStreamUpdate({
        incoming: trimmed,
        rendered: appendRenderedText,
        source: appendSourceText,
      });
      appendRenderedText = next.rendered;
      appendSourceText = next.source;
      if (!next.changed) {
        return;
      }
      draftStream?.update(next.rendered);
      hasStreamedMessage = true;
      currentDraftKind = "narrative";
      return;
    }

    if (streamMode === "status_final") {
      statusUpdateCount += 1;
      if (statusUpdateCount > 1 && statusUpdateCount % 4 !== 0) {
        return;
      }
      draftStream?.update(buildStatusFinalPreviewText(statusUpdateCount));
      hasStreamedMessage = true;
      currentDraftKind = "narrative";
      return;
    }

    draftStream?.update(trimmed);
    hasStreamedMessage = true;
    currentDraftKind = "narrative";
  };
  const onDraftBoundary = !shouldUseDraftStream
    ? undefined
    : async () => {
        // Boundary handling preserves agent text segments and discards
        // ephemeral tool-only previews:
        //
        //   currentDraftKind === "narrative" : the draft holds an agent
        //     text segment (partial streaming or block reply text). Rotate
        //     so that segment becomes a permanent Slack message and the
        //     next segment starts in a fresh draft.
        //
        //   currentDraftKind === "bullets"   : the draft is a Working…
        //     preview only. Delete it (chat.delete) — it was scaffolding
        //     for a tool burst that has now ended; there is nothing
        //     persistent to preserve.
        //
        //   currentDraftKind === null        : nothing to do.
        if (currentDraftKind === "narrative") {
          draftStream?.forceNewMessage();
        } else if (currentDraftKind === "bullets") {
          await draftStream?.clear();
        }
        currentDraftKind = null;
        appendRenderedText = "";
        appendSourceText = "";
        statusUpdateCount = 0;
        previewToolProgressSuppressed = false;
        previewToolProgressLines = [];
      };

  let dispatchError: unknown;
  let queuedFinal = false;
  let counts: { final?: number; block?: number } = {};
  try {
    const result = await dispatchInboundMessage({
      ctx: prepared.ctxPayload,
      cfg,
      dispatcher,
      replyOptions: {
        ...replyOptions,
        skillFilter: prepared.channelConfig?.skills,
        hasRepliedRef,
        disableBlockStreaming: useStreaming
          ? true
          : typeof resolveChannelStreamingBlockEnabled(account.config) === "boolean"
            ? !resolveChannelStreamingBlockEnabled(account.config)
            : undefined,
        onModelSelected,
        suppressDefaultToolProgressMessages: previewToolProgressEnabled ? true : undefined,
        onPartialReply: useStreaming
          ? undefined
          : !previewStreamingEnabled
            ? undefined
            : async (payload) => {
                updateDraftFromPartial(payload.text);
              },
        onAssistantMessageStart: onDraftBoundary,
        onReasoningEnd: onDraftBoundary,
        onReasoningStream: statusReactionsEnabled
          ? async () => {
              await statusReactions.setThinking();
            }
          : undefined,
        onToolStart: async (payload) => {
          if (statusReactionsEnabled) {
            await statusReactions.setTool(payload.name);
          }
          pushPreviewToolProgress(payload.name ? `tool: ${payload.name}` : "tool running");
        },
        onItemEvent: async (payload) => {
          pushPreviewToolProgress(
            payload.progressText ?? payload.summary ?? payload.title ?? payload.name,
          );
        },
        onPlanUpdate: async (payload) => {
          if (payload.phase !== "update") {
            return;
          }
          pushPreviewToolProgress(payload.explanation ?? payload.steps?.[0] ?? "planning");
        },
        onApprovalEvent: async (payload) => {
          if (payload.phase !== "requested") {
            return;
          }
          pushPreviewToolProgress(
            payload.command ? `approval: ${payload.command}` : "approval requested",
          );
        },
        onCommandOutput: async (payload) => {
          if (payload.phase !== "end") {
            return;
          }
          pushPreviewToolProgress(
            payload.name
              ? `${payload.name}${payload.exitCode === 0 ? " ✓" : payload.exitCode != null ? ` (exit ${payload.exitCode})` : ""}`
              : payload.title,
          );
        },
        onPatchSummary: async (payload) => {
          if (payload.phase !== "end") {
            return;
          }
          pushPreviewToolProgress(payload.summary ?? payload.title ?? "patch applied");
        },
      },
    });
    queuedFinal = result.queuedFinal;
    counts = result.counts;
  } catch (err) {
    dispatchError = err;
  } finally {
    // If the dispatch ended with a bullet-only Working… preview still
    // open (e.g. error path, or final answer arrived but had media that
    // forced deliverNormally elsewhere), delete it so the channel doesn't
    // keep a dangling scaffolding message.
    if (currentDraftKind === "bullets" && draftStream) {
      await draftStream.clear();
      currentDraftKind = null;
    }
    await draftStream?.flush();
    draftStream?.stop();
    markDispatchIdle();
  }

  // -----------------------------------------------------------------------
  // Finalize the stream if one was started
  // -----------------------------------------------------------------------
  const finalStream = streamSession as SlackStreamSession | null;
  if (finalStream && !finalStream.stopped) {
    try {
      await stopSlackStream({ session: finalStream });
    } catch (err) {
      runtime.error?.(danger(`slack-stream: failed to stop stream: ${formatErrorMessage(err)}`));
    }
  }

  const anyReplyDelivered =
    observedReplyDelivery || queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;

  if (statusReactionsEnabled) {
    if (dispatchError) {
      await statusReactions.setError();
      if (ctx.removeAckAfterReply) {
        void (async () => {
          await sleep(statusReactionTiming.errorHoldMs);
          if (anyReplyDelivered) {
            await statusReactions.clear();
            return;
          }
          await statusReactions.restoreInitial();
        })();
      } else {
        void statusReactions.restoreInitial();
      }
    } else if (anyReplyDelivered) {
      await statusReactions.setDone();
      if (ctx.removeAckAfterReply) {
        void (async () => {
          await sleep(statusReactionTiming.doneHoldMs);
          await statusReactions.clear();
        })();
      } else {
        void statusReactions.restoreInitial();
      }
    } else {
      // Silent success should preserve queued state and clear any stall timers
      // instead of transitioning to terminal/stall reactions after return.
      await statusReactions.restoreInitial();
    }
  }

  if (dispatchError) {
    throw dispatchError;
  }

  // Record thread participation only when we actually delivered a reply and
  // know the thread ts that was used (set by deliverNormally, streaming start,
  // or draft stream). Falls back to statusThreadTs for edge cases.
  const participationThreadTs = usedReplyThreadTs ?? statusThreadTs;
  if (anyReplyDelivered && participationThreadTs) {
    recordSlackThreadParticipation(account.accountId, message.channel, participationThreadTs);
  }

  if (!anyReplyDelivered) {
    await draftStream?.clear();
    if (prepared.isRoomish) {
      clearHistoryEntriesIfEnabled({
        historyMap: ctx.channelHistories,
        historyKey: prepared.historyKey,
        limit: ctx.historyLimit,
      });
    }
    return;
  }

  if (shouldLogVerbose()) {
    const finalCount = counts.final;
    logVerbose(
      `slack: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${prepared.replyTarget}`,
    );
  }

  if (!statusReactionsEnabled) {
    removeAckReactionAfterReply({
      removeAfterReply: ctx.removeAckAfterReply && anyReplyDelivered,
      ackReactionPromise: prepared.ackReactionPromise,
      ackReactionValue: prepared.ackReactionValue,
      remove: () =>
        removeSlackReaction(
          message.channel,
          prepared.ackReactionMessageTs ?? "",
          prepared.ackReactionValue,
          {
            token: ctx.botToken,
            client: ctx.app.client,
          },
        ),
      onError: (err) => {
        logAckFailure({
          log: logVerbose,
          channel: "slack",
          target: `${message.channel}/${message.ts}`,
          error: err,
        });
      },
    });
  }

  if (prepared.isRoomish) {
    clearHistoryEntriesIfEnabled({
      historyMap: ctx.channelHistories,
      historyKey: prepared.historyKey,
      limit: ctx.historyLimit,
    });
  }
}
