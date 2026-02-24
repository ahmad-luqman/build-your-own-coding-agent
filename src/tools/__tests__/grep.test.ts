import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grepTool } from "../grep.js";

describe("grepTool", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `grep-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(
      join(testDir, "src", "index.ts"),
      "const foo = 1;\nconst bar = 2;\nexport { foo, bar };\n",
    );
    writeFileSync(join(testDir, "src", "utils.ts"), "export function helper() { return 42; }\n");
    writeFileSync(join(testDir, "README.md"), "# Project\nThis is a project about foo.\n");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("has correct name and is not dangerous", () => {
    expect(grepTool.name).toBe("grep");
    expect(grepTool.dangerous).toBeFalsy();
  });

  test("finds pattern in files", async () => {
    const result = await grepTool.execute({ pattern: "foo" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.count).toBeGreaterThan(0);
    expect((result.data?.matches as unknown[])?.length).toBeGreaterThan(0);
  });

  test("returns file, line, and content in matches", async () => {
    const result = await grepTool.execute({ pattern: "helper" }, { cwd: testDir });
    expect(result.success).toBe(true);
    const matches = result.data?.matches as Array<{ file: string; line: number; content: string }>;
    expect(matches.length).toBe(1);
    expect(matches[0].file).toContain("utils.ts");
    expect(matches[0].line).toBe(1);
    expect(matches[0].content).toContain("helper");
  });

  test("filters by file pattern", async () => {
    const result = await grepTool.execute(
      { pattern: "foo", file_pattern: "**/*.ts" },
      { cwd: testDir },
    );
    expect(result.success).toBe(true);
    const matches = result.data?.matches as Array<{ file: string }>;
    for (const m of matches) {
      expect(m.file).toMatch(/\.ts$/);
    }
  });

  test("returns no matches for unmatched pattern", async () => {
    const result = await grepTool.execute({ pattern: "zzzzNotFound" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
    expect(result.output).toContain("No matches");
  });

  test("supports regex patterns", async () => {
    const result = await grepTool.execute({ pattern: "const \\w+ = \\d+" }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(2); // foo = 1, bar = 2
  });

  test("respects custom search path", async () => {
    const result = await grepTool.execute(
      { pattern: "foo", path: join(testDir, "src") },
      { cwd: testDir },
    );
    expect(result.success).toBe(true);
    const matches = result.data?.matches as Array<{ file: string }>;
    // Should not include README.md since we're searching in src/
    for (const m of matches) {
      expect(m.file).not.toContain("README");
    }
  });

  test("includes filesSearched in data", async () => {
    const result = await grepTool.execute({ pattern: "foo" }, { cwd: testDir });
    expect(result.data?.filesSearched).toBeGreaterThan(0);
  });

  test("includes truncated flag in data", async () => {
    const result = await grepTool.execute({ pattern: "foo" }, { cwd: testDir });
    expect(result.data?.truncated).toBe(false);
  });

  test("returns error for invalid regex pattern", async () => {
    const result = await grepTool.execute({ pattern: "[invalid" }, { cwd: testDir });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
