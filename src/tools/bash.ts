import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  command: z.string().describe("The bash command to execute"),
  timeout: z.number().optional().describe("Timeout in milliseconds (default: 30000)"),
});

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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          proc.kill();
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout),
      );

      const exitCode = await Promise.race([proc.exited, timeoutPromise]);
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

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
      return { success: false, output: "", error: msg };
    }
  },
};
