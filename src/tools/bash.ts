import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  command: z.string().describe("The bash command to execute"),
  timeout: z.number().optional().describe("Timeout in milliseconds (default: 30000)"),
});

export async function readStream(
  stream: ReadableStream<Uint8Array> | null,
  onOutput?: (chunk: string) => void,
): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      accumulated += text;
      onOutput?.(text);
    }
    const remaining = decoder.decode();
    if (remaining) {
      accumulated += remaining;
      onOutput?.(remaining);
    }
  } catch {
    // Stream closed on kill/timeout — return what we have
  }
  return accumulated;
}

export const bashTool: ToolDefinition = {
  name: "bash",
  description:
    "Execute a bash command in the user's shell. Returns stdout and stderr. " +
    "Use for running tests, installing packages, git operations, etc.",
  inputSchema,
  dangerous: true,
  execute: async (input, ctx) => {
    try {
      const timeout = input.timeout ?? 30_000;

      const proc = Bun.spawn(["bash", "-c", input.command], {
        cwd: ctx.cwd,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, TERM: "dumb" },
      });

      const safeKill = () => {
        try {
          proc.kill();
        } catch {
          // Process already exited — nothing to kill
        }
      };

      // Read both streams concurrently, streaming chunks via onOutput.
      // Note: stdout and stderr chunks are interleaved in callback order —
      // the TUI displays them as a single merged stream.
      const stdoutPromise = readStream(proc.stdout as ReadableStream<Uint8Array>, ctx.onOutput);
      const stderrPromise = readStream(proc.stderr as ReadableStream<Uint8Array>, ctx.onOutput);

      // Timeout: kill process and reject after timeout
      let timerId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          safeKill();
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      });

      // Abort signal: kill process and reject on abort
      let abortHandler: (() => void) | undefined;
      const abortPromise = ctx.abortSignal
        ? new Promise<never>((_, reject) => {
            abortHandler = () => {
              safeKill();
              reject(new Error("Command aborted"));
            };
            if (ctx.abortSignal!.aborted) {
              abortHandler();
            } else {
              ctx.abortSignal!.addEventListener("abort", abortHandler, { once: true });
            }
          })
        : undefined;

      // Race: streams + exit vs timeout/abort. Streams drain concurrently with
      // proc.exited so the OS pipe buffers don't fill up and deadlock the child.
      const [stdout, stderr, exitCode] = await Promise.race([
        Promise.all([stdoutPromise, stderrPromise, proc.exited]),
        timeoutPromise,
        ...(abortPromise ? [abortPromise] : []),
      ]);

      // Clean up timer and abort listener on normal completion
      clearTimeout(timerId);
      if (abortHandler && ctx.abortSignal) {
        ctx.abortSignal.removeEventListener("abort", abortHandler);
      }

      const outputParts = [
        stdout && `stdout:\n${stdout.trim()}`,
        stderr && `stderr:\n${stderr.trim()}`,
        `exit code: ${exitCode}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      return {
        success: exitCode === 0,
        output: outputParts,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          command: input.command,
        },
        error: exitCode !== 0 ? `Command exited with code ${exitCode}` : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: `command: ${input.command}`, error: msg };
    }
  },
};
