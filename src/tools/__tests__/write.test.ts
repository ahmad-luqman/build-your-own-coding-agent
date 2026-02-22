import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTool } from "../write.js";

describe("writeTool", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("has correct name and is dangerous", () => {
    expect(writeTool.name).toBe("write_file");
    expect(writeTool.dangerous).toBe(true);
  });

  test("writes content to a file", async () => {
    const result = await writeTool.execute(
      { file_path: "test.txt", content: "hello world" },
      { cwd: testDir },
    );
    expect(result.success).toBe(true);
    const written = readFileSync(join(testDir, "test.txt"), "utf-8");
    expect(written).toBe("hello world");
  });

  test("creates parent directories automatically", async () => {
    const result = await writeTool.execute(
      { file_path: "deep/nested/dir/file.ts", content: "export {};" },
      { cwd: testDir },
    );
    expect(result.success).toBe(true);
    expect(existsSync(join(testDir, "deep/nested/dir/file.ts"))).toBe(true);
  });

  test("overwrites existing file", async () => {
    const filePath = join(testDir, "existing.txt");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(filePath, "old content");

    const result = await writeTool.execute(
      { file_path: "existing.txt", content: "new content" },
      { cwd: testDir },
    );
    expect(result.success).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toBe("new content");
  });

  test("returns byte and line counts", async () => {
    const content = "line1\nline2\nline3";
    const result = await writeTool.execute({ file_path: "multi.txt", content }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.bytesWritten).toBe(content.length);
    expect(result.data?.linesWritten).toBe(3);
  });

  test("returns the resolved file path", async () => {
    const result = await writeTool.execute(
      { file_path: "output.txt", content: "test" },
      { cwd: testDir },
    );
    expect(result.data?.filePath).toContain("output.txt");
  });

  test("output includes character count", async () => {
    const result = await writeTool.execute(
      { file_path: "out.txt", content: "abc" },
      { cwd: testDir },
    );
    expect(result.output).toContain("3 chars");
  });
});
