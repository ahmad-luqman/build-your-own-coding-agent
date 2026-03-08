import { extname } from "node:path";
import chalk from "chalk";
import { highlight, supportsLanguage } from "cli-highlight";
import { structuredPatch } from "diff";

export interface DiffOptions {
  maxLines?: number;
  contextLines?: number;
}

const DEFAULT_MAX_LINES = 50;
const DEFAULT_CONTEXT_LINES = 3;

function getLang(filePath: string): string | undefined {
  const ext = extname(filePath).slice(1); // strip leading dot
  if (!ext) return undefined;
  return supportsLanguage(ext) ? ext : undefined;
}

function highlightContent(content: string, lang: string | undefined): string {
  if (!lang) return content;
  try {
    return highlight(content, { language: lang, ignoreIllegals: true });
  } catch {
    return content;
  }
}

function colorLine(prefix: string, content: string, lang: string | undefined): string {
  const highlighted = highlightContent(content, lang);
  switch (prefix) {
    case "+":
      return `${chalk.green("+")} ${highlighted}`;
    case "-":
      return `${chalk.red("-")} ${highlighted}`;
    default:
      return `${chalk.dim(" ")} ${highlighted}`;
  }
}

export function formatDiff(
  oldContent: string,
  newContent: string,
  filePath: string,
  options?: DiffOptions,
): string {
  const maxLines = options?.maxLines ?? DEFAULT_MAX_LINES;
  const contextLines = options?.contextLines ?? DEFAULT_CONTEXT_LINES;

  const patch = structuredPatch("a", "b", oldContent, newContent, undefined, undefined, {
    context: contextLines,
  });

  if (patch.hunks.length === 0) return "";

  const lang = getLang(filePath);
  const lines: string[] = [];
  let truncated = 0;

  for (const hunk of patch.hunks) {
    if (lines.length >= maxLines) {
      truncated += hunk.lines.length + 1; // +1 for header
      continue;
    }

    lines.push(
      chalk.cyan(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`),
    );

    for (const line of hunk.lines) {
      if (lines.length >= maxLines) {
        truncated++;
        continue;
      }
      const prefix = line[0];
      const content = line.slice(1);
      lines.push(colorLine(prefix, content, lang));
    }
  }

  if (truncated > 0) {
    lines.push(chalk.dim(`... ${truncated} more lines`));
  }

  return lines.join("\n");
}

export function formatNewFile(content: string, filePath: string, options?: DiffOptions): string {
  const maxLines = options?.maxLines ?? DEFAULT_MAX_LINES;
  const lang = getLang(filePath);
  const contentLines = content.split("\n");
  const lines: string[] = [];

  for (const line of contentLines) {
    if (lines.length >= maxLines) break;
    lines.push(`${chalk.green("+")} ${highlightContent(line, lang)}`);
  }

  const remaining = contentLines.length - lines.length;
  if (remaining > 0) {
    lines.push(chalk.dim(`... ${remaining} more lines`));
  }

  return lines.join("\n");
}
