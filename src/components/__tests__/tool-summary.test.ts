import { describe, expect, test } from "bun:test";
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
