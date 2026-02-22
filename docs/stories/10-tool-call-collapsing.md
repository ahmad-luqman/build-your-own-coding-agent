# Story 10: Tool Call Collapsing

**Phase:** 3 — UX Polish
**Priority:** Low | **Effort:** Medium

## Problem

Tool outputs (especially `read_file` and `grep`) can be very long, pushing the conversation out of view. The TUI becomes hard to navigate in long sessions.

## Solution

Make tool call results collapsible — show a one-line summary by default, expand on demand.

## Requirements

- Tool results display as a single summary line (e.g., "read_file: src/model.ts (25 lines)")
- Pressing Enter or a shortcut key on a collapsed result expands it
- Pressing the key again collapses it back
- Most recent tool result starts expanded; older ones auto-collapse
- Expand/collapse state doesn't affect what the model sees

## Technical Notes

- This is purely a TUI concern — `DisplayToolCall` already has all the data
- Add an `expanded: boolean` state to each tool call in the display
- Use Ink's `useInput` hook to handle keyboard interaction
- Need to track which tool call is "focused" for keyboard navigation

## Files to Modify

- `src/types.ts` — add `expanded` to `DisplayToolCall`
- `src/components/MessageList.tsx` — conditional rendering based on expanded state
- `src/app.tsx` — handle expand/collapse input

## Acceptance Criteria

- [ ] Tool results are collapsed by default (except the most recent)
- [ ] Users can expand/collapse individual results
- [ ] Collapsed view shows a useful one-line summary
- [ ] Scrolling and navigation remain smooth
