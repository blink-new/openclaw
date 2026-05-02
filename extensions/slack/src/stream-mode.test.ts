import { describe, expect, it } from "vitest";
import {
  applyAppendOnlyStreamUpdate,
  buildStatusFinalPreviewText,
  resolveSlackStreamingConfig,
  resolveSlackStreamMode,
} from "./stream-mode.js";

describe("resolveSlackStreamMode", () => {
  it("defaults to replace", () => {
    expect(resolveSlackStreamMode(undefined)).toBe("replace");
    expect(resolveSlackStreamMode("")).toBe("replace");
    expect(resolveSlackStreamMode("unknown")).toBe("replace");
  });

  it("accepts valid modes", () => {
    expect(resolveSlackStreamMode("replace")).toBe("replace");
    expect(resolveSlackStreamMode("status_final")).toBe("status_final");
    expect(resolveSlackStreamMode("append")).toBe("append");
  });
});

describe("resolveSlackStreamingConfig", () => {
  it("defaults to partial mode with native streaming disabled (chat.update preview path)", () => {
    // Slack's chat.startStream API requires the bot to be registered as an
    // Agents & AI App; for regular bots it fails at runtime. Default native
    // streaming off so streaming flows through the chat.update-based draft
    // preview, which consolidates tool progress into a single edited message.
    expect(resolveSlackStreamingConfig({})).toEqual({
      mode: "partial",
      nativeStreaming: false,
      draftMode: "replace",
    });
  });

  it("maps legacy streamMode values to unified streaming modes", () => {
    expect(resolveSlackStreamingConfig({ streamMode: "append" })).toMatchObject({
      mode: "block",
      draftMode: "append",
    });
    expect(resolveSlackStreamingConfig({ streamMode: "status_final" })).toMatchObject({
      mode: "progress",
      draftMode: "status_final",
    });
  });

  it("maps legacy streaming booleans to unified mode and native streaming toggle", () => {
    // Boolean `streaming` still controls native streaming directly: `true`
    // forces it on (opt-in), `false` forces it off.
    expect(resolveSlackStreamingConfig({ streaming: false })).toEqual({
      mode: "off",
      nativeStreaming: false,
      draftMode: "replace",
    });
    expect(resolveSlackStreamingConfig({ streaming: true })).toEqual({
      mode: "partial",
      nativeStreaming: true,
      draftMode: "replace",
    });
  });

  it("accepts unified enum values directly with native streaming defaulted off", () => {
    // String `streaming` enum values do not imply native streaming — only
    // `nativeTransport: true` (or boolean `streaming: true`) opts in.
    expect(resolveSlackStreamingConfig({ streaming: "off" })).toEqual({
      mode: "off",
      nativeStreaming: false,
      draftMode: "replace",
    });
    expect(resolveSlackStreamingConfig({ streaming: "progress" })).toEqual({
      mode: "progress",
      nativeStreaming: false,
      draftMode: "status_final",
    });
  });

  it("opts into native streaming when nativeTransport is set explicitly", () => {
    expect(
      resolveSlackStreamingConfig({
        streaming: { mode: "partial", nativeTransport: true },
      }),
    ).toEqual({
      mode: "partial",
      nativeStreaming: true,
      draftMode: "replace",
    });
  });
});

describe("applyAppendOnlyStreamUpdate", () => {
  it("starts with first incoming text", () => {
    const next = applyAppendOnlyStreamUpdate({
      incoming: "hello",
      rendered: "",
      source: "",
    });
    expect(next).toEqual({ rendered: "hello", source: "hello", changed: true });
  });

  it("uses cumulative incoming text when it extends prior source", () => {
    const next = applyAppendOnlyStreamUpdate({
      incoming: "hello world",
      rendered: "hello",
      source: "hello",
    });
    expect(next).toEqual({
      rendered: "hello world",
      source: "hello world",
      changed: true,
    });
  });

  it("ignores regressive shorter incoming text", () => {
    const next = applyAppendOnlyStreamUpdate({
      incoming: "hello",
      rendered: "hello world",
      source: "hello world",
    });
    expect(next).toEqual({
      rendered: "hello world",
      source: "hello world",
      changed: false,
    });
  });

  it("appends non-prefix incoming chunks", () => {
    const next = applyAppendOnlyStreamUpdate({
      incoming: "next chunk",
      rendered: "hello world",
      source: "hello world",
    });
    expect(next).toEqual({
      rendered: "hello world\nnext chunk",
      source: "next chunk",
      changed: true,
    });
  });
});

describe("buildStatusFinalPreviewText", () => {
  it("cycles status dots", () => {
    expect(buildStatusFinalPreviewText(1)).toBe("Status: thinking..");
    expect(buildStatusFinalPreviewText(2)).toBe("Status: thinking...");
    expect(buildStatusFinalPreviewText(3)).toBe("Status: thinking.");
  });
});
