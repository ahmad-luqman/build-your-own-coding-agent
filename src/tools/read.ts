import { z } from "zod";
import { readFile, stat } from "fs/promises";
import { resolve } from "path";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the file to read"),
  offset: z.number().optional().describe("Line number to start reading from (1-based)"),
  limit: z.number().optional().describe("Maximum number of lines to read"),
});

export const readTool: ToolDefinition = {
  name: "read_file",
  description:
    "Read the contents of a file. Returns the file contents with line numbers. " +
    "Use offset and limit for large files.",
  inputSchema,
  execute: async (input, ctx) => {
    try {
      const filePath = resolve(ctx.cwd, input.file_path);
      const [content, fileInfo] = await Promise.all([
        readFile(filePath, "utf-8"),
        stat(filePath),
      ]);
      const lines = content.split("\n");
      const totalLines = lines.length;

      const offset = (input.offset ?? 1) - 1;
      const limit = input.limit ?? totalLines;
      const slice = lines.slice(offset, offset + limit);

      const numbered = slice
        .map((line, i) => `${String(offset + i + 1).padStart(5)} | ${line}`)
        .join("\n");

      return {
        success: true,
        output: numbered,
        data: {
          filePath,
          content: slice.join("\n"),
          startLine: offset + 1,
          endLine: offset + slice.length,
          totalLines,
          sizeBytes: fileInfo.size,
          truncated: offset + limit < totalLines,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
