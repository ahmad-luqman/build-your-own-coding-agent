# Story 12: Progress Indicator

**Phase:** 3 — UX Polish
**Priority:** Medium | **Effort:** Small

## Problem

During multi-turn agent loops, users don't know how many turns have elapsed, what the agent is doing, or how close it is to the turn limit.

## Solution

Add a progress indicator showing the current turn, active tool, and status.

## Requirements

- Show current turn number during agent execution (e.g., "Turn 3/40")
- Show the name of the currently executing tool with a spinner
- Show "Thinking..." when waiting for model response
- Show "Done" with final turn count when the loop completes
- Integrate into the StatusBar component

## Technical Notes

- The agent loop already tracks `turn` count
- Yield a new `AgentEvent` type like `{ type: "turn-start", turn: number }`
- Use Ink's `<Spinner>` component (from `@inkjs/ui`, already a dependency)

## Files to Modify

- `src/agent.ts` — yield turn-start events
- `src/types.ts` — add turn-start event to `AgentEvent` union
- `src/components/StatusBar.tsx` — display turn count and tool status
- `src/app.tsx` — track and pass turn state to StatusBar

## Acceptance Criteria

- [ ] Current turn number is visible during execution
- [ ] Active tool name is shown with a spinner
- [ ] "Thinking..." appears while waiting for model response
- [ ] Turn counter resets for each new user message
