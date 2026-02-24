import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  test("defaults to openrouter provider", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    expect(config.provider).toBe("openrouter");
  });

  test("uses OPENROUTER_API_KEY from env", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    const config = await loadConfig();
    expect(config.apiKey).toBe("sk-test-123");
  });

  test("uses default model for openrouter", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    expect(config.modelId).toBe("anthropic/claude-sonnet-4-20250514");
  });

  test("uses MODEL_ID override", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.MODEL_ID = "custom/model";
    const config = await loadConfig();
    expect(config.modelId).toBe("custom/model");
  });

  test("detects ollama provider", async () => {
    process.env.PROVIDER = "ollama";
    const config = await loadConfig();
    expect(config.provider).toBe("ollama");
    expect(config.apiKey).toBeUndefined();
  });

  test("uses default model for ollama", async () => {
    process.env.PROVIDER = "ollama";
    const config = await loadConfig();
    expect(config.modelId).toBe("qwen3-coder-next");
  });

  test("passes OLLAMA_BASE_URL", async () => {
    process.env.PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://custom:11434/v1";
    const config = await loadConfig();
    expect(config.baseURL).toBe("http://custom:11434/v1");
  });

  test("exits on missing OPENROUTER_API_KEY", async () => {
    const mockExit = mock(() => {}) as any;
    const origExit = process.exit;
    process.exit = mockExit;

    try {
      await loadConfig();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = origExit;
    }
  });

  test("exits on unknown provider", async () => {
    process.env.PROVIDER = "unknown";
    const mockExit = mock(() => {}) as any;
    const origExit = process.exit;
    process.exit = mockExit;

    try {
      await loadConfig();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = origExit;
    }
  });

  test("sets maxTurns to 40", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    expect(config.maxTurns).toBe(40);
  });

  test("sets cwd to process.cwd()", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    expect(config.cwd).toBe(process.cwd());
  });

  test("sets sessionsDir under home directory", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    expect(config.sessionsDir).toContain(".coding-agent");
    expect(config.sessionsDir).toContain("sessions");
  });

  test("includes project context in system prompt when CLAUDE.md exists", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const config = await loadConfig();
    // Running from this repo, CLAUDE.md should be found
    expect(config.systemPrompt).toContain("Project Context");
    expect(config.systemPrompt).toContain("CLAUDE.md");
  });

  test("skips context silently when no context files exist at all", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    // Empty temp dir — no CLAUDE.md, AGENTS.md, etc.
    const emptyDir = join(
      tmpdir(),
      `config-empty-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(emptyDir, { recursive: true });

    const origCwd = process.cwd;
    process.cwd = () => emptyDir;

    const errorSpy = mock(() => {});
    const origError = console.error;
    console.error = errorSpy as any;

    try {
      const config = await loadConfig();
      expect(config.systemPrompt).not.toContain("Project Context");
      // Should NOT have logged any warning — no context files exist
      const warningCalls = (errorSpy as any).mock.calls.filter((call: any[]) =>
        String(call[0]).includes("Found context file"),
      );
      expect(warningCalls.length).toBe(0);
    } finally {
      process.cwd = origCwd;
      console.error = origError;
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test("warns when context file exists but cannot be loaded", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    // Create a temp dir with a directory named CLAUDE.md (not a file).
    // access() sees it as existing, but readFile fails with EISDIR → loadProjectContext returns null.
    const fakeDir = join(
      tmpdir(),
      `config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(join(fakeDir, "CLAUDE.md"), { recursive: true });

    const origCwd = process.cwd;
    process.cwd = () => fakeDir;

    const errorSpy = mock(() => {});
    const origError = console.error;
    console.error = errorSpy as any;

    try {
      const config = await loadConfig();
      // System prompt should NOT contain project context
      expect(config.systemPrompt).not.toContain("Project Context");
      // Should have logged the "found but failed" warning
      const warningCalls = (errorSpy as any).mock.calls.filter((call: any[]) =>
        String(call[0]).includes("Found context file but failed to load"),
      );
      expect(warningCalls.length).toBe(1);
    } finally {
      process.cwd = origCwd;
      console.error = origError;
      rmSync(fakeDir, { recursive: true, force: true });
    }
  });
});
