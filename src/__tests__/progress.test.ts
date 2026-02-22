import { describe, expect, test } from "bun:test";
import { INITIAL_PROGRESS, type ProgressState, progressReducer } from "../progress.js";
import type { AgentEvent } from "../types.js";

describe("progressReducer", () => {
  test("INITIAL_PROGRESS starts at turn 0 with no active tool", () => {
    expect(INITIAL_PROGRESS).toEqual({
      currentTurn: 0,
      maxTurns: 0,
      activeTool: null,
    });
  });

  test("turn-start sets currentTurn and maxTurns, clears activeTool", () => {
    const state = { currentTurn: 1, maxTurns: 40, activeTool: "bash" };
    const event: AgentEvent = { type: "turn-start", turn: 2, maxTurns: 40 };
    const next = progressReducer(state, event);
    expect(next).toEqual({ currentTurn: 2, maxTurns: 40, activeTool: null });
  });

  test("tool-call sets activeTool", () => {
    const state = { currentTurn: 1, maxTurns: 40, activeTool: null };
    const event: AgentEvent = {
      type: "tool-call",
      toolName: "read_file",
      input: { path: "/tmp/foo" },
      toolCallId: "tc-1",
    };
    const next = progressReducer(state, event);
    expect(next).toEqual({ currentTurn: 1, maxTurns: 40, activeTool: "read_file" });
  });

  test("tool-result clears activeTool", () => {
    const state = { currentTurn: 1, maxTurns: 40, activeTool: "bash" };
    const event: AgentEvent = {
      type: "tool-result",
      toolName: "bash",
      toolCallId: "tc-1",
      result: { success: true, output: "ok" },
    };
    const next = progressReducer(state, event);
    expect(next).toEqual({ currentTurn: 1, maxTurns: 40, activeTool: null });
  });

  test("text-delta returns state unchanged", () => {
    const state = { currentTurn: 2, maxTurns: 40, activeTool: "bash" };
    const event: AgentEvent = { type: "text-delta", text: "hello" };
    const next = progressReducer(state, event);
    expect(next).toBe(state);
  });

  test("finish returns state unchanged", () => {
    const state = { currentTurn: 1, maxTurns: 40, activeTool: null };
    const event: AgentEvent = {
      type: "finish",
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    };
    const next = progressReducer(state, event);
    expect(next).toBe(state);
  });

  test("error returns state unchanged", () => {
    const state = { currentTurn: 3, maxTurns: 40, activeTool: "bash" };
    const event: AgentEvent = { type: "error", error: new Error("fail") };
    const next = progressReducer(state, event);
    expect(next).toBe(state);
  });

  test("multiple tools in same turn update activeTool sequentially", () => {
    let state: ProgressState = { currentTurn: 1, maxTurns: 40, activeTool: null };

    // First tool call
    state = progressReducer(state, {
      type: "tool-call",
      toolName: "read_file",
      input: {},
      toolCallId: "tc-1",
    });
    expect(state.activeTool).toBe("read_file");

    // First tool result
    state = progressReducer(state, {
      type: "tool-result",
      toolName: "read_file",
      toolCallId: "tc-1",
      result: { success: true, output: "content" },
    });
    expect(state.activeTool).toBeNull();

    // Second tool call in same turn
    state = progressReducer(state, {
      type: "tool-call",
      toolName: "bash",
      input: { command: "ls" },
      toolCallId: "tc-2",
    });
    expect(state.activeTool).toBe("bash");
    expect(state.currentTurn).toBe(1);
  });
});
