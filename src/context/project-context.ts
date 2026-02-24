import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export const CONTEXT_FILES = ["CLAUDE.md", "AGENTS.md", "CONTEXT.md", ".agent/context.md"] as const;
export type ContextFileName = (typeof CONTEXT_FILES)[number];
export const MAX_CONTEXT_LENGTH = 4000;

/** Size threshold (bytes) above which we warn before reading. */
const SIZE_WARNING_THRESHOLD = MAX_CONTEXT_LENGTH * 4;

export interface ProjectContext {
  fileName: ContextFileName;
  content: string;
  /** True when the original file exceeded MAX_CONTEXT_LENGTH and content was sliced. */
  truncated: boolean;
}

export async function loadProjectContext(cwd: string): Promise<ProjectContext | null> {
  for (const fileName of CONTEXT_FILES) {
    const filePath = join(cwd, fileName);
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > SIZE_WARNING_THRESHOLD) {
        console.error(
          `Warning: ${fileName} is ${fileStats.size} bytes — reading first ${MAX_CONTEXT_LENGTH} chars only`,
        );
      }

      let content = await readFile(filePath, "utf-8");
      let truncated = false;

      if (content.length > MAX_CONTEXT_LENGTH) {
        content = content.slice(0, MAX_CONTEXT_LENGTH);
        truncated = true;
      }

      return { fileName, content, truncated };
    } catch (err: unknown) {
      const code =
        err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT" && code !== "EACCES") {
        console.error(
          `Warning: Failed to read ${fileName}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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
