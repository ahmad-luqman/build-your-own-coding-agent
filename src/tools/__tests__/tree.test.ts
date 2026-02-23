import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { treeTool } from "../tree.js";

describe("treeTool", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `tree-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(testDir, "src", "components"), { recursive: true });
    mkdirSync(join(testDir, "src", "utils"), { recursive: true });
    mkdirSync(join(testDir, "docs"), { recursive: true });
    writeFileSync(join(testDir, "src", "index.ts"), 'export const main = "hello";');
    writeFileSync(join(testDir, "src", "components", "App.tsx"), "<div>App</div>");
    writeFileSync(join(testDir, "src", "utils", "helpers.ts"), "export {}");
    writeFileSync(join(testDir, "docs", "README.md"), "# Docs");
    writeFileSync(join(testDir, "package.json"), '{"name": "test"}');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("has correct name and is not dangerous", () => {
    expect(treeTool.name).toBe("tree");
    expect(treeTool.dangerous).toBeFalsy();
  });

  test("returns tree with nested dirs up to default depth (3)", async () => {
    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.depth).toBe(3);
    // Should include files at all 3 levels
    expect(result.output).toContain("package.json");
    expect(result.output).toContain("index.ts");
    expect(result.output).toContain("App.tsx");
    expect(result.output).toContain("helpers.ts");
  });

  test("custom depth limits traversal", async () => {
    const result = await treeTool.execute({ depth: 1 }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.depth).toBe(1);
    // Should show top-level entries (dirs + files)
    expect(result.output).toContain("src");
    expect(result.output).toContain("docs");
    expect(result.output).toContain("package.json");
    // Should NOT show nested files
    expect(result.output).not.toContain("index.ts");
    expect(result.output).not.toContain("App.tsx");
  });

  test("respects .gitignore — excludes node_modules and .git", async () => {
    mkdirSync(join(testDir, "node_modules", "dep"), { recursive: true });
    writeFileSync(join(testDir, "node_modules", "dep", "index.js"), "module.exports = {}");
    mkdirSync(join(testDir, ".git", "objects"), { recursive: true });
    writeFileSync(join(testDir, ".git", "config"), "[core]");

    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.output).not.toContain("node_modules");
    expect(result.output).not.toContain(".git");
  });

  test("respects custom .gitignore patterns", async () => {
    writeFileSync(join(testDir, ".gitignore"), "docs/\n*.log\n");
    mkdirSync(join(testDir, "logs"), { recursive: true });
    writeFileSync(join(testDir, "logs", "app.log"), "log line");
    writeFileSync(join(testDir, "error.log"), "error");

    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.output).not.toContain("docs");
    expect(result.output).not.toContain("app.log");
    expect(result.output).not.toContain("error.log");
  });

  test("includes file sizes in data", async () => {
    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(typeof result.data?.totalSize).toBe("number");
    expect((result.data?.totalSize as number) > 0).toBe(true);
  });

  test("includes file and directory counts", async () => {
    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.totalFiles).toBe(5);
    expect(result.data?.totalDirs).toBe(4); // src, src/components, src/utils, docs
  });

  test("custom path overrides cwd", async () => {
    const result = await treeTool.execute({ path: join(testDir, "src") }, { cwd: "/tmp" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("index.ts");
    expect(result.output).toContain("components");
    // Should not include root-level files
    expect(result.output).not.toContain("package.json");
  });

  test("empty directory returns tree with just root", async () => {
    const emptyDir = join(testDir, "empty");
    mkdirSync(emptyDir, { recursive: true });

    const result = await treeTool.execute({ path: emptyDir }, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.totalFiles).toBe(0);
    expect(result.data?.totalDirs).toBe(0);
    expect(result.output).toContain("(empty)");
  });

  test("output contains tree formatting characters", async () => {
    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    // Should use tree-drawing characters
    expect(result.output).toMatch(/[├└│]/);
    expect(result.output).toMatch(/──/);
  });

  test("depth 0 returns only root-level summary", async () => {
    const result = await treeTool.execute({ depth: 0 }, { cwd: testDir });
    expect(result.success).toBe(true);
    // Should not list any entries
    expect(result.output).not.toContain("src");
    expect(result.output).not.toContain("package.json");
    expect(result.data?.totalFiles).toBe(5);
    expect(result.data?.totalDirs).toBe(4);
  });

  test("non-existent path returns error", async () => {
    const result = await treeTool.execute({ path: join(testDir, "no-such-dir") }, { cwd: testDir });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("data includes root path", async () => {
    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    expect(result.data?.root).toBe(testDir);
  });
});
