import { glob as globFn } from "glob";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g. "**/*.ts", "src/**/*.tsx")'),
  path: z.string().optional().describe("Directory to search in. Defaults to cwd."),
});

export const globTool: ToolDefinition = {
  name: "glob",
  description:
    "Find files matching a glob pattern. Returns a list of matching file paths. " +
    "Useful for discovering project structure and finding files by name pattern.",
  inputSchema,
  execute: async (input, ctx) => {
    try {
      const cwd = input.path ?? ctx.cwd;
      const matches = await globFn(input.pattern, {
        cwd,
        nodir: true,
        dot: false,
        ignore: ["**/node_modules/**", "**/.git/**"],
      });

      const sorted = matches.sort();

      if (sorted.length === 0) {
        return {
          success: true,
          output: "No files matched the pattern.",
          data: { files: [], count: 0, pattern: input.pattern },
        };
      }

      return {
        success: true,
        output: `${sorted.length} files found:\n${sorted.join("\n")}`,
        data: {
          files: sorted,
          count: sorted.length,
          pattern: input.pattern,
          searchDir: cwd,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
