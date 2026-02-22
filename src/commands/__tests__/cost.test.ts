import { describe, expect, mock, test } from "bun:test";
import type { CommandContext } from "../../types.js";
import { costCommand } from "../cost.js";

function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    config: {
      provider: "openrouter",
      modelId: "test-model",
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

describe("costCommand", () => {
  test("has correct name and description", () => {
    expect(costCommand.name).toBe("cost");
    expect(costCommand.description).toBeTruthy();
  });

  test("displays zero usage when no tokens used", () => {
    const ctx = makeCtx();
    const result = costCommand.execute("", ctx);
    expect(result).toHaveProperty("message");
    const msg = (result as { message: string }).message;
    expect(msg).toContain("Token Usage");
    expect(msg).toContain("0");
  });

  test("displays actual token counts", () => {
    const ctx = makeCtx({
      totalUsage: { inputTokens: 1234, outputTokens: 567, totalTokens: 1801 },
    });
    const result = costCommand.execute("", ctx);
    const msg = (result as { message: string }).message;
    expect(msg).toContain("1,234");
    expect(msg).toContain("567");
    expect(msg).toContain("1,801");
  });

  test("displays input, output, and total separately", () => {
    const ctx = makeCtx({
      totalUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
    });
    const result = costCommand.execute("", ctx);
    const msg = (result as { message: string }).message;
    expect(msg).toContain("Input");
    expect(msg).toContain("Output");
    expect(msg).toContain("Total");
  });
});
