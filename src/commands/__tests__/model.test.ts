import { describe, expect, mock, test } from "bun:test";
import type { CommandContext } from "../../types.js";
import { modelCommand } from "../model.js";

function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    config: {
      provider: "openrouter",
      modelId: "anthropic/claude-sonnet-4",
      apiKey: "key",
      systemPrompt: "",
      cwd: "/tmp",
      maxTurns: 10,
      sessionsDir: "/tmp/sessions",
    },
    setMessages: mock(() => {}),
    setDisplayMessages: mock(() => {}),
    totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    setTotalUsage: mock(() => {}),
    saveSession: mock(async () => {}),
    setModel: mock(() => {}),
    exit: mock(() => {}),
    ...overrides,
  };
}

describe("modelCommand", () => {
  test("has correct name and usage", () => {
    expect(modelCommand.name).toBe("model");
    expect(modelCommand.usage).toBe("/model [model-id]");
  });

  test("shows current model when no args", () => {
    const ctx = makeCtx();
    const result = modelCommand.execute("", ctx);
    const msg = (result as { message: string }).message;
    expect(msg).toContain("anthropic/claude-sonnet-4");
  });

  test("switches model when arg provided", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    const result = modelCommand.execute("google/gemini-pro", ctx);
    expect(setModel).toHaveBeenCalledWith("google/gemini-pro");
    const msg = (result as { message: string }).message;
    expect(msg).toContain("google/gemini-pro");
    expect(msg).toContain("switched");
  });

  test("does not call setModel when no args", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    modelCommand.execute("", ctx);
    expect(setModel).not.toHaveBeenCalled();
  });

  test("trims whitespace from model id", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    modelCommand.execute("  openai/gpt-4  ", ctx);
    expect(setModel).toHaveBeenCalledWith("openai/gpt-4");
  });
});
