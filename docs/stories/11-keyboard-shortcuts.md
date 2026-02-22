# Story 11: Keyboard Shortcuts

**Phase:** 3 — UX Polish
**Priority:** Medium | **Effort:** Small

## Problem

The TUI only handles text input. There's no way to cancel a running generation, clear the screen, or navigate input history with keyboard shortcuts.

## Solution

Add standard terminal keyboard shortcuts for common actions.

## Requirements

- `Ctrl+C` — cancel the current agent loop (abort in-progress generation/tool calls)
- `Ctrl+L` — clear the screen (keep conversation state, just redraw)
- `Up/Down` arrows — cycle through input history
- `Escape` — cancel current input / dismiss prompts
- Show available shortcuts in `/help` output

## Technical Notes

- Ink's `useInput` hook provides raw key detection
- Aborting the agent loop: pass an `AbortController` signal to `streamText()` and tool executions
- Input history: store last N inputs in an array, navigate with Up/Down

## Files to Modify

- `src/app.tsx` — add `useInput` handlers for shortcuts
- `src/agent.ts` — accept and respect `AbortSignal`
- `src/input-history.ts` — new file: input history ring buffer

## Acceptance Criteria

- [ ] `Ctrl+C` cancels the current generation gracefully
- [ ] `Up/Down` cycles through previous inputs
- [ ] `Ctrl+L` clears the display
- [ ] Shortcuts are documented in `/help`
