import { describe, expect, mock, test } from "bun:test";
import { clearCommand } from "../clear.js";
import { makeCtx } from "./test-helpers.js";

describe("clearCommand", () => {
  test("has correct name and description", () => {
    expect(clearCommand.name).toBe("clear");
    expect(clearCommand.description).toBeTruthy();
  });

  test("resets messages to empty array", () => {
    const setMessages = mock(() => {});
    const ctx = makeCtx({ setMessages });
    clearCommand.execute("", ctx);
    expect(setMessages).toHaveBeenCalledWith([]);
  });

  test("resets displayMessages via updater returning empty array", () => {
    let captured: unknown;
    const setDisplayMessages = mock((updater: unknown) => {
      captured = updater;
    });
    const ctx = makeCtx({ setDisplayMessages });
    clearCommand.execute("", ctx);
    expect(setDisplayMessages).toHaveBeenCalledTimes(1);
    // The updater should return an empty array
    const updater = captured as (prev: unknown[]) => unknown[];
    expect(updater([{ id: "1" }])).toEqual([]);
  });

  test("resets totalUsage to zeroes", () => {
    const setTotalUsage = mock(() => {});
    const ctx = makeCtx({ setTotalUsage });
    clearCommand.execute("", ctx);
    expect(setTotalUsage).toHaveBeenCalledWith({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });

  test("returns confirmation message", () => {
    const ctx = makeCtx();
    const result = clearCommand.execute("", ctx);
    expect(result).toHaveProperty("message");
    expect((result as { message: string }).message).toContain("clear");
  });
});
