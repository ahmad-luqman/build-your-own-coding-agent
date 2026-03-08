import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { multiEditTool } from "../multi-edit.js";

describe("multiEditTool", () => {
  let testDir: string;
  const ctx = { cwd: "" };

  beforeEach(() => {
    testDir = join(tmpdir(), `multi-edit-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    ctx.cwd = testDir;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("has correct name and is dangerous", () => {
    expect(multiEditTool.name).toBe("multi_edit");
    expect(multiEditTool.dangerous).toBe(true);
  });

  test("applies a single edit successfully", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello world\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "hello", new_string: "goodbye" }] },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("goodbye world\n");
    expect(result.data?.totalFilesEdited).toBe(1);
    expect(result.data?.totalEditsApplied).toBe(1);
  });

  test("applies edits across multiple files", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\n");
    writeFileSync(join(testDir, "b.txt"), "bbb\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "b.txt", old_string: "bbb", new_string: "yyy" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("xxx\n");
    expect(readFileSync(join(testDir, "b.txt"), "utf-8")).toBe("yyy\n");
    expect(result.data?.totalFilesEdited).toBe(2);
    expect(result.data?.totalEditsApplied).toBe(2);
  });

  test("applies multiple edits to the same file in order", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\nbbb\nccc\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "a.txt", old_string: "bbb", new_string: "yyy" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("xxx\nyyy\nccc\n");
    expect(result.data?.totalFilesEdited).toBe(1);
    expect(result.data?.totalEditsApplied).toBe(2);
  });

  test("second edit can reference content created by first edit", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello world\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "hello", new_string: "goodbye cruel" },
          { file_path: "a.txt", old_string: "goodbye cruel", new_string: "farewell" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("farewell world\n");
  });

  test("fails when old_string not found — file unchanged", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello world\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "not here", new_string: "replaced" }] },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("hello world\n");
  });

  test("fails when old_string appears multiple times", async () => {
    writeFileSync(join(testDir, "a.txt"), "abc\nabc\nabc\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "abc", new_string: "xyz" }] },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("3 times");
  });

  test("fails on non-existent file", async () => {
    const result = await multiEditTool.execute(
      { edits: [{ file_path: "no-such-file.txt", old_string: "x", new_string: "y" }] },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to read");
  });

  test("no files modified when one edit in batch is invalid", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\n");
    writeFileSync(join(testDir, "b.txt"), "bbb\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "b.txt", old_string: "MISSING", new_string: "yyy" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("aaa\n");
    expect(readFileSync(join(testDir, "b.txt"), "utf-8")).toBe("bbb\n");
  });

  test("same file — second edit invalid — file unchanged", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\nbbb\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "a.txt", old_string: "MISSING", new_string: "yyy" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("aaa\nbbb\n");
  });

  test("rolls back already-written files on write failure", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\n");
    const bPath = join(testDir, "b.txt");
    writeFileSync(bPath, "bbb\n");
    // Make b.txt read-only so validation reads it but write fails
    chmodSync(bPath, 0o444);

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "b.txt", old_string: "bbb", new_string: "yyy" },
        ],
      },
      ctx,
    );

    // Restore permissions for cleanup
    chmodSync(bPath, 0o644);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to write");
    // a.txt should be rolled back to original
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("aaa\n");
  });

  test("output contains diff for each edited file", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello\n");
    writeFileSync(join(testDir, "b.txt"), "world\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "hello", new_string: "goodbye" },
          { file_path: "b.txt", old_string: "world", new_string: "earth" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(true);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI
    const plain = result.output.replace(/\x1b\[[0-9;]*m/g, "");
    expect(plain).toContain("- hello");
    expect(plain).toContain("+ goodbye");
    expect(plain).toContain("- world");
    expect(plain).toContain("+ earth");
  });

  test("returns correct per-file edit details in data", async () => {
    writeFileSync(join(testDir, "a.txt"), "line1\nline2\nline3\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "line2", new_string: "edited" }] },
      ctx,
    );

    expect(result.success).toBe(true);
    const fileResults = result.data?.fileResults as Array<{
      editLine: number;
      linesRemoved: number;
      linesAdded: number;
    }>;
    expect(fileResults).toHaveLength(1);
    expect(fileResults[0].editLine).toBe(2);
    expect(fileResults[0].linesRemoved).toBe(1);
    expect(fileResults[0].linesAdded).toBe(1);
  });

  test("handles old_string === new_string (no-op edit)", async () => {
    writeFileSync(join(testDir, "a.txt"), "hello world\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "hello", new_string: "hello" }] },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("hello world\n");
  });

  test("handles multi-line replacements", async () => {
    writeFileSync(join(testDir, "a.txt"), "a\nb\nc\nd\n");

    const result = await multiEditTool.execute(
      { edits: [{ file_path: "a.txt", old_string: "b\nc", new_string: "x\ny\nz" }] },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(join(testDir, "a.txt"), "utf-8")).toBe("a\nx\ny\nz\nd\n");
    const fileResults = result.data?.fileResults as Array<{
      linesRemoved: number;
      linesAdded: number;
    }>;
    expect(fileResults[0].linesRemoved).toBe(2);
    expect(fileResults[0].linesAdded).toBe(3);
  });

  test("catches unexpected errors gracefully", async () => {
    // Pass malformed input that bypasses schema but causes runtime error
    const result = await multiEditTool.execute({ edits: [null as any] }, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("reports correct edit index in validation errors", async () => {
    writeFileSync(join(testDir, "a.txt"), "aaa\nbbb\nccc\n");

    const result = await multiEditTool.execute(
      {
        edits: [
          { file_path: "a.txt", old_string: "aaa", new_string: "xxx" },
          { file_path: "a.txt", old_string: "bbb", new_string: "yyy" },
          { file_path: "a.txt", old_string: "MISSING", new_string: "zzz" },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Edit 2");
    expect(result.error).toContain("not found");
  });
});
