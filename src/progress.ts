import type { AgentEvent } from "./types.js";

export interface ProgressState {
  currentTurn: number;
  maxTurns: number;
  activeTool: string | null;
}

export const INITIAL_PROGRESS: ProgressState = {
  currentTurn: 0,
  maxTurns: 0,
  activeTool: null,
};

export function progressReducer(state: ProgressState, event: AgentEvent): ProgressState {
  switch (event.type) {
    case "turn-start":
      return { currentTurn: event.turn, maxTurns: event.maxTurns, activeTool: null };
    case "tool-call":
      return { ...state, activeTool: event.toolName };
    case "tool-result":
      return { ...state, activeTool: null };
    default:
      return state;
  }
}
