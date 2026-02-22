import { mock } from "bun:test";
import type { CommandContext } from "../../types.js";

export function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
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
