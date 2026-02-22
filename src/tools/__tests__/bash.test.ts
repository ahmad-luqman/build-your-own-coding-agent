import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { bashTool } from "../bash.js";

const ctx = { cwd: tmpdir() };

describe("bashTool", () => {
  test("has correct name and is dangerous", () => {
    expect(bashTool.name).toBe("bash");
    expect(bashTool.dangerous).toBe(true);
  });

  test("executes a simple command", async () => {
    const result = await bashTool.execute({ command: "echo hello" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe("hello");
    expect(result.data?.exitCode).toBe(0);
  });

  test("captures stderr", async () => {
    const result = await bashTool.execute({ command: "echo error >&2" }, ctx);
    expect(result.data?.stderr).toBe("error");
  });

  test("reports non-zero exit code", async () => {
    const result = await bashTool.execute({ command: "exit 42" }, ctx);
    expect(result.success).toBe(false);
    expect(result.data?.exitCode).toBe(42);
    expect(result.error).toContain("42");
  });

  test("formats output with stdout and exit code", async () => {
    const result = await bashTool.execute({ command: "echo test" }, ctx);
    expect(result.output).toContain("stdout:");
    expect(result.output).toContain("test");
    expect(result.output).toContain("exit code: 0");
  });

  test("returns command in data", async () => {
    const result = await bashTool.execute({ command: "echo hi" }, ctx);
    expect(result.data?.command).toBe("echo hi");
  });

  test("handles command timeout", async () => {
    const result = await bashTool.execute({ command: "sleep 10", timeout: 100 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
  }, 5000);

  test("uses custom cwd", async () => {
    const result = await bashTool.execute({ command: "pwd" }, { cwd: "/tmp" });
    expect(result.success).toBe(true);
    // macOS resolves /tmp to /private/tmp
    expect(result.data?.stdout).toMatch(/\/tmp/);
  });
});
