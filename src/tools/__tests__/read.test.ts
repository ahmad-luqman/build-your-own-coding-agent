import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTool } from "../read.js";

describe("readTool", () => {
  let testDir: string;
  const ctx = { cwd: "" };

  beforeEach(() => {
    testDir = join(tmpdir(), `read-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    ctx.cwd = testDir;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("reads a full file with line numbers", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "line1\nline2\nline3\n");

    const result = await readTool.execute({ file_path: "test.txt" }, ctx);

    expect(result.success).toBe(true);
    expect(result.output).toContain("1 | line1");
    expect(result.output).toContain("2 | line2");
    expect(result.output).toContain("3 | line3");
  });

  test("reads with offset", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "line1\nline2\nline3\nline4\n");

    const result = await readTool.execute({ file_path: "test.txt", offset: 3 }, ctx);

    expect(result.success).toBe(true);
    expect(result.output).not.toContain("1 | line1");
    expect(result.output).toContain("3 | line3");
    expect(result.data?.startLine).toBe(3);
  });

  test("reads with limit", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "line1\nline2\nline3\nline4\n");

    const result = await readTool.execute({ file_path: "test.txt", limit: 2 }, ctx);

    expect(result.success).toBe(true);
    expect(result.output).toContain("1 | line1");
    expect(result.output).toContain("2 | line2");
    expect(result.output).not.toContain("3 | line3");
    expect(result.data?.truncated).toBe(true);
  });

  test("reads with offset and limit", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "a\nb\nc\nd\ne\n");

    const result = await readTool.execute({ file_path: "test.txt", offset: 2, limit: 2 }, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.startLine).toBe(2);
    expect(result.data?.endLine).toBe(3);
  });

  test("fails on non-existent file", async () => {
    const result = await readTool.execute({ file_path: "no-such-file.txt" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns file metadata", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "hello\n");

    const result = await readTool.execute({ file_path: "test.txt" }, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.totalLines).toBe(2); // "hello\n" splits to ["hello", ""]
    expect(result.data?.sizeBytes).toBeGreaterThan(0);
    expect(result.data?.filePath).toContain("test.txt");
  });
});
