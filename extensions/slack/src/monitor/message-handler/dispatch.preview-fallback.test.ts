import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const FINAL_REPLY_TEXT = "final answer";
const THREAD_TS = "thread-1";
const SAME_TEXT = "same reply";

const createSlackDraftStreamMock = vi.fn();
const deliverRepliesMock = vi.fn(async () => {});
const finalizeSlackPreviewEditMock = vi.fn(async () => {});
let mockedDispatchSequence: Array<{
  kind: "tool" | "block" | "final";
  payload: { text: string };
}> = [];

const noop = () => {};
const noopAsync = async () => {};

function createDraftStreamStub() {
  return {
    update: noop,
    flush: noopAsync,
    clear: noopAsync,
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
  resolveChannelStreamingNativeTransport: () => false,
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
    mode: "partial",
    nativeStreaming: false,
    draftMode: "append",
  }),
}));

vi.mock("../../streaming.js", () => ({
  appendSlackStream: async () => {},
  startSlackStream: async () => ({
    threadTs: THREAD_TS,
    stopped: false,
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
    dispatcher: {
      deliver: (
        payload: { text: string },
        info: { kind: "tool" | "block" | "final" },
      ) => Promise<void>;
    };
  }) => {
    for (const entry of mockedDispatchSequence) {
      await params.dispatcher.deliver(entry.payload, { kind: entry.kind });
    }
    return {
      queuedFinal: false,
      counts: {
        final: mockedDispatchSequence.filter((entry) => entry.kind === "final").length,
      },
    };
  },
}));

vi.mock("./preview-finalize.js", () => ({
  finalizeSlackPreviewEdit: finalizeSlackPreviewEditMock,
}));

let dispatchPreparedSlackMessage: typeof import("./dispatch.js").dispatchPreparedSlackMessage;

describe("dispatchPreparedSlackMessage preview fallback", () => {
  beforeAll(async () => {
    ({ dispatchPreparedSlackMessage } = await import("./dispatch.js"));
  });

  beforeEach(() => {
    createSlackDraftStreamMock.mockReset();
    deliverRepliesMock.mockReset();
    finalizeSlackPreviewEditMock.mockReset();
    mockedDispatchSequence = [{ kind: "final", payload: { text: FINAL_REPLY_TEXT } }];

    createSlackDraftStreamMock.mockReturnValue(createDraftStreamStub());
    finalizeSlackPreviewEditMock.mockRejectedValue(new Error("socket closed"));
  });

  it("falls back to normal delivery when preview finalize fails", async () => {
    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    expect(finalizeSlackPreviewEditMock).toHaveBeenCalledTimes(1);
    expect(deliverRepliesMock).toHaveBeenCalledTimes(1);
    expect(deliverRepliesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replyThreadTs: THREAD_TS,
        replies: [expect.objectContaining({ text: FINAL_REPLY_TEXT })],
      }),
    );
  });

  it("folds N mid-turn tool/block payloads into ONE bullet preview, then deletes it and posts the answer (ephemeral bullets)", async () => {
    // Each mid-turn tool/block payload routes through draftStream.update
    // → chat.update on the SAME Slack message ("Working…\n• …" preview).
    // When the final reply arrives, the bullet preview is deleted via
    // draftStream.clear() and the agent's answer text is posted as a
    // FRESH permanent message via deliverNormally — matching the
    // "ephemeral bullets" UX (tool scaffolding disappears, only text
    // content remains).
    const updateMock = vi.fn();
    const clearMock = vi.fn(noopAsync);
    const draftStream = {
      update: updateMock,
      flush: noopAsync,
      clear: clearMock,
      stop: noop,
      forceNewMessage: noop,
      messageId: () => "171234.567",
      channelId: () => "C123",
    };
    createSlackDraftStreamMock.mockReturnValueOnce(draftStream);

    mockedDispatchSequence = [
      { kind: "tool", payload: { text: "🛠️ Exec: # Look up Slack user IDs" } },
      { kind: "block", payload: { text: "vinay@blink.new -> U0A0MSG242W" } },
      { kind: "tool", payload: { text: "🛠️ Exec: BOT=xoxb-2 curl chat.postMessage" } },
      { kind: "block", payload: { text: "Vinay: ok" } },
      { kind: "final", payload: { text: "Done. DM'd Vinay and Saurabh." } },
    ];

    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    // 4 mid-turn payloads → 4 draftStream.update() calls (chat.update edits
    // on the same message). Each renders the cumulative bullet list.
    expect(updateMock).toHaveBeenCalledTimes(4);
    expect(updateMock).toHaveBeenNthCalledWith(1, "Working…\n• 🛠️ Exec: # Look up Slack user IDs");
    expect(updateMock).toHaveBeenNthCalledWith(
      2,
      "Working…\n• 🛠️ Exec: # Look up Slack user IDs\n• vinay@blink.new -> U0A0MSG242W",
    );
    expect(updateMock).toHaveBeenNthCalledWith(
      3,
      "Working…\n• 🛠️ Exec: # Look up Slack user IDs\n• vinay@blink.new -> U0A0MSG242W\n• 🛠️ Exec: BOT=xoxb-2 curl chat.postMessage",
    );
    expect(updateMock).toHaveBeenNthCalledWith(
      4,
      "Working…\n• 🛠️ Exec: # Look up Slack user IDs\n• vinay@blink.new -> U0A0MSG242W\n• 🛠️ Exec: BOT=xoxb-2 curl chat.postMessage\n• Vinay: ok",
    );

    // Final transition: bullet-only draft is deleted via draftStream.clear()
    // (chat.delete) and the answer is posted as its own permanent message.
    expect(clearMock).toHaveBeenCalled();
    expect(finalizeSlackPreviewEditMock).not.toHaveBeenCalled();
    expect(deliverRepliesMock).toHaveBeenCalledTimes(1);
    expect(deliverRepliesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replies: [expect.objectContaining({ text: "Done. DM'd Vinay and Saurabh." })],
      }),
    );
  });

  it("deletes bullet-only draft + posts final answer as a fresh message when there's no narrative", async () => {
    // When the turn was tool-bursts only (no agent narrative text),
    // the bullet preview is deleted at finalize and the answer is
    // posted via deliverNormally as a permanent message. finalize via
    // chat.update is intentionally NOT used here — we want a clean
    // boundary between scaffolding (deleted) and final content (new).
    mockedDispatchSequence = [
      { kind: "tool", payload: { text: SAME_TEXT } },
      { kind: "final", payload: { text: SAME_TEXT } },
    ];

    await dispatchPreparedSlackMessage(createPreparedSlackMessage());

    expect(finalizeSlackPreviewEditMock).not.toHaveBeenCalled();
    expect(deliverRepliesMock).toHaveBeenCalledTimes(1);
    expect(deliverRepliesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replyThreadTs: THREAD_TS,
        replies: [expect.objectContaining({ text: SAME_TEXT })],
      }),
    );
  });
});
