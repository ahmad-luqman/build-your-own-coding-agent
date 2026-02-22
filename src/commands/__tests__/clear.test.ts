import { describe, expect, mock, test } from "bun:test";
import type { CommandContext } from "../../types.js";
import { clearCommand } from "../clear.js";

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
    totalUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    setTotalUsage: mock(() => {}),
    saveSession: mock(async () => {}),
    setModel: mock(() => {}),
    exit: mock(() => {}),
    ...overrides,
  };
}

describe("clearCommand", () => {
  test("has correct name and description", () => {
    expect(clearCommand.name).toBe("clear");
    expect(clearCommand.description).toBeTruthy();
  });

  test("resets messages to empty array", () => {
    const setMessages = mock(() => {});
    const ctx = makeCtx({ setMessages });
    clearCommand.execute("", ctx);
    expect(setMessages).toHaveBeenCalledWith([]);
  });

  test("resets displayMessages via updater returning empty array", () => {
    let captured: unknown;
    const setDisplayMessages = mock((updater: unknown) => {
      captured = updater;
    });
    const ctx = makeCtx({ setDisplayMessages });
    clearCommand.execute("", ctx);
    expect(setDisplayMessages).toHaveBeenCalledTimes(1);
    // The updater should return an empty array
    const updater = captured as (prev: unknown[]) => unknown[];
    expect(updater([{ id: "1" }])).toEqual([]);
  });

  test("resets totalUsage to zeroes", () => {
    const setTotalUsage = mock(() => {});
    const ctx = makeCtx({ setTotalUsage });
    clearCommand.execute("", ctx);
    expect(setTotalUsage).toHaveBeenCalledWith({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });

  test("returns confirmation message", () => {
    const ctx = makeCtx();
    const result = clearCommand.execute("", ctx);
    expect(result).toHaveProperty("message");
    expect((result as { message: string }).message).toContain("clear");
  });
});
