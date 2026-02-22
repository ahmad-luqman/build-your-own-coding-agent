import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset relevant env vars
    delete process.env.PROVIDER;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.MODEL_ID;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("defaults to openrouter provider", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = loadConfig();
    expect(config.provider).toBe("openrouter");
  });

  test("uses OPENROUTER_API_KEY from env", () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    const config = loadConfig();
    expect(config.apiKey).toBe("sk-test-123");
  });

  test("uses default model for openrouter", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = loadConfig();
    expect(config.modelId).toBe("anthropic/claude-sonnet-4-20250514");
  });

  test("uses MODEL_ID override", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.MODEL_ID = "custom/model";
    const config = loadConfig();
    expect(config.modelId).toBe("custom/model");
  });

  test("detects ollama provider", () => {
    process.env.PROVIDER = "ollama";
    const config = loadConfig();
    expect(config.provider).toBe("ollama");
    expect(config.apiKey).toBeUndefined();
  });

  test("uses default model for ollama", () => {
    process.env.PROVIDER = "ollama";
    const config = loadConfig();
    expect(config.modelId).toBe("qwen3-coder-next");
  });

  test("passes OLLAMA_BASE_URL", () => {
    process.env.PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://custom:11434/v1";
    const config = loadConfig();
    expect(config.baseURL).toBe("http://custom:11434/v1");
  });

  test("exits on missing OPENROUTER_API_KEY", () => {
    const mockExit = mock(() => {}) as any;
    const origExit = process.exit;
    process.exit = mockExit;

    try {
      loadConfig();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = origExit;
    }
  });

  test("exits on unknown provider", () => {
    process.env.PROVIDER = "unknown";
    const mockExit = mock(() => {}) as any;
    const origExit = process.exit;
    process.exit = mockExit;

    try {
      loadConfig();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = origExit;
    }
  });

  test("sets maxTurns to 40", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = loadConfig();
    expect(config.maxTurns).toBe(40);
  });

  test("sets cwd to process.cwd()", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = loadConfig();
    expect(config.cwd).toBe(process.cwd());
  });

  test("sets sessionsDir under home directory", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = loadConfig();
    expect(config.sessionsDir).toContain(".coding-agent");
    expect(config.sessionsDir).toContain("sessions");
  });
});
