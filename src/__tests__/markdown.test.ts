import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "../markdown.js";

describe("renderMarkdown", () => {
  test("renders basic markdown", () => {
    const result = renderMarkdown("**bold**");
    // marked-terminal renders bold text — just verify it returns something non-empty
    expect(result.length).toBeGreaterThan(0);
  });

  test("renders code blocks", () => {
    const result = renderMarkdown("```\nconst x = 1;\n```");
    expect(result).toContain("const x = 1");
  });

  test("returns raw text on empty input", () => {
    const result = renderMarkdown("");
    expect(typeof result).toBe("string");
  });

  test("handles plain text", () => {
    const result = renderMarkdown("hello world");
    expect(result).toContain("hello world");
  });
});
