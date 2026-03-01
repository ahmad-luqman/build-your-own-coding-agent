import { describe, expect, mock, test } from "bun:test";
import { tmpdir } from "node:os";
import { bashTool, readStream } from "../bash.js";

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

describe("bash streaming output", () => {
  test("calls onOutput with stdout chunks as they arrive", async () => {
    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));
    const result = await bashTool.execute(
      { command: "echo line1; echo line2; echo line3" },
      { cwd: tmpdir(), onOutput },
    );
    expect(result.success).toBe(true);
    expect(onOutput).toHaveBeenCalled();
    const joined = chunks.join("");
    expect(joined).toContain("line1");
    expect(joined).toContain("line2");
    expect(joined).toContain("line3");
  });

  test("calls onOutput with stderr output", async () => {
    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));
    await bashTool.execute({ command: "echo err >&2" }, { cwd: tmpdir(), onOutput });
    expect(onOutput).toHaveBeenCalled();
    const joined = chunks.join("");
    expect(joined).toContain("err");
  });

  test("still returns complete ToolResult when onOutput provided", async () => {
    const onOutput = mock(() => {});
    const result = await bashTool.execute({ command: "echo hello" }, { cwd: tmpdir(), onOutput });
    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe("hello");
    expect(result.data?.exitCode).toBe(0);
    expect(result.output).toContain("stdout:");
    expect(result.output).toContain("hello");
  });

  test("works without onOutput callback (backward compat)", async () => {
    const result = await bashTool.execute({ command: "echo hello" }, { cwd: tmpdir() });
    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe("hello");
  });

  test("streams output for failing commands", async () => {
    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));
    const result = await bashTool.execute(
      { command: "echo partial; exit 1" },
      { cwd: tmpdir(), onOutput },
    );
    expect(result.success).toBe(false);
    expect(result.data?.exitCode).toBe(1);
    const joined = chunks.join("");
    expect(joined).toContain("partial");
  });

  test("streams output before timeout kills process", async () => {
    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));
    const result = await bashTool.execute(
      { command: "echo before; sleep 10", timeout: 200 },
      { cwd: tmpdir(), onOutput },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
    const joined = chunks.join("");
    expect(joined).toContain("before");
  }, 5000);

  test("respects abortSignal — kills process on abort", async () => {
    const controller = new AbortController();
    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));

    const promise = bashTool.execute(
      { command: "echo started; sleep 30" },
      { cwd: tmpdir(), onOutput, abortSignal: controller.signal },
    );
    // Let the process start and emit "started", then abort
    setTimeout(() => controller.abort(), 100);
    const result = await promise;

    expect(result.success).toBe(false);
    // "started" should have been streamed before abort
    const joined = chunks.join("");
    expect(joined).toContain("started");
  }, 5000);

  test("handles already-aborted signal immediately", async () => {
    const controller = new AbortController();
    controller.abort(); // abort before execute

    const result = await bashTool.execute(
      { command: "sleep 30" },
      { cwd: tmpdir(), abortSignal: controller.signal },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("aborted");
  }, 5000);
});

describe("readStream", () => {
  test("returns empty string for null stream", async () => {
    const result = await readStream(null);
    expect(result).toBe("");
  });

  test("flushes remaining multi-byte characters from TextDecoder", async () => {
    // "é" is U+00E9 = 0xC3 0xA9 in UTF-8. Emit only the first byte (0xC3) then
    // close the stream, forcing the TextDecoder flush to produce remaining output.
    const incompleteByte = new Uint8Array([0xc3]);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(incompleteByte);
        controller.close();
      },
    });

    const chunks: string[] = [];
    const onOutput = mock((chunk: string) => chunks.push(chunk));
    const result = await readStream(stream, onOutput);

    // The TextDecoder flush produces a replacement character for the incomplete sequence
    expect(result.length).toBeGreaterThan(0);
    // onOutput should have been called at least once (for the flush or main read)
    expect(onOutput).toHaveBeenCalled();
  });
});
