import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editTool } from "../edit.js";

describe("editTool", () => {
  let testDir: string;
  const ctx = { cwd: "" };

  beforeEach(() => {
    testDir = join(tmpdir(), `edit-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    ctx.cwd = testDir;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("replaces a unique string", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "hello world\nfoo bar\n");

    const result = await editTool.execute(
      { file_path: "test.txt", old_string: "hello world", new_string: "goodbye world" },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toBe("goodbye world\nfoo bar\n");
  });

  test("fails when old_string not found", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "hello world\n");

    const result = await editTool.execute(
      { file_path: "test.txt", old_string: "not here", new_string: "replaced" },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  test("fails when old_string is not unique", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "abc\nabc\nabc\n");

    const result = await editTool.execute(
      { file_path: "test.txt", old_string: "abc", new_string: "xyz" },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("3 times");
  });

  test("reports correct line numbers", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "line1\nline2\nline3\nline4\n");

    const result = await editTool.execute(
      { file_path: "test.txt", old_string: "line3", new_string: "edited" },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(result.data?.editLine).toBe(3);
  });

  test("handles multi-line replacement", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "a\nb\nc\nd\n");

    const result = await editTool.execute(
      { file_path: "test.txt", old_string: "b\nc", new_string: "x\ny\nz" },
      ctx,
    );

    expect(result.success).toBe(true);
    expect(result.data?.linesRemoved).toBe(2);
    expect(result.data?.linesAdded).toBe(3);
    expect(readFileSync(filePath, "utf-8")).toBe("a\nx\ny\nz\nd\n");
  });

  test("fails on non-existent file", async () => {
    const result = await editTool.execute(
      { file_path: "no-such-file.txt", old_string: "x", new_string: "y" },
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
