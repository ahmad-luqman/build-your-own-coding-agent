import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureSessionsDir,
  getMostRecentSession,
  listSessions,
  loadSession,
  pruneOldSessions,
  saveSession,
} from "../session.js";
import type { SessionState } from "../types.js";

function makeState(messageCount = 2): SessionState {
  return {
    messages: Array.from({ length: messageCount }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${i + 1}`,
    })),
    displayMessages: Array.from({ length: messageCount }, (_, i) => ({
      id: crypto.randomUUID(),
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${i + 1}`,
      timestamp: Date.now(),
    })),
    totalUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  };
}

const saveOpts = { modelId: "test-model", cwd: "/test/dir" };

describe("session persistence", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "session-test-"));
  });

  describe("ensureSessionsDir", () => {
    test("creates nested directories", async () => {
      const nested = join(dir, "a", "b", "c");
      await ensureSessionsDir(nested);
      const files = await readdir(nested);
      expect(files).toEqual([]);
    });
  });

  describe("saveSession", () => {
    test("writes valid JSON with correct metadata", async () => {
      const state = makeState();
      const filename = await saveSession(dir, state, saveOpts);

      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);

      const raw = await readFile(join(dir, filename), "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.version).toBe(1);
      expect(parsed.metadata.modelId).toBe("test-model");
      expect(parsed.metadata.cwd).toBe("/test/dir");
      expect(parsed.metadata.messageCount).toBe(2);
      expect(parsed.state.messages).toHaveLength(2);
    });

    test("uses custom name when provided", async () => {
      const filename = await saveSession(dir, makeState(), { ...saveOpts, name: "My Session" });
      const raw = await readFile(join(dir, filename), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.metadata.name).toBe("My Session");
    });

    test("throws on empty messages", async () => {
      const emptyState = makeState(0);
      expect(saveSession(dir, emptyState, saveOpts)).rejects.toThrow(
        "Cannot save an empty session",
      );
    });
  });

  describe("loadSession", () => {
    test("roundtrips state correctly", async () => {
      const state = makeState();
      const filename = await saveSession(dir, state, saveOpts);
      const loaded = await loadSession(dir, filename);

      expect(loaded.version).toBe(1);
      expect(loaded.state.messages).toEqual(state.messages);
      expect(loaded.state.displayMessages).toEqual(state.displayMessages);
      expect(loaded.state.totalUsage).toEqual(state.totalUsage);
    });

    test("throws on corrupt file", async () => {
      await writeFile(join(dir, "bad.json"), "not json", "utf-8");
      expect(loadSession(dir, "bad.json")).rejects.toThrow();
    });

    test("throws on invalid structure", async () => {
      await writeFile(join(dir, "invalid.json"), JSON.stringify({ version: 2 }), "utf-8");
      expect(loadSession(dir, "invalid.json")).rejects.toThrow("Invalid session file");
    });
  });

  describe("listSessions", () => {
    test("returns newest first", async () => {
      // Create files with different timestamps in names
      const file1 = "2024-01-01_10-00-00.json";
      const file2 = "2024-01-02_10-00-00.json";
      const sessionFile = (name: string) =>
        JSON.stringify({
          version: 1,
          metadata: {
            id: "1",
            name,
            createdAt: "",
            updatedAt: "",
            modelId: "m",
            messageCount: 1,
            cwd: "/",
          },
          state: makeState(),
        });

      await writeFile(join(dir, file1), sessionFile("first"), "utf-8");
      await writeFile(join(dir, file2), sessionFile("second"), "utf-8");

      const sessions = await listSessions(dir);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].name).toBe("second");
      expect(sessions[1].name).toBe("first");
    });

    test("skips corrupt files", async () => {
      await writeFile(
        join(dir, "good.json"),
        JSON.stringify({
          version: 1,
          metadata: {
            id: "1",
            name: "good",
            createdAt: "",
            updatedAt: "",
            modelId: "m",
            messageCount: 1,
            cwd: "/",
          },
          state: makeState(),
        }),
        "utf-8",
      );
      await writeFile(join(dir, "bad.json"), "not json", "utf-8");

      const sessions = await listSessions(dir);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].name).toBe("good");
    });

    test("returns empty array for empty dir", async () => {
      const sessions = await listSessions(dir);
      expect(sessions).toEqual([]);
    });
  });

  describe("getMostRecentSession", () => {
    test("returns null for empty dir", async () => {
      const result = await getMostRecentSession(dir);
      expect(result).toBeNull();
    });

    test("returns most recent session", async () => {
      await saveSession(dir, makeState(), saveOpts);
      const result = await getMostRecentSession(dir);
      expect(result).not.toBeNull();
      expect(result!.modelId).toBe("test-model");
    });
  });

  describe("pruneOldSessions", () => {
    test("keeps only max files", async () => {
      // Create 5 session files
      for (let i = 0; i < 5; i++) {
        const filename = `2024-01-0${i + 1}_10-00-00.json`;
        await writeFile(
          join(dir, filename),
          JSON.stringify({
            version: 1,
            metadata: {
              id: String(i),
              name: `s${i}`,
              createdAt: "",
              updatedAt: "",
              modelId: "m",
              messageCount: 1,
              cwd: "/",
            },
            state: makeState(),
          }),
          "utf-8",
        );
      }

      await pruneOldSessions(dir, 3);

      const remaining = await readdir(dir);
      expect(remaining).toHaveLength(3);
      // Should keep the 3 newest (sorted by filename)
      expect(remaining.sort()).toEqual([
        "2024-01-03_10-00-00.json",
        "2024-01-04_10-00-00.json",
        "2024-01-05_10-00-00.json",
      ]);
    });

    test("does nothing when under limit", async () => {
      await saveSession(dir, makeState(), saveOpts);
      await pruneOldSessions(dir, 20);
      const files = await readdir(dir);
      expect(files).toHaveLength(1);
    });
  });
});
