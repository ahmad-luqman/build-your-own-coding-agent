import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { glob as globFn } from "glob";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  pattern: z.string().describe("Regex pattern to search for in file contents"),
  file_pattern: z
    .string()
    .optional()
    .describe('Glob to filter files (e.g. "*.ts"). Defaults to all files.'),
  path: z.string().optional().describe("Directory to search in. Defaults to cwd."),
});

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export const grepTool: ToolDefinition = {
  name: "grep",
  description:
    "Search file contents using a regex pattern. Returns matching lines with file paths " +
    "and line numbers. Useful for finding where functions, variables, or patterns are used.",
  inputSchema,
  execute: async (input, ctx) => {
    try {
      const cwd = input.path ?? ctx.cwd;
      const filePattern = input.file_pattern ?? "**/*";

      const files = await globFn(filePattern, {
        cwd,
        nodir: true,
        dot: false,
        ignore: ["**/node_modules/**", "**/.git/**", "**/*.lock"],
      });

      const regex = new RegExp(input.pattern, "gi");
      const matches: GrepMatch[] = [];
      const maxResults = 50;

      for (const file of files) {
        if (matches.length >= maxResults) break;

        try {
          const fullPath = resolve(cwd, file);
          const content = await readFile(fullPath, "utf-8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i]!)) {
              matches.push({
                file: relative(ctx.cwd, fullPath),
                line: i + 1,
                content: lines[i]!.trim(),
              });
              if (matches.length >= maxResults) break;
            }
            regex.lastIndex = 0;
          }
        } catch {
          // skip binary/unreadable files
        }
      }

      const truncated = matches.length >= maxResults;
      const displayLines = matches.map((m) => `${m.file}:${m.line}: ${m.content}`);

      if (matches.length === 0) {
        return {
          success: true,
          output: "No matches found.",
          data: { matches: [], count: 0, pattern: input.pattern, truncated: false },
        };
      }

      return {
        success: true,
        output: `${matches.length} matches${truncated ? " (truncated)" : ""}:\n${displayLines.join("\n")}`,
        data: {
          matches,
          count: matches.length,
          pattern: input.pattern,
          truncated,
          filesSearched: files.length,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
