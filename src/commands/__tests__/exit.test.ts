import { describe, expect, mock, test } from "bun:test";
import { exitCommand } from "../exit.js";
import { makeCtx } from "./test-helpers.js";

describe("exitCommand", () => {
  test("has correct name and quit alias", () => {
    expect(exitCommand.name).toBe("exit");
    expect(exitCommand.aliases).toContain("quit");
  });

  test("saves session before exiting", async () => {
    const saveSession = mock(async () => {});
    const exitFn = mock(() => {});
    const ctx = makeCtx({ saveSession, exit: exitFn });

    await exitCommand.execute("", ctx);

    expect(saveSession).toHaveBeenCalled();
    expect(exitFn).toHaveBeenCalled();
  });

  test("returns error message when save fails instead of silently swallowing", async () => {
    const saveSession = mock(async () => {
      throw new Error("disk full");
    });
    const exitFn = mock(() => {});
    const ctx = makeCtx({ saveSession, exit: exitFn });

    const result = await exitCommand.execute("", ctx);

    // Should NOT call exit when save fails — user gets a chance to retry
    expect(exitFn).not.toHaveBeenCalled();
    expect(result.error).toContain("disk full");
    expect(result.error).toContain("/save");
  });
});
