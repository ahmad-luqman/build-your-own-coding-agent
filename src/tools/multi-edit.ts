import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { formatDiff } from "../diff.js";
import type { ToolDefinition } from "../types.js";

const editEntrySchema = z.object({
  file_path: z.string().describe("Path to the file to edit"),
  old_string: z.string().describe("The exact string to find and replace"),
  new_string: z.string().describe("The replacement string"),
});

const inputSchema = z.object({
  edits: z
    .array(editEntrySchema)
    .min(1)
    .describe("Array of edits to apply atomically — all succeed or none do"),
});

interface FileEditGroup {
  resolvedPath: string;
  edits: Array<{ old_string: string; new_string: string; editIndex: number }>;
}

interface EditDetail {
  filePath: string;
  editIndex: number;
  editLine: number;
  linesRemoved: number;
  linesAdded: number;
}

interface ValidatedFile {
  resolvedPath: string;
  originalContent: string;
  finalContent: string;
  editDetails: EditDetail[];
}

function groupEditsByFile(
  edits: Array<{ file_path: string; old_string: string; new_string: string }>,
  cwd: string,
): FileEditGroup[] {
  const groupMap = new Map<string, FileEditGroup>();
  const order: string[] = [];

  for (let i = 0; i < edits.length; i++) {
    const resolvedPath = resolve(cwd, edits[i].file_path);
    let group = groupMap.get(resolvedPath);
    if (!group) {
      group = { resolvedPath, edits: [] };
      groupMap.set(resolvedPath, group);
      order.push(resolvedPath);
    }
    group.edits.push({
      old_string: edits[i].old_string,
      new_string: edits[i].new_string,
      editIndex: i,
    });
  }

  return order.map((p) => groupMap.get(p)!);
}

function validateFileEdits(
  group: FileEditGroup,
  originalContent: string,
):
  | { valid: true; finalContent: string; editDetails: EditDetail[] }
  | { valid: false; error: string } {
  let content = originalContent;
  const editDetails: EditDetail[] = [];

  for (const edit of group.edits) {
    const count = content.split(edit.old_string).length - 1;
    if (count === 0) {
      return {
        valid: false,
        error: `Edit ${edit.editIndex}: old_string not found in ${group.resolvedPath}`,
      };
    }
    if (count > 1) {
      return {
        valid: false,
        error: `Edit ${edit.editIndex}: old_string found ${count} times in ${group.resolvedPath} — must be unique`,
      };
    }

    const beforeEdit = content.slice(0, content.indexOf(edit.old_string));
    const editLine = beforeEdit.split("\n").length;
    const linesRemoved = edit.old_string.split("\n").length;
    const linesAdded = edit.new_string.split("\n").length;

    content = content.replace(edit.old_string, edit.new_string);

    editDetails.push({
      filePath: group.resolvedPath,
      editIndex: edit.editIndex,
      editLine,
      linesRemoved,
      linesAdded,
    });
  }

  return { valid: true, finalContent: content, editDetails };
}

async function rollback(
  applied: Array<{ resolvedPath: string; originalContent: string }>,
): Promise<void> {
  for (const entry of applied) {
    try {
      await writeFile(entry.resolvedPath, entry.originalContent, "utf-8");
    } catch {
      // Best-effort rollback — nothing more we can do
    }
  }
}

export const multiEditTool: ToolDefinition = {
  name: "multi_edit",
  description:
    "Apply multiple edits atomically across one or more files. All edits are validated before " +
    "any changes are written — if any edit is invalid, no files are modified. Edits to the same " +
    "file are applied in array order. Each edit replaces an exact unique string match.",
  inputSchema,
  dangerous: true,
  execute: async (input, ctx) => {
    try {
      const groups = groupEditsByFile(input.edits, ctx.cwd);

      // Phase 1: Validate all edits
      const validated: ValidatedFile[] = [];
      for (const group of groups) {
        let originalContent: string;
        try {
          originalContent = await readFile(group.resolvedPath, "utf-8");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            output: "",
            error: `Failed to read ${group.resolvedPath}: ${msg}`,
          };
        }

        const result = validateFileEdits(group, originalContent);
        if (!result.valid) {
          return { success: false, output: "", error: result.error };
        }

        validated.push({
          resolvedPath: group.resolvedPath,
          originalContent,
          finalContent: result.finalContent,
          editDetails: result.editDetails,
        });
      }

      // Phase 2: Apply all edits
      const applied: Array<{ resolvedPath: string; originalContent: string }> = [];
      for (const file of validated) {
        try {
          await writeFile(file.resolvedPath, file.finalContent, "utf-8");
          applied.push({ resolvedPath: file.resolvedPath, originalContent: file.originalContent });
        } catch (err) {
          await rollback(applied);
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            output: "",
            error: `Failed to write ${file.resolvedPath}: ${msg}`,
          };
        }
      }

      // Build result
      const allDetails: EditDetail[] = [];
      const diffParts: string[] = [];
      for (const file of validated) {
        allDetails.push(...file.editDetails);
        const diff = formatDiff(file.originalContent, file.finalContent, file.resolvedPath);
        if (diff) {
          diffParts.push(diff);
        }
      }

      const output = diffParts.join("\n") || `Edited ${validated.length} file(s)`;
      return {
        success: true,
        output,
        data: {
          fileResults: allDetails,
          totalFilesEdited: validated.length,
          totalEditsApplied: input.edits.length,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
