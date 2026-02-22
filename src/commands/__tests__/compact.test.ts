import { describe, expect, mock, test } from "bun:test";
import { compactCommand } from "../compact.js";
import { makeCtx } from "./test-helpers.js";

describe("/compact command", () => {
  test("returns error when compactMessages is not available", async () => {
    const ctx = makeCtx({ compactMessages: undefined });
    const result = await compactCommand.execute("", ctx);
    expect(result.error).toBe("Compaction is not available.");
  });

  test("returns 'not enough' when compaction is not needed", async () => {
    const compactMessages = mock(() =>
      Promise.resolve({
        messages: [],
        displayMessages: [],
        compacted: false,
      }),
    );
    const ctx = makeCtx({ compactMessages });
    const result = await compactCommand.execute("", ctx);
    expect(result.message).toContain("Not enough messages");
    expect(compactMessages).toHaveBeenCalledTimes(1);
  });

  test("returns success when compaction happens", async () => {
    const compactMessages = mock(() =>
      Promise.resolve({
        messages: [],
        displayMessages: [],
        compacted: true,
        summary: "Some summary",
      }),
    );
    const ctx = makeCtx({ compactMessages });
    const result = await compactCommand.execute("", ctx);
    expect(result.message).toContain("Context compacted");
    expect(compactMessages).toHaveBeenCalledTimes(1);
  });

  test("has correct command metadata", () => {
    expect(compactCommand.name).toBe("compact");
    expect(compactCommand.description).toBeTruthy();
  });
});
