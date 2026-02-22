import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext, SessionFile } from "../../types.js";
import { loadCommand } from "../load.js";

function makeSession(name: string): SessionFile {
  return {
    version: 1,
    metadata: {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelId: "test-model",
      messageCount: 1,
      cwd: "/tmp",
    },
    state: {
      messages: [{ role: "user", content: "hello" }],
      displayMessages: [{ id: "1", role: "user", content: "hello", timestamp: Date.now() }],
      totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    },
  };
}

describe("loadCommand", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `load-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
    return {
      config: {
        provider: "openrouter",
        modelId: "test-model",
        apiKey: "key",
        systemPrompt: "",
        cwd: "/tmp",
        maxTurns: 10,
        sessionsDir: testDir,
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

  test("has correct name and usage", () => {
    expect(loadCommand.name).toBe("load");
    expect(loadCommand.usage).toBe("/load <number|filename>");
  });

  test("returns error when no args provided", async () => {
    const ctx = makeCtx();
    const result = await loadCommand.execute("", ctx);
    expect(result.error).toContain("Usage");
  });

  test("returns error when whitespace-only args", async () => {
    const ctx = makeCtx();
    const result = await loadCommand.execute("   ", ctx);
    expect(result.error).toContain("Usage");
  });

  test("loads session by filename", async () => {
    const session = makeSession("Test Session");
    const filename = "test-session.json";
    writeFileSync(join(testDir, filename), JSON.stringify(session));

    const setMessages = mock(() => {});
    const setDisplayMessages = mock(() => {});
    const setTotalUsage = mock(() => {});
    const ctx = makeCtx({ setMessages, setDisplayMessages, setTotalUsage });

    const result = await loadCommand.execute(filename, ctx);

    expect(result.message).toContain("Test Session");
    expect(setMessages).toHaveBeenCalledWith(session.state.messages);
    expect(setTotalUsage).toHaveBeenCalledWith(session.state.totalUsage);
    expect(setDisplayMessages).toHaveBeenCalledTimes(1);
  });

  test("loads session by number index", async () => {
    const session1 = makeSession("First Session");
    const session2 = makeSession("Second Session");
    writeFileSync(join(testDir, "2024-01-01_00-00-00-001-aaaa.json"), JSON.stringify(session1));
    writeFileSync(join(testDir, "2024-01-02_00-00-00-001-bbbb.json"), JSON.stringify(session2));

    const ctx = makeCtx();
    // listSessions returns sorted by most recent first
    const result = await loadCommand.execute("1", ctx);

    expect(result.message).toContain("Session");
    expect(result.error).toBeUndefined();
  });

  test("returns error for invalid session number", async () => {
    const session = makeSession("Only Session");
    writeFileSync(join(testDir, "session.json"), JSON.stringify(session));

    const ctx = makeCtx();
    const result = await loadCommand.execute("99", ctx);

    expect(result.error).toContain("Invalid session number");
  });

  test("returns error for non-existent filename", async () => {
    const ctx = makeCtx();
    const result = await loadCommand.execute("nonexistent.json", ctx);

    expect(result.error).toContain("Failed to load session");
  });
});
