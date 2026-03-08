import { describe, expect, test } from "bun:test";
import { formatDiff, formatNewFile } from "../diff.js";

// Strip ANSI escape sequences for cleaner assertions
// biome-ignore lint/suspicious/noControlCharactersInRegex: needed to match ANSI escape codes
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, "");
}

describe("formatDiff", () => {
  test("returns empty string for identical content", () => {
    const result = formatDiff("hello\n", "hello\n", "test.txt");
    expect(result).toBe("");
  });

  test("produces + and - lines for a simple change", () => {
    const result = formatDiff("hello world\n", "goodbye world\n", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("- hello world");
    expect(plain).toContain("+ goodbye world");
  });

  test("includes hunk headers", () => {
    const result = formatDiff("hello\n", "goodbye\n", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("@@");
  });

  test("shows context lines around changes", () => {
    const old = "line1\nline2\nline3\nline4\nline5\n";
    const newC = "line1\nline2\nchanged\nline4\nline5\n";
    const result = formatDiff(old, newC, "test.txt", { contextLines: 1 });
    const plain = stripAnsi(result);
    expect(plain).toContain("  line2");
    expect(plain).toContain("- line3");
    expect(plain).toContain("+ changed");
    expect(plain).toContain("  line4");
  });

  test("truncates when exceeding maxLines", () => {
    // Create a diff with many changed lines to exceed maxLines
    const oldLines = Array.from({ length: 30 }, (_, i) => `line${i}`).join("\n");
    const newLines = Array.from({ length: 30 }, (_, i) => `changed${i}`).join("\n");
    const result = formatDiff(oldLines, newLines, "test.txt", { maxLines: 5 });
    const plain = stripAnsi(result);
    expect(plain).toContain("more lines");
  });

  test("does not truncate when within maxLines", () => {
    const result = formatDiff("hello\n", "goodbye\n", "test.txt", { maxLines: 50 });
    const plain = stripAnsi(result);
    expect(plain).not.toContain("more lines");
  });

  test("handles .ts files without error", () => {
    const old = "const x: number = 1;\n";
    const newC = "const x: number = 2;\n";
    const result = formatDiff(old, newC, "test.ts");
    const plain = stripAnsi(result);
    expect(plain).toContain("- const x: number = 1;");
    expect(plain).toContain("+ const x: number = 2;");
  });

  test("handles unknown file extensions gracefully", () => {
    const result = formatDiff("hello\n", "goodbye\n", "test.unknownext");
    const plain = stripAnsi(result);
    expect(plain).toContain("- hello");
    expect(plain).toContain("+ goodbye");
  });

  test("handles multi-line additions and removals", () => {
    const old = "a\nb\nc\n";
    const newC = "a\nx\ny\nz\nc\n";
    const result = formatDiff(old, newC, "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("- b");
    expect(plain).toContain("+ x");
    expect(plain).toContain("+ y");
    expect(plain).toContain("+ z");
  });

  test("handles empty old content (full addition)", () => {
    const result = formatDiff("", "new content\n", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("+ new content");
  });

  test("handles empty new content (full deletion)", () => {
    const result = formatDiff("old content\n", "", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("- old content");
  });

  test("truncates entire hunks when maxLines already exceeded", () => {
    // Create two distant changes to produce multiple hunks
    const oldLines = Array.from({ length: 20 }, (_, i) => `line${i}`);
    const newLines = [...oldLines];
    newLines[2] = "changed2";
    newLines[17] = "changed17";
    const result = formatDiff(oldLines.join("\n"), newLines.join("\n"), "test.txt", {
      maxLines: 5,
      contextLines: 1,
    });
    const plain = stripAnsi(result);
    expect(plain).toContain("more lines");
    // Only the first hunk should appear, second is truncated
    expect(plain).toContain("changed2");
    expect(plain).not.toContain("changed17");
  });
});

describe("formatNewFile", () => {
  test("marks all lines as added", () => {
    const result = formatNewFile("line1\nline2\nline3", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("+ line1");
    expect(plain).toContain("+ line2");
    expect(plain).toContain("+ line3");
  });

  test("truncates long files", () => {
    const content = Array.from({ length: 100 }, (_, i) => `line${i}`).join("\n");
    const result = formatNewFile(content, "test.txt", { maxLines: 10 });
    const plain = stripAnsi(result);
    expect(plain).toContain("more lines");
    // Should show exactly 10 + lines plus truncation indicator
    const plusLines = plain.split("\n").filter((l) => l.startsWith("+ "));
    expect(plusLines).toHaveLength(10);
  });

  test("does not truncate short files", () => {
    const result = formatNewFile("line1\nline2", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).not.toContain("more lines");
  });

  test("handles known extensions without error", () => {
    const result = formatNewFile("const x: number = 1;", "test.ts");
    const plain = stripAnsi(result);
    expect(plain).toContain("+ const x: number = 1;");
  });

  test("handles unknown extensions gracefully", () => {
    const result = formatNewFile("content", "file.xyz123");
    const plain = stripAnsi(result);
    expect(plain).toContain("+ content");
  });

  test("handles empty content", () => {
    const result = formatNewFile("", "test.txt");
    const plain = stripAnsi(result);
    expect(plain).toContain("+ ");
  });
});
