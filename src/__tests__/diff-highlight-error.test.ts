import { describe, expect, mock, test } from "bun:test";

// Mock cli-highlight to throw on highlight() calls
mock.module("cli-highlight", () => ({
  highlight: () => {
    throw new Error("highlight failed");
  },
  supportsLanguage: () => true,
}));

const { formatDiff } = await import("../diff.js");

describe("formatDiff highlight error fallback", () => {
  test("falls back to plain text when highlight throws", () => {
    const result = formatDiff("hello\n", "goodbye\n", "test.ts");
    expect(result).toContain("hello");
    expect(result).toContain("goodbye");
  });
});
