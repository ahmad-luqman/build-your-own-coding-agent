import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionFile } from "../../types.js";
import { sessionsCommand } from "../sessions.js";
import { makeCtx as makeBaseCtx } from "./test-helpers.js";

function makeSession(name: string, messageCount: number): SessionFile {
  return {
    version: 1,
    metadata: {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelId: "test-model",
      messageCount,
      cwd: "/tmp",
    },
    state: {
      messages: [],
      displayMessages: [],
      totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    },
  };
}

describe("sessionsCommand", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `sessions-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const makeCtx = (overrides = {}) =>
    makeBaseCtx({ config: { ...makeBaseCtx().config, sessionsDir: testDir }, ...overrides });

  test("has correct name", () => {
    expect(sessionsCommand.name).toBe("sessions");
  });

  test("returns 'no saved sessions' for empty directory", async () => {
    const ctx = makeCtx();
    const result = await sessionsCommand.execute("", ctx);
    expect(result.message).toContain("No saved sessions");
  });

  test("lists saved sessions with details", async () => {
    const s1 = makeSession("Chat about code", 5);
    const s2 = makeSession("Debug session", 12);
    writeFileSync(join(testDir, "2024-01-01_session.json"), JSON.stringify(s1));
    writeFileSync(join(testDir, "2024-01-02_session.json"), JSON.stringify(s2));

    const ctx = makeCtx();
    const result = await sessionsCommand.execute("", ctx);

    expect(result.message).toContain("Chat about code");
    expect(result.message).toContain("Debug session");
    expect(result.message).toContain("5 messages");
    expect(result.message).toContain("12 messages");
    expect(result.message).toContain("test-model");
  });

  test("numbers sessions sequentially", async () => {
    const s1 = makeSession("First", 1);
    const s2 = makeSession("Second", 2);
    writeFileSync(join(testDir, "a.json"), JSON.stringify(s1));
    writeFileSync(join(testDir, "b.json"), JSON.stringify(s2));

    const ctx = makeCtx();
    const result = await sessionsCommand.execute("", ctx);

    expect(result.message).toContain("1.");
    expect(result.message).toContain("2.");
  });

  test("returns error when listSessions throws", async () => {
    const ctx = makeCtx({ config: { ...makeBaseCtx().config, sessionsDir: "/nonexistent/path" } });
    const result = await sessionsCommand.execute("", ctx);
    expect(result.error).toContain("Failed to list sessions");
  });
});
