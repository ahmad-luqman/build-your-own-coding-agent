import { describe, expect, mock, test } from "bun:test";
import { modelCommand } from "../model.js";
import { makeCtx } from "./test-helpers.js";

describe("modelCommand", () => {
  test("has correct name and usage", () => {
    expect(modelCommand.name).toBe("model");
    expect(modelCommand.usage).toBe("/model [model-id]");
  });

  test("shows current model when no args", () => {
    const ctx = makeCtx();
    const result = modelCommand.execute("", ctx);
    const msg = (result as { message: string }).message;
    expect(msg).toContain("test-model");
  });

  test("switches model when arg provided", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    const result = modelCommand.execute("google/gemini-pro", ctx);
    expect(setModel).toHaveBeenCalledWith("google/gemini-pro");
    const msg = (result as { message: string }).message;
    expect(msg).toContain("google/gemini-pro");
    expect(msg).toContain("switched");
  });

  test("does not call setModel when no args", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    modelCommand.execute("", ctx);
    expect(setModel).not.toHaveBeenCalled();
  });

  test("trims whitespace from model id", () => {
    const setModel = mock(() => {});
    const ctx = makeCtx({ setModel });
    modelCommand.execute("  openai/gpt-4  ", ctx);
    expect(setModel).toHaveBeenCalledWith("openai/gpt-4");
  });

  test("returns error when setModel throws", () => {
    const setModel = mock(() => {
      throw new Error("Invalid provider: unknown");
    });
    const ctx = makeCtx({ setModel });
    const result = modelCommand.execute("bad/model-id", ctx);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("Invalid provider");
    expect((result as { error: string }).error).toContain("Failed to switch model");
  });
});
