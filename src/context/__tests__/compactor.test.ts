import { afterEach, describe, expect, mock, test } from "bun:test";
import type { ModelMessage } from "ai";
import type { DisplayMessage } from "../../types.js";

// Mock generateText before importing compactor
const mockGenerateText = mock(() =>
  Promise.resolve({ text: "Summary of the conversation so far." }),
);

mock.module("ai", () => ({
  generateText: mockGenerateText,
}));

const { compactMessages } = await import("../compactor.js");

function makeMessages(count: number): ModelMessage[] {
  const msgs: ModelMessage[] = [];
  for (let i = 0; i < count; i++) {
    msgs.push({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i + 1}`,
    });
  }
  return msgs;
}

function makeDisplayMessages(count: number): DisplayMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `display-${i}`,
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `Display message ${i + 1}`,
    timestamp: Date.now() + i,
  }));
}

const fakeModel = {} as any;

describe("compactMessages", () => {
  afterEach(() => {
    mockGenerateText.mockClear();
  });

  test("returns unchanged messages when count <= retainCount", async () => {
    const messages = makeMessages(4);
    const displayMessages = makeDisplayMessages(4);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages,
      retainCount: 6,
    });

    expect(result.compacted).toBe(false);
    expect(result.messages).toBe(messages);
    expect(result.displayMessages).toBe(displayMessages);
    expect(result.summary).toBeUndefined();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  test("returns unchanged when count equals retainCount", async () => {
    const messages = makeMessages(6);
    const displayMessages = makeDisplayMessages(6);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages,
      retainCount: 6,
    });

    expect(result.compacted).toBe(false);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  test("compacts messages when count > retainCount", async () => {
    const messages = makeMessages(10);
    const displayMessages = makeDisplayMessages(10);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages,
      retainCount: 6,
    });

    expect(result.compacted).toBe(true);
    expect(result.summary).toBe("Summary of the conversation so far.");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    // Should have 1 summary + 6 retained = 7 messages
    expect(result.messages).toHaveLength(7);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toContain("[Conversation summary");
    expect(result.messages[0].content).toContain("Summary of the conversation so far.");

    // Retained messages should be the last 6
    for (let i = 0; i < 6; i++) {
      expect(result.messages[i + 1]).toBe(messages[4 + i]);
    }
  });

  test("uses default retainCount of 6", async () => {
    const messages = makeMessages(10);
    const displayMessages = makeDisplayMessages(10);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages,
    });

    expect(result.compacted).toBe(true);
    // 1 summary + 6 retained
    expect(result.messages).toHaveLength(7);
  });

  test("display messages include compaction notice + retained messages", async () => {
    const displayMessages = makeDisplayMessages(10);

    const result = await compactMessages({
      model: fakeModel,
      messages: makeMessages(10),
      displayMessages,
      retainCount: 6,
    });

    expect(result.compacted).toBe(true);
    // 1 summary display + 6 retained display = 7
    expect(result.displayMessages).toHaveLength(7);
    expect(result.displayMessages[0].role).toBe("assistant");
    expect(result.displayMessages[0].content).toContain("Context compacted");
    expect(result.displayMessages[0].content).toContain("4 messages summarized");

    // Retained display messages are the last 6
    for (let i = 0; i < 6; i++) {
      expect(result.displayMessages[i + 1]).toBe(displayMessages[4 + i]);
    }
  });

  test("passes conversation text to generateText", async () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Hello there" },
      { role: "assistant", content: "Hi! How can I help?" },
      { role: "user", content: "Write code" },
      { role: "assistant", content: "Sure thing" },
      { role: "user", content: "Retained 1" },
      { role: "assistant", content: "Retained 2" },
      { role: "user", content: "Retained 3" },
      { role: "assistant", content: "Retained 4" },
    ];

    await compactMessages({
      model: fakeModel,
      messages,
      displayMessages: makeDisplayMessages(8),
      retainCount: 4,
    });

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const call = (mockGenerateText.mock.calls as any[][])[0][0] as any;
    expect(call.messages[0].content).toContain("Hello there");
    expect(call.messages[0].content).toContain("Hi! How can I help?");
    expect(call.messages[0].content).toContain("Write code");
    expect(call.messages[0].content).toContain("Sure thing");
    // Should NOT contain retained messages
    expect(call.messages[0].content).not.toContain("Retained 1");
  });

  test("handles non-string message content (JSON)", async () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Question" },
      {
        role: "assistant",
        content: [{ type: "text", text: "answer" }] as any,
      },
      { role: "user", content: "Keep 1" },
      { role: "assistant", content: "Keep 2" },
    ];

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages: makeDisplayMessages(4),
      retainCount: 2,
    });

    expect(result.compacted).toBe(true);
    // Non-string content should be JSON-stringified
    const call = (mockGenerateText.mock.calls as any[][])[0][0] as any;
    expect(call.messages[0].content).toContain("Question");
    expect(call.messages[0].content).toContain("text");
  });

  test("summary message has correct format markers", async () => {
    const result = await compactMessages({
      model: fakeModel,
      messages: makeMessages(10),
      displayMessages: makeDisplayMessages(10),
      retainCount: 4,
    });

    const summaryMsg = result.messages[0];
    expect(summaryMsg.content).toContain("[Conversation summary");
    expect(summaryMsg.content).toContain("[End of summary");
  });

  test("display split handles fewer display than model messages", async () => {
    const messages = makeMessages(10);
    const displayMessages = makeDisplayMessages(3);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages,
      retainCount: 6,
    });

    expect(result.compacted).toBe(true);
    // displaySplitIndex = max(0, 3 - 6) = 0, so all display messages retained
    // 1 compaction notice + 3 retained = 4
    expect(result.displayMessages).toHaveLength(4);
  });

  test("custom retainCount of 2", async () => {
    const messages = makeMessages(8);

    const result = await compactMessages({
      model: fakeModel,
      messages,
      displayMessages: makeDisplayMessages(8),
      retainCount: 2,
    });

    expect(result.compacted).toBe(true);
    // 1 summary + 2 retained = 3
    expect(result.messages).toHaveLength(3);
    expect(result.messages[1]).toBe(messages[6]);
    expect(result.messages[2]).toBe(messages[7]);
  });
});
