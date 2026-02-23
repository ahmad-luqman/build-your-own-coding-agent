import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { glob } from "glob";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  path: z.string().optional().describe("Directory to list. Defaults to cwd."),
  depth: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Max depth to traverse (default: 3). Must be a non-negative integer."),
});

interface TreeNode {
  name: string;
  type: "file" | "directory";
  size?: number;
  children?: TreeNode[];
}

/** Parse .gitignore into glob ignore patterns. Returns [] on any read failure. */
function parseGitignore(cwd: string): string[] {
  try {
    const content = readFileSync(join(cwd, ".gitignore"), "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
      .map((pattern) => {
        if (pattern.endsWith("/")) return `**/${pattern}**`;
        return `**/${pattern}`;
      });
  } catch {
    return [];
  }
}

function buildTree(
  files: string[],
  dirs: string[],
  cwd: string,
  maxDepth: number,
  fileSizes: Map<string, number>,
): TreeNode {
  const root: TreeNode = { name: basename(cwd), type: "directory", children: [] };

  function ensureDir(parts: string[]): TreeNode {
    let current = root;
    for (const part of parts) {
      let dir = current.children!.find((c) => c.name === part && c.type === "directory");
      if (!dir) {
        dir = { name: part, type: "directory", children: [] };
        current.children!.push(dir);
      }
      current = dir;
    }
    return current;
  }

  for (const dirPath of dirs.sort()) {
    const parts = dirPath.split("/");
    if (parts.length > maxDepth) continue;
    ensureDir(parts);
  }

  for (const filePath of files.sort()) {
    const parts = filePath.split("/");
    if (parts.length > maxDepth) continue;

    const dirParts = parts.slice(0, -1);
    const fileName = parts[parts.length - 1];
    const parent = dirParts.length > 0 ? ensureDir(dirParts) : root;

    parent.children!.push({ name: fileName, type: "file", size: fileSizes.get(filePath) ?? 0 });
  }

  return root;
}

function formatTree(node: TreeNode, prefix: string, isLast: boolean, isRoot: boolean): string {
  const lines: string[] = [];

  if (isRoot) {
    lines.push(`${node.name}/`);
  } else {
    const connector = isLast ? "└── " : "├── ";
    const suffix = node.type === "directory" ? "/" : ` (${formatSize(node.size ?? 0)})`;
    lines.push(`${prefix}${connector}${node.name}${suffix}`);
  }

  if (node.children) {
    const sorted = [...node.children].sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sorted.length; i++) {
      const child = sorted[i];
      const childIsLast = i === sorted.length - 1;
      const childPrefix = isRoot ? "" : `${prefix}${isLast ? "    " : "│   "}`;
      lines.push(formatTree(child, childPrefix, childIsLast, false));
    }
  }

  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const treeTool: ToolDefinition = {
  name: "tree",
  description:
    "Show directory structure as a tree with file sizes and counts. " +
    "Respects top-level .gitignore patterns (negation and nested .gitignore files are not supported). " +
    "Useful for understanding project layout in a single call.",
  inputSchema,
  execute: async (input, ctx) => {
    try {
      const cwd = input.path ? resolve(ctx.cwd, input.path) : ctx.cwd;

      if (!existsSync(cwd)) {
        return { success: false, output: "", error: `Directory not found: ${cwd}` };
      }

      const rawDepth = input.depth ?? 3;
      if (!Number.isInteger(rawDepth) || rawDepth < 0) {
        return {
          success: false,
          output: "",
          error: `Invalid depth: ${rawDepth}. Must be a non-negative integer.`,
        };
      }
      const maxDepth = rawDepth;
      const baseIgnores = ["**/node_modules/**", "**/.git/**"];
      const gitignorePatterns = parseGitignore(cwd);
      const ignorePatterns = [...baseIgnores, ...gitignorePatterns];

      const files = await glob("**/*", {
        cwd,
        nodir: false,
        dot: false,
        ignore: ignorePatterns,
        mark: true,
      });

      const allFiles = files.filter((f) => !f.endsWith("/")).sort();
      const allDirs = files
        .filter((f) => f.endsWith("/"))
        .map((f) => f.slice(0, -1))
        .sort();

      // Stat each file once and cache sizes
      const fileSizes = new Map<string, number>();
      let totalSize = 0;
      for (const f of allFiles) {
        try {
          const size = statSync(join(cwd, f)).size;
          fileSizes.set(f, size);
          totalSize += size;
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            "code" in err &&
            (err as NodeJS.ErrnoException).code === "ENOENT"
          ) {
            // File removed between glob and stat — expected race condition
            continue;
          }
          throw err;
        }
      }
      const totalFiles = allFiles.length;
      const totalDirs = allDirs.length;

      if (maxDepth === 0) {
        const summary = `${basename(cwd)}/ (${totalFiles} files, ${totalDirs} dirs, ${formatSize(totalSize)})`;
        return {
          success: true,
          output: summary,
          data: { root: cwd, depth: maxDepth, totalFiles, totalDirs, totalSize },
        };
      }

      const tree = buildTree(allFiles, allDirs, cwd, maxDepth, fileSizes);

      if (tree.children!.length === 0) {
        return {
          success: true,
          output: `${basename(cwd)}/ (empty)`,
          data: { root: cwd, depth: maxDepth, totalFiles: 0, totalDirs: 0, totalSize: 0 },
        };
      }

      const output = formatTree(tree, "", true, true);
      const summary = `\n${totalFiles} files, ${totalDirs} directories, ${formatSize(totalSize)}`;

      return {
        success: true,
        output: output + summary,
        data: { root: cwd, depth: maxDepth, totalFiles, totalDirs, totalSize },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, output: "", error: msg };
    }
  },
};
