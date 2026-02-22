import { describe, expect, test } from "bun:test";
import { createModel } from "../model.js";
import type { AgentConfig } from "../types.js";

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    provider: "openrouter",
    modelId: "anthropic/claude-sonnet-4-20250514",
    apiKey: "test-key",
    systemPrompt: "test prompt",
    cwd: "/tmp",
    maxTurns: 40,
    ...overrides,
  };
}

describe("createModel", () => {
  test("creates an OpenRouter model", () => {
    const model = createModel(makeConfig());
    expect(model).toBeDefined();
    expect(model.modelId).toBe("anthropic/claude-sonnet-4-20250514");
  });

  test("creates an Ollama model", () => {
    const model = createModel(
      makeConfig({
        provider: "ollama",
        modelId: "qwen3-coder-next",
        apiKey: undefined,
      }),
    );
    expect(model).toBeDefined();
    expect(model.modelId).toBe("qwen3-coder-next");
  });

  test("throws on unknown provider", () => {
    expect(() => createModel(makeConfig({ provider: "unknown" as any }))).toThrow(
      "Unknown provider: unknown",
    );
  });
});
