import { afterEach, describe, expect, test } from "bun:test";
import { marked, renderMarkdown } from "../markdown.js";

describe("renderMarkdown edge cases", () => {
  const originalParse = marked.parse.bind(marked);

  afterEach(() => {
    marked.parse = originalParse;
  });

  test("returns raw text when parse returns non-string", () => {
    marked.parse = (() => Promise.resolve("async")) as any;
    const result = renderMarkdown("test input");
    expect(result).toBe("test input");
  });

  test("returns raw text when parse throws", () => {
    marked.parse = (() => {
      throw new Error("parse failed");
    }) as any;
    const result = renderMarkdown("fallback text");
    expect(result).toBe("fallback text");
  });
});
