import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { treeTool } from "../tree.js";

describe("treeTool error paths", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `tree-err-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "real-file.ts"), "export {}");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("skips files that vanish between glob and stat (ENOENT)", async () => {
    // Dangling symlink: glob finds it, statSync throws ENOENT
    symlinkSync(join(testDir, "nonexistent-target"), join(testDir, "ghost.ts"));

    const result = await treeTool.execute({}, { cwd: testDir });
    expect(result.success).toBe(true);
    // The real file should still be in the tree with correct size
    expect(result.output).toContain("real-file.ts");
    // totalFiles includes the dangling symlink (glob found it)
    expect(result.data?.totalFiles).toBe(2);
  });
});

describe("treeTool statSync non-ENOENT error", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `tree-stat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "file.ts"), "export {}");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("propagates non-ENOENT statSync errors to outer catch", async () => {
    // Replace file with a directory of the same name to trigger ENOTDIR-like scenario
    // We'll use a symlink loop which causes ELOOP
    const loopA = join(testDir, "loop-a");
    const loopB = join(testDir, "loop-b");
    symlinkSync(loopB, loopA);
    symlinkSync(loopA, loopB);

    const result = await treeTool.execute({}, { cwd: testDir });
    // ELOOP is not ENOENT, so it should be re-thrown and caught by outer catch
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("ELOOP");
  });
});
