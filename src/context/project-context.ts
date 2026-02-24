import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const CONTEXT_FILES = ["CLAUDE.md", "AGENTS.md", "CONTEXT.md", ".agent/context.md"];
export const MAX_CONTEXT_LENGTH = 4000;

export interface ProjectContext {
  filePath: string;
  fileName: string;
  content: string;
  truncated: boolean;
}

export async function loadProjectContext(cwd: string): Promise<ProjectContext | null> {
  for (const fileName of CONTEXT_FILES) {
    const filePath = join(cwd, fileName);
    try {
      let content = await readFile(filePath, "utf-8");
      let truncated = false;

      if (content.length > MAX_CONTEXT_LENGTH) {
        content = content.slice(0, MAX_CONTEXT_LENGTH);
        truncated = true;
      }

      return { filePath, fileName, content, truncated };
    } catch {
      // File doesn't exist or isn't readable — try next
    }
  }
  return null;
}

export function buildSystemPrompt(basePrompt: string, context: ProjectContext | null): string {
  if (!context) {
    return basePrompt;
  }

  const truncationNotice = context.truncated ? " (truncated)" : "";
  return `${basePrompt}

## Project Context (from ${context.fileName}${truncationNotice})

${context.content}`;
}
