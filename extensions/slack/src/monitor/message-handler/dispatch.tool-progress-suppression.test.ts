/**
 * Verifies the `suppressDefaultToolProgressMessages` reply-option mirrors
 * Telegram's logic so Slack does not fan out one chat.postMessage per tool
 * call/result. The desired logic is:
 *
 *   suppressDefaultToolProgressMessages = !previewStreamingEnabled || Boolean(draftStream)
 *
 * Which gives us:
 *   - streaming.mode = "off"  -> suppress (no per-tool fan-out)
 *   - draft stream active     -> suppress (draftStream consolidates progress)
 *   - native chat.startStream -> do NOT suppress (tool result text is appended
 *                                to the active stream session)
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const FINAL_REPLY_TEXT = "final answer";
const THREAD_TS = "thread-1";

const createSlackDraftStreamMock = vi.fn();
const deliverRepliesMock = vi.fn(async () => {});
const finalizeSlackPreviewEditMock = vi.fn(async () => {});

let mockedStreamingMode: "off" | "partial" | "block" | "progress" = "partial";
let mockedNativeStreaming = false;

let capturedReplyOptions: { suppressDefaultToolProgressMessages?: unknown } | undefined;

const noop = () => {};
const noopAsync = async () => {};

function createDraftStreamStub() {
  return {
    update: noop,
    flush: noopAsync,
    clear: noopAsync,
    discardPending: noopAsync,
    seal: noopAsync,
    stop: noop,
    forceNewMessage: noop,
    messageId: () => "171234.567",
    channelId: () => "C123",
  };
}

function createPreparedSlackMessage() {
  return {
    ctx: {
      cfg: {},
      runtime: {},
      botToken: "xoxb-test",
      app: { client: {} },
      teamId: "T1",
      textLimit: 4000,
      typingReaction: "",
      removeAckAfterReply: false,
      historyLimit: 0,
      channelHistories: new Map(),
      allowFrom: [],
      setSlackThreadStatus: async () => undefined,
    },
    account: {
      accountId: "default",
      config: {},
    },
    message: {
      channel: "C123",
      ts: "171234.111",
      thread_ts: THREAD_TS,
      user: "U123",
    },
    route: {
      agentId: "agent-1",
      accountId: "default",
      mainSessionKey: "main",
    },
    channelConfig: null,
    replyTarget: "channel:C123",
    ctxPayload: {
      MessageThreadId: THREAD_TS,
    },
    replyToMode: "all",
    isDirectMessage: false,
    isRoomish: false,
    historyKey: "history-key",
    preview: "",
    ackReactionValue: "eyes",
    ackReactionPromise: null,
  } as never;
}

vi.mock("openclaw/plugin-sdk/agent-runtime", () => ({
  resolveHumanDelayConfig: () => undefined,
}));

vi.mock("openclaw/plugin-sdk/channel-feedback", () => ({
  DEFAULT_TIMING: {
    doneHoldMs: 0,
    errorHoldMs: 0,
  },
  createStatusReactionController: () => ({
    setQueued: async () => {},
    setThinking: async () => {},
    setTool: async () => {},
    setError: async () => {},
    setDone: async () => {},
    clear: async () => {},
    restoreInitial: async () => {},
  }),
  logAckFailure: () => {},
  logTypingFailure: () => {},
  removeAckReactionAfterReply: () => {},
}));

vi.mock("openclaw/plugin-sdk/channel-reply-pipeline", () => ({
  createChannelReplyPipeline: () => ({
    typingCallbacks: {
      onIdle: vi.fn(),
    },
    onModelSelected: undefined,
  }),
}));

vi.mock("openclaw/plugin-sdk/channel-streaming", () => ({
  resolveChannelStreamingBlockEnabled: () => false,
  resolveChannelStreamingNativeTransport: () => mockedNativeStreaming,
  resolveChannelStreamingPreviewToolProgress: () => true,
}));

vi.mock("openclaw/plugin-sdk/outbound-runtime", () => ({
  resolveAgentOutboundIdentity: () => undefined,
}));

vi.mock("openclaw/plugin-sdk/reply-history", () => ({
  clearHistoryEntriesIfEnabled: () => {},
}));

vi.mock("openclaw/plugin-sdk/reply-payload", () => ({
  resolveSendableOutboundReplyParts: (
    payload: { text?: string; mediaUrl?: string; mediaUrls?: string[] },
    opts?: { text?: string },
  ) => {
    const text = (opts?.text ?? payload.text ?? "").trim();
    const mediaUrls = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    return {
      text,
      trimmedText: text,
      hasText: text.length > 0,
      hasMedia: mediaUrls.length > 0,
      mediaUrls,
      hasContent: text.length > 0 || mediaUrls.length > 0,
    };
  },
}));

vi.mock("openclaw/plugin-sdk/runtime-env", () => ({
  danger: (message: string) => message,
  logVerbose: () => {},
  shouldLogVerbose: () => false,
}));

vi.mock("openclaw/plugin-sdk/security-runtime", () => ({
  resolvePinnedMainDmOwnerFromAllowlist: () => undefined,
}));

vi.mock("openclaw/plugin-sdk/text-runtime", () => ({
  normalizeOptionalLowercaseString: (value?: string) => value?.toLowerCase(),
}));

vi.mock("../../actions.js", () => ({
  reactSlackMessage: async () => {},
  removeSlackReaction: async () => {},
}));

vi.mock("../../draft-stream.js", () => ({
  createSlackDraftStream: createSlackDraftStreamMock,
}));

vi.mock("../../format.js", () => ({
  normalizeSlackOutboundText: (value: string) => value.trim(),
}));

vi.mock("../../limits.js", () => ({
  SLACK_TEXT_LIMIT: 4000,
}));

vi.mock("../../sent-thread-cache.js", () => ({
  recordSlackThreadParticipation: () => {},
}));

vi.mock("../../stream-mode.js", () => ({
  applyAppendOnlyStreamUpdate: ({ incoming }: { incoming: string }) => ({
    changed: true,
    rendered: incoming,
    source: incoming,
  }),
  buildStatusFinalPreviewText: () => "status",
  resolveSlackStreamingConfig: () => ({
    mode: mockedStreamingMode,
    nativeStreaming: mockedNativeStreaming,
    draftMode: "append",
  }),
}));

vi.mock("../../streaming.js", () => ({
  appendSlackStream: async () => {},
  startSlackStream: async () => ({
    threadTs: THREAD_TS,
    stopped: false,
    delivered: true,
    pendingText: "",
  }),
  stopSlackStream: async () => {},
}));

vi.mock("../../threading.js", () => ({
  resolveSlackThreadTargets: () => ({
    statusThreadTs: THREAD_TS,
    isThreadReply: true,
  }),
}));

vi.mock("../allow-list.js", () => ({
  normalizeSlackAllowOwnerEntry: (value: string) => value,
}));

vi.mock("../config.runtime.js", () => ({
  resolveStorePath: () => "/tmp/openclaw-store.json",
  updateLastRoute: async () => {},
}));

vi.mock("../replies.js", () => ({
  createSlackReplyDeliveryPlan: () => ({
    nextThreadTs: () => THREAD_TS,
    markSent: () => {},
  }),
  deliverReplies: deliverRepliesMock,
  readSlackReplyBlocks: () => undefined,
  resolveSlackThreadTs: () => THREAD_TS,
}));

vi.mock("../reply.runtime.js", () => ({
  createReplyDispatcherWithTyping: (params: {
    deliver: (payload: unknown, info: { kind: "tool" | "block" | "final" }) => Promise<void>;
  }) => ({
    dispatcher: {
      deliver: params.deliver,
    },
    replyOptions: {},
    markDispatchIdle: () => {},
  }),
  dispatchInboundMessage: async (params: {
    replyOptions?: { suppressDefaultToolProgressMessages?: unknown };
    dispatcher: {
      deliver: (
        payload: { text: string },
        info: { kind: "tool" | "block" | "final" },
      ) => Promise<void>;
    };
  }) => {
    capturedReplyOptions = params.replyOptions;
    await params.dispatcher.deliver({ text: FINAL_REPLY_TEXT }, { kind: "final" });
    return {
      queuedFinal: false,
      counts: { final: 1 },
    };
  },
}));

vi.mock("./preview-finalize.js", () => ({
  finalizeSlackPreviewEdit: finalizeSlackPreviewEditMock,
}));

let dispatchPreparedSlackMessage: typeof import("./dispatch.js").dispatchPreparedSlackMessage;

describe("dispatchPreparedSlackMessage tool-progress suppression", () => {
  beforeAll(async () => {
    ({ dispatchPreparedSlackMessage } = await import("./dispatch.js"));
  });

  beforeEach(() => {
    createSlackDraftStreamMock.mockReset();
    deliverRepliesMock.mockReset();
    finalizeSlackPreviewEditMock.mockReset();
    finalizeSlackPreviewEditMock.mockResolvedValue(undefined);
    capturedReplyOptions = undefined;
    mockedStreamingMode = "partial";
    mockedNativeStreaming = false;
    createSlackDraftStreamMock.mockReturnValue(createDraftStreamStub());
  });

  it("suppresses default tool-progress messages when streaming.mode is 'off'", async () => {
    // No streaming and no draftStream => previewStreamingEnabled is false.
    // We should still suppress the per-tool chat.postMessage fan-out so
    // channels don't get bloated with one message per tool call/result.
    mockedStreamingMode = "off";
    mockedNativeStreaming = false;

    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    expect(createSlackDraftStreamMock).not.toHaveBeenCalled();
    expect(capturedReplyOptions?.suppressDefaultToolProgressMessages).toBe(true);
  });

  it("suppresses default tool-progress messages when a Slack draft stream is active", async () => {
    // Preview streaming is on and native is off => draftStream is created
    // and consolidates tool progress into a single edited message.
    mockedStreamingMode = "partial";
    mockedNativeStreaming = false;

    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    expect(createSlackDraftStreamMock).toHaveBeenCalledTimes(1);
    expect(capturedReplyOptions?.suppressDefaultToolProgressMessages).toBe(true);
  });

  it("does NOT suppress default tool-progress messages when native chat.startStream is active", async () => {
    // Preview streaming is on and native streaming is on => no draftStream
    // is created (the native stream session is the consolidation surface).
    // We must let tool result text flow through deliver -> appendSlackStream
    // so it lands in the same chat.startStream message instead of being
    // silenced.
    mockedStreamingMode = "partial";
    mockedNativeStreaming = true;

    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    expect(createSlackDraftStreamMock).not.toHaveBeenCalled();
    expect(capturedReplyOptions?.suppressDefaultToolProgressMessages).toBe(false);
  });
});
