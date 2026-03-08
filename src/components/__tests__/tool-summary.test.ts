import { describe, expect, test } from "bun:test";
import { formatPreview } from "../ApprovalPrompt.js";
import { formatToolInput, formatToolSummary, truncate } from "../MessageList.js";

describe("formatToolSummary", () => {
  test("read_file with totalLines", () => {
    const result = formatToolSummary(
      "read_file",
      { file_path: "src/model.ts" },
      { success: true, output: "...", data: { totalLines: 25 } },
    );
    expect(result).toBe("src/model.ts (25 lines)");
  });

  test("read_file without data", () => {
    const result = formatToolSummary(
      "read_file",
      { file_path: "src/model.ts" },
      { success: true, output: "..." },
    );
    expect(result).toBe("src/model.ts");
  });

  test("grep with matches", () => {
    const result = formatToolSummary(
      "grep",
      { pattern: "TODO" },
      { success: true, output: "...", data: { count: 5, pattern: "TODO" } },
    );
    expect(result).toBe("/TODO/ → 5 matches");
  });

  test("grep with single match", () => {
    const result = formatToolSummary(
      "grep",
      { pattern: "main" },
      { success: true, output: "...", data: { count: 1, pattern: "main" } },
    );
    expect(result).toBe("/main/ → 1 match");
  });

  test("bash with exit code", () => {
    const result = formatToolSummary(
      "bash",
      { command: "npm test" },
      { success: true, output: "...", data: { exitCode: 0, command: "npm test" } },
    );
    expect(result).toBe("npm test → exit 0");
  });

  test("bash truncates long commands", () => {
    const longCmd = "a".repeat(60);
    const result = formatToolSummary(
      "bash",
      { command: longCmd },
      { success: true, output: "...", data: { exitCode: 1, command: longCmd } },
    );
    expect(result).toContain("...");
    expect(result).toContain("→ exit 1");
  });

  test("bash without data", () => {
    const result = formatToolSummary(
      "bash",
      { command: "echo hi" },
      { success: true, output: "hi" },
    );
    expect(result).toBe("echo hi");
  });

  test("write_file with lines written", () => {
    const result = formatToolSummary(
      "write_file",
      { file_path: "src/foo.ts" },
      { success: true, output: "...", data: { linesWritten: 32, bytesWritten: 512 } },
    );
    expect(result).toBe("src/foo.ts (32 lines written)");
  });

  test("write_file without data", () => {
    const result = formatToolSummary(
      "write_file",
      { file_path: "src/foo.ts" },
      { success: true, output: "..." },
    );
    expect(result).toBe("src/foo.ts");
  });

  test("edit_file with line and diff counts", () => {
    const result = formatToolSummary(
      "edit_file",
      { file_path: "src/foo.ts" },
      {
        success: true,
        output: "...",
        data: { editLine: 15, linesAdded: 2, linesRemoved: 1, totalLines: 50 },
      },
    );
    expect(result).toBe("src/foo.ts (line 15, +2/-1)");
  });

  test("edit_file without data falls back to path", () => {
    const result = formatToolSummary(
      "edit_file",
      { file_path: "src/foo.ts" },
      { success: true, output: "..." },
    );
    expect(result).toBe("src/foo.ts");
  });

  test("multi_edit with edit and file counts", () => {
    const result = formatToolSummary(
      "multi_edit",
      { edits: [] },
      {
        success: true,
        output: "...",
        data: { totalEditsApplied: 3, totalFilesEdited: 2 },
      },
    );
    expect(result).toBe("3 edits applied across 2 files");
  });

  test("multi_edit singular forms", () => {
    const result = formatToolSummary(
      "multi_edit",
      { edits: [] },
      {
        success: true,
        output: "...",
        data: { totalEditsApplied: 1, totalFilesEdited: 1 },
      },
    );
    expect(result).toBe("1 edit applied across 1 file");
  });

  test("multi_edit without data defaults to zero", () => {
    const result = formatToolSummary("multi_edit", { edits: [] }, { success: true, output: "..." });
    expect(result).toBe("0 edits applied across 0 files");
  });

  test("glob with file count", () => {
    const result = formatToolSummary(
      "glob",
      { pattern: "**/*.ts" },
      { success: true, output: "...", data: { count: 12, files: [] } },
    );
    expect(result).toBe("**/*.ts → 12 files");
  });

  test("glob with single file", () => {
    const result = formatToolSummary(
      "glob",
      { pattern: "package.json" },
      { success: true, output: "...", data: { count: 1, files: [] } },
    );
    expect(result).toBe("package.json → 1 file");
  });

  test("tree with files and dirs", () => {
    const result = formatToolSummary(
      "tree",
      { path: "src" },
      { success: true, output: "...", data: { root: "src", totalFiles: 25, totalDirs: 8 } },
    );
    expect(result).toBe("src (25 files, 8 dirs)");
  });

  test("tree falls back to input.path when data.root missing", () => {
    const result = formatToolSummary(
      "tree",
      { path: "lib" },
      { success: true, output: "...", data: { totalFiles: 3, totalDirs: 1 } },
    );
    expect(result).toBe("lib (3 files, 1 dirs)");
  });

  test("tree falls back to '.' when no path info", () => {
    const result = formatToolSummary("tree", {}, { success: true, output: "..." });
    expect(result).toBe(". (0 files, 0 dirs)");
  });

  test("unknown tool falls back to input summary", () => {
    const result = formatToolSummary(
      "custom_tool",
      { foo: "bar" },
      { success: true, output: "..." },
    );
    expect(result).toContain("→ done");
  });

  test("error result shows error message", () => {
    const result = formatToolSummary(
      "read_file",
      { file_path: "missing.ts" },
      { success: false, output: "", error: "ENOENT: no such file" },
    );
    expect(result).toBe("Error: ENOENT: no such file");
  });

  test("error result truncates long error messages", () => {
    const longError = "x".repeat(100);
    const result = formatToolSummary(
      "bash",
      { command: "fail" },
      { success: false, output: "", error: longError },
    );
    expect(result).toStartWith("Error: ");
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(100);
  });

  test("error result without message", () => {
    const result = formatToolSummary("bash", { command: "fail" }, { success: false, output: "" });
    expect(result).toBe("Error");
  });
});

describe("formatToolInput", () => {
  test("read_file returns file path", () => {
    expect(formatToolInput("read_file", { file_path: "src/index.ts" })).toBe("src/index.ts");
  });

  test("read_file with missing path returns empty", () => {
    expect(formatToolInput("read_file", {})).toBe("");
  });

  test("write_file returns file path", () => {
    expect(formatToolInput("write_file", { file_path: "out.txt" })).toBe("out.txt");
  });

  test("edit_file returns file path", () => {
    expect(formatToolInput("edit_file", { file_path: "src/app.ts" })).toBe("src/app.ts");
  });

  test("multi_edit returns edit and file count", () => {
    const result = formatToolInput("multi_edit", {
      edits: [{ file_path: "a.ts" }, { file_path: "b.ts" }, { file_path: "a.ts" }],
    });
    expect(result).toBe("3 edits in 2 files");
  });

  test("multi_edit singular forms", () => {
    const result = formatToolInput("multi_edit", {
      edits: [{ file_path: "a.ts" }],
    });
    expect(result).toBe("1 edit in 1 file");
  });

  test("multi_edit without edits array falls back to JSON", () => {
    const result = formatToolInput("multi_edit", { something: "else" });
    expect(result).toContain("something");
  });

  test("glob returns pattern", () => {
    expect(formatToolInput("glob", { pattern: "**/*.ts" })).toBe("**/*.ts");
  });

  test("grep returns formatted pattern with file_pattern", () => {
    expect(formatToolInput("grep", { pattern: "TODO", file_pattern: "*.ts" })).toBe("/TODO/ *.ts");
  });

  test("grep without file_pattern uses undefined", () => {
    // The ?? operator doesn't apply here since file_pattern is accessed directly
    expect(formatToolInput("grep", { pattern: "TODO" })).toContain("/TODO/");
  });

  test("bash returns command", () => {
    expect(formatToolInput("bash", { command: "npm test" })).toBe("npm test");
  });

  test("unknown tool returns truncated JSON", () => {
    const result = formatToolInput("custom", { key: "value" });
    expect(result).toBe('{"key":"value"}');
  });

  test("unknown tool truncates long JSON to 80 chars", () => {
    const input: Record<string, unknown> = {};
    for (let i = 0; i < 20; i++) input[`key${i}`] = `value${i}`;
    const result = formatToolInput("custom", input);
    expect(result.length).toBeLessThanOrEqual(80);
  });
});

describe("formatPreview", () => {
  test("bash returns command", () => {
    expect(formatPreview("bash", { command: "npm test" })).toBe("npm test");
  });

  test("bash falls back to JSON when command is not string", () => {
    const result = formatPreview("bash", { command: 123 });
    expect(result).toContain("123");
  });

  test("write_file returns path with char count", () => {
    expect(formatPreview("write_file", { file_path: "a.ts", content: "hello" })).toBe(
      "a.ts (5 chars)",
    );
  });

  test("write_file without file_path falls back to JSON", () => {
    const result = formatPreview("write_file", { content: "hello" });
    expect(result).toContain("hello");
  });

  test("edit_file returns file path", () => {
    expect(formatPreview("edit_file", { file_path: "a.ts" })).toBe("a.ts");
  });

  test("edit_file without file_path falls back to JSON", () => {
    const result = formatPreview("edit_file", { other: "val" });
    expect(result).toContain("other");
  });

  test("multi_edit shows per-file edit counts", () => {
    const result = formatPreview("multi_edit", {
      edits: [{ file_path: "a.ts" }, { file_path: "b.ts" }, { file_path: "a.ts" }],
    });
    expect(result).toContain("3 edits across 2 files:");
    expect(result).toContain("a.ts (2 edits)");
    expect(result).toContain("b.ts (1 edit)");
  });

  test("multi_edit singular forms", () => {
    const result = formatPreview("multi_edit", { edits: [{ file_path: "a.ts" }] });
    expect(result).toContain("1 edit across 1 file:");
  });

  test("multi_edit without edits array falls back to JSON", () => {
    const result = formatPreview("multi_edit", { other: "val" });
    expect(result).toContain("other");
  });

  test("unknown tool returns truncated JSON", () => {
    const result = formatPreview("custom", { key: "value" });
    expect(result).toContain("key");
  });
});

describe("truncate", () => {
  test("returns text unchanged when under maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("returns text unchanged when exactly maxLen", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  test("truncates and appends ellipsis when over maxLen", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  test("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });
});
