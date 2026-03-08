import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Capture real module before mocking so we can restore it in afterAll
const { formatDiff: realFormatDiff } = await import("../../diff.js");

// Mock formatDiff to throw, simulating a diff library failure
mock.module("../../diff.js", () => ({
  formatDiff: () => {
    throw new Error("diff library failure");
  },
}));

// Import after mock so the mocked module is used
const { multiEditTool } = await import("../multi-edit.js");

describe("multiEditTool (diff fallback)", () => {
  let testDir: string;
  const ctx = { cwd: "" };

  beforeEach(() => {
    testDir = join(tmpdir(), `multi-edit-diff-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    ctx.cwd = testDir;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Restore real module so the mock doesn't leak into other test files
  afterAll(() => {
    mock.module("../../diff.js", () => ({
      formatDiff: realFormatDiff,
    }));
  });

  test("returns success with fallback output when diff generation fails", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "hello", new_string: "goodbye" }] },
      ctx,
    );

    // Edits were committed, so success must be true even though diff failed
    expect(result.success).toBe(true);
    expect(result.output).toContain("diff unavailable");
    expect(result.data?.totalFilesEdited).toBe(1);
    expect(result.data?.totalEditsApplied).toBe(1);
    // fileResults must still be present even when diff fails
    const fileResults = result.data?.fileResults as Array<{ editLine: number }>;
    expect(fileResults).toHaveLength(1);
    expect(fileResults[0].editLine).toBe(1);
    // File should be modified
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("goodbye\n");
  });
});
