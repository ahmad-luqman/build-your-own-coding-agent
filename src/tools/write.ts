import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the file to write"),
  content: z.string().describe("The content to write to the file"),
});

export const writeTool: ToolDefinition = {
  name: "write_file",
  description:
    "Write content to a file. Creates the file if it doesn't exist, or overwrites it. " +
    "Parent directories are created automatically.",
  inputSchema,
  dangerous: true,
  execute: async (input, ctx) => {
    try {
      const filePath = resolve(ctx.cwd, input.file_path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, input.content, "utf-8");

      const lines = input.content.split("\n").length;

      return {
        success: true,
        output: `Wrote ${input.content.length} chars to ${filePath}`,
        data: {
          filePath,
          bytesWritten: input.content.length,
          linesWritten: lines,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
