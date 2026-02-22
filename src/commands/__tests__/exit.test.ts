import { describe, expect, mock, test } from "bun:test";
import type { CommandContext } from "../../types.js";
import { exitCommand } from "../exit.js";

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

describe("exitCommand", () => {
  test("has correct name and quit alias", () => {
    expect(exitCommand.name).toBe("exit");
    expect(exitCommand.aliases).toContain("quit");
  });

  test("saves session before exiting", async () => {
    const saveSession = mock(async () => {});
    const exitFn = mock(() => {});
    const ctx = makeCtx({ saveSession, exit: exitFn });

    await exitCommand.execute("", ctx);

    expect(saveSession).toHaveBeenCalled();
    expect(exitFn).toHaveBeenCalled();
  });

  test("calls exit even if save fails", async () => {
    const saveSession = mock(async () => {
      throw new Error("save failed");
    });
    const exitFn = mock(() => {});
    const ctx = makeCtx({ saveSession, exit: exitFn });

    await exitCommand.execute("", ctx);

    expect(exitFn).toHaveBeenCalled();
  });
});
