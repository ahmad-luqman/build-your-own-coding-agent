import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { globTool } from "../glob.js";

describe("globTool", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `glob-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src", "index.ts"), "export {}");
    writeFileSync(join(testDir, "src", "app.tsx"), "export {}");
    writeFileSync(join(testDir, "README.md"), "# Hello");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("has correct name and is not dangerous", () => {
    expect(globTool.name).toBe("glob");
    expect(globTool.dangerous).toBeFalsy();
  });

  test("finds files matching a pattern", async () => {
    const result = await globTool.execute({ pattern: "**/*.ts" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.files).toContain("src/index.ts");
    expect(result.data?.count).toBe(1);
  });

  test("finds tsx files", async () => {
    const result = await globTool.execute({ pattern: "**/*.tsx" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.files).toContain("src/app.tsx");
  });

  test("finds multiple file types with brace expansion", async () => {
    const result = await globTool.execute({ pattern: "**/*.{ts,tsx}" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(2);
  });

  test("returns empty result for no matches", async () => {
    const result = await globTool.execute({ pattern: "**/*.py" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.files).toEqual([]);
    expect(result.data?.count).toBe(0);
    expect(result.output).toContain("No files matched");
  });

  test("respects custom path", async () => {
    const result = await globTool.execute(
      { pattern: "*.ts", path: join(testDir, "src") },
      { cwd: "/tmp" },
    );
    expect(result.success).toBe(true);
    expect(result.data?.files).toContain("index.ts");
  });

  test("includes pattern in data", async () => {
    const result = await globTool.execute({ pattern: "**/*.md" }, { cwd: testDir });
    expect(result.data?.pattern).toBe("**/*.md");
  });

  test("formats output with file count", async () => {
    const result = await globTool.execute({ pattern: "**/*.{ts,tsx,md}" }, { cwd: testDir });
    expect(result.output).toContain("3 files found");
  });

  // Note: glob's error catch branch (lines 46-47) is defensive code.
  // The glob library is internally resilient and doesn't throw for invalid inputs,
  // making this branch effectively unreachable without mocking.
});
