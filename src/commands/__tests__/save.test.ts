import { describe, expect, mock, test } from "bun:test";
import type { CommandContext } from "../../types.js";
import { saveCommand } from "../save.js";

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

describe("saveCommand", () => {
  test("has correct name and usage", () => {
    expect(saveCommand.name).toBe("save");
    expect(saveCommand.usage).toBe("/save [name]");
  });

  test("saves without name when no args", async () => {
    const saveSession = mock(async () => {});
    const ctx = makeCtx({ saveSession });
    const result = await saveCommand.execute("", ctx);

    expect(saveSession).toHaveBeenCalledWith(undefined);
    expect(result.message).toContain("Session saved");
  });

  test("saves with name when arg provided", async () => {
    const saveSession = mock(async () => {});
    const ctx = makeCtx({ saveSession });
    const result = await saveCommand.execute("my-session", ctx);

    expect(saveSession).toHaveBeenCalledWith("my-session");
    expect(result.message).toContain("my-session");
  });

  test("returns error on save failure", async () => {
    const saveSession = mock(async () => {
      throw new Error("disk full");
    });
    const ctx = makeCtx({ saveSession });
    const result = await saveCommand.execute("", ctx);

    expect(result.error).toContain("disk full");
  });

  test("trims whitespace from name", async () => {
    const saveSession = mock(async () => {});
    const ctx = makeCtx({ saveSession });
    await saveCommand.execute("  trimmed  ", ctx);

    expect(saveSession).toHaveBeenCalledWith("trimmed");
  });
});
