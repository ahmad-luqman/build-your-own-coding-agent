import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import type { AgentEvent, ToolDefinition } from "../types.js";

// Mock streamText before importing agent
const mockStreamText = mock(() => ({
  fullStream: (async function* () {
    yield { type: "text-delta", text: "Hello" };
    yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
  })(),
  response: Promise.resolve({ messages: [] }),
  finishReason: Promise.resolve("stop"),
})) as any;

// Pass-through: preserves the execute wrapper so we can call it in tests
const mockTool = mock((def: any) => def);

// Re-export real module to avoid clobbering exports used by other test files (e.g. generateText)
const realAi = await import("ai");
mock.module("ai", () => ({
  ...realAi,
  streamText: mockStreamText,
  tool: mockTool,
}));

const { runAgent } = await import("../agent.js");

async function collectEvents(messages: any[], options: any): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of runAgent(messages, options)) {
    events.push(event);
  }
  return events;
}

const fakeModel = {} as any;
const baseConfig = {
  provider: "openrouter" as const,
  modelId: "test-model",
  systemPrompt: "You are a test assistant.",
  cwd: "/tmp",
  maxTurns: 40,
  sessionsDir: "/tmp/sessions",
};

describe("agent turn-start events", () => {
  test("first event is turn-start with turn=1", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    expect(events[0]).toEqual({ type: "turn-start", turn: 1, maxTurns: 40 });
  });

  test("multi-turn increments turn count", async () => {
    let callCount = 0;
    mockStreamText.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          fullStream: (async function* () {
            yield {
              type: "tool-call",
              toolName: "bash",
              input: { command: "ls" },
              toolCallId: "tc-1",
            };
            yield {
              type: "tool-result",
              toolName: "bash",
              toolCallId: "tc-1",
              output: "file.txt",
            };
            yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
          })(),
          response: Promise.resolve({ messages: [] }),
          finishReason: Promise.resolve("tool-calls"),
        };
      }
      return {
        fullStream: (async function* () {
          yield { type: "text-delta", text: "Done" };
          yield { type: "finish", totalUsage: { inputTokens: 20, outputTokens: 10 } };
        })(),
        response: Promise.resolve({ messages: [] }),
        finishReason: Promise.resolve("stop"),
      };
    });

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const turnStarts = events.filter((e) => e.type === "turn-start");
    expect(turnStarts).toEqual([
      { type: "turn-start", turn: 1, maxTurns: 40 },
      { type: "turn-start", turn: 2, maxTurns: 40 },
    ]);
  });

  test("custom maxTurns is reflected in turn-start events", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const customConfig = { ...baseConfig, maxTurns: 10 };
    const events = await collectEvents([], { model: fakeModel, config: customConfig });
    expect(events[0]).toEqual({ type: "turn-start", turn: 1, maxTurns: 10 });
  });

  test("no extra turn-start after maxTurns exhausted", async () => {
    let callCount = 0;
    const maxTurns = 2;
    mockStreamText.mockImplementation(() => {
      callCount++;
      return {
        fullStream: (async function* () {
          yield {
            type: "tool-call",
            toolName: "bash",
            input: {},
            toolCallId: `tc-${callCount}`,
          };
          yield {
            type: "tool-result",
            toolName: "bash",
            toolCallId: `tc-${callCount}`,
            output: "ok",
          };
          yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
        })(),
        response: Promise.resolve({ messages: [] }),
        finishReason: Promise.resolve("tool-calls"),
      };
    });

    const config = { ...baseConfig, maxTurns };
    const events = await collectEvents([], { model: fakeModel, config });
    const turnStarts = events.filter((e) => e.type === "turn-start");
    expect(turnStarts).toHaveLength(maxTurns);
    expect(turnStarts[turnStarts.length - 1]).toEqual({
      type: "turn-start",
      turn: maxTurns,
      maxTurns,
    });
  });
});

describe("agent stream chunk types", () => {
  test("tool-error yields tool-result with success=false", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield {
          type: "tool-error",
          toolName: "bash",
          toolCallId: "tc-err",
          error: "command not found",
        };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const toolResult = events.find((e) => e.type === "tool-result");
    expect(toolResult).toEqual({
      type: "tool-result",
      toolName: "bash",
      toolCallId: "tc-err",
      result: { success: false, output: "", error: "command not found" },
    });
  });

  test("error chunk with Error instance yields error event", async () => {
    const testError = new Error("stream failed");
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "error", error: testError };
        yield { type: "finish", totalUsage: { inputTokens: 0, outputTokens: 0 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as any).error).toBeInstanceOf(Error);
    expect((errorEvent as any).error.message).toBe("stream failed");
  });

  test("error chunk with non-Error wraps in Error", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "error", error: "plain string error" };
        yield { type: "finish", totalUsage: { inputTokens: 0, outputTokens: 0 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as any).error).toBeInstanceOf(Error);
    expect((errorEvent as any).error.message).toBe("plain string error");
  });

  test("tool-result with object output JSON-stringifies it", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield {
          type: "tool-result",
          toolName: "read_file",
          toolCallId: "tc-obj",
          output: { content: "hello", lines: 5 },
        };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const toolResult = events.find((e) => e.type === "tool-result");
    expect(toolResult).toEqual({
      type: "tool-result",
      toolName: "read_file",
      toolCallId: "tc-obj",
      result: { success: true, output: '{"content":"hello","lines":5}' },
    });
  });

  test("finish with missing usage defaults to zero", async () => {
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: undefined };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const events = await collectEvents([], { model: fakeModel, config: baseConfig });
    const finish = events.find((e) => e.type === "finish");
    expect(finish).toEqual({
      type: "finish",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
  });

  test("appends response messages to history", async () => {
    const responseMsg = { role: "assistant", content: "Hi there" };
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [responseMsg] }),
      finishReason: Promise.resolve("stop"),
    }));

    const msgs: any[] = [{ role: "user", content: "hello" }];
    await collectEvents(msgs, { model: fakeModel, config: baseConfig });
    expect(msgs).toHaveLength(2);
    expect(msgs[1]).toEqual(responseMsg);
  });
});

describe("buildAITools via runAgent", () => {
  function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
    return {
      name: "test_tool",
      description: "A test tool",
      inputSchema: z.object({ arg: z.string() }),
      execute: mock(async () => ({ success: true, output: "done" })),
      ...overrides,
    };
  }

  test("tools are registered and their execute wrappers work", async () => {
    const toolDef = makeTool();
    const toolsMap = new Map([["test_tool", toolDef]]);

    mockTool.mockClear();
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    await collectEvents([], { model: fakeModel, config: baseConfig, tools: toolsMap });

    // buildAITools should have called tool() once
    expect(mockTool).toHaveBeenCalledTimes(1);
    const registeredDef = mockTool.mock.results[0]?.value;
    expect(registeredDef.description).toBe("A test tool");

    // Call the execute wrapper directly
    const result = await registeredDef.execute({ arg: "hello" });
    expect(toolDef.execute).toHaveBeenCalledWith({ arg: "hello" }, { cwd: "/tmp" });
    expect(result).toEqual({ success: true, output: "done" });
  });

  test("execute wrapper returns data field when present", async () => {
    const toolDef = makeTool({
      execute: mock(async () => ({
        success: true,
        output: "human text",
        data: { structured: true },
      })),
    });
    const toolsMap = new Map([["test_tool", toolDef]]);

    mockTool.mockClear();
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    await collectEvents([], { model: fakeModel, config: baseConfig, tools: toolsMap });

    const registeredDef = mockTool.mock.results[0]?.value;
    const result = await registeredDef.execute({ arg: "test" });
    expect(result).toEqual({ structured: true });
  });

  test("onPreToolUse hook blocks tool execution", async () => {
    const toolDef = makeTool();
    const toolsMap = new Map([["test_tool", toolDef]]);

    mockTool.mockClear();
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const onPreToolUse = mock(async () => ({
      allowed: false as const,
      reason: "dangerous command",
    }));

    await collectEvents([], {
      model: fakeModel,
      config: baseConfig,
      tools: toolsMap,
      onPreToolUse,
    });

    const registeredDef = mockTool.mock.results[0]?.value;
    const result = await registeredDef.execute({ arg: "rm -rf /" });
    expect(result).toEqual({
      success: false,
      output: "",
      error: "Blocked: dangerous command",
    });
    expect(toolDef.execute).not.toHaveBeenCalled();
  });

  test("onPreToolUse hook allows tool execution", async () => {
    const toolDef = makeTool();
    const toolsMap = new Map([["test_tool", toolDef]]);

    mockTool.mockClear();
    mockStreamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hi" };
        yield { type: "finish", totalUsage: { inputTokens: 10, outputTokens: 5 } };
      })(),
      response: Promise.resolve({ messages: [] }),
      finishReason: Promise.resolve("stop"),
    }));

    const onPreToolUse = mock(async () => ({ allowed: true as const }));

    await collectEvents([], {
      model: fakeModel,
      config: baseConfig,
      tools: toolsMap,
      onPreToolUse,
    });

    const registeredDef = mockTool.mock.results[0]?.value;
    const result = await registeredDef.execute({ arg: "safe" });
    expect(onPreToolUse).toHaveBeenCalledWith({ toolName: "test_tool", input: { arg: "safe" } });
    expect(toolDef.execute).toHaveBeenCalled();
    expect(result).toEqual({ success: true, output: "done" });
  });
});
