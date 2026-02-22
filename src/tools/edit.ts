import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  file_path: z.string().describe("Path to the file to edit"),
  old_string: z.string().describe("The exact string to find and replace"),
  new_string: z.string().describe("The replacement string"),
});

export const editTool: ToolDefinition = {
  name: "edit_file",
  description:
    "Edit a file by replacing an exact string match. The old_string must appear exactly " +
    "once in the file. Use this for surgical edits rather than rewriting entire files.",
  inputSchema,
  dangerous: true,
  execute: async (input, ctx) => {
    try {
      const filePath = resolve(ctx.cwd, input.file_path);
      const content = await readFile(filePath, "utf-8");

      const count = content.split(input.old_string).length - 1;
      if (count === 0) {
        return { success: false, output: "", error: "old_string not found in file" };
      }
      if (count > 1) {
        return {
          success: false,
          output: "",
          error: `old_string found ${count} times — must be unique. Provide more context.`,
        };
      }

      const newContent = content.replace(input.old_string, input.new_string);
      await writeFile(filePath, newContent, "utf-8");

      // Find the line number where the edit was made
      const beforeEdit = content.slice(0, content.indexOf(input.old_string));
      const editLine = beforeEdit.split("\n").length;
      const linesRemoved = input.old_string.split("\n").length;
      const linesAdded = input.new_string.split("\n").length;

      return {
        success: true,
        output: `Edited ${filePath}`,
        data: {
          filePath,
          editLine,
          linesRemoved,
          linesAdded,
          totalLines: newContent.split("\n").length,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
