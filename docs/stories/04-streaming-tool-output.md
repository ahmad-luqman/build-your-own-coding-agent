# Story 04: Streaming Tool Output

**Phase:** 1 — Make It Actually Useful Day-to-Day
**Priority:** Medium | **Effort:** Medium

## Problem

The bash tool blocks until the command completes. For long-running commands (`bun install`, `tsc`, test suites), the TUI appears frozen with no feedback.

## Solution

Stream stdout/stderr from bash commands line-by-line into the TUI as they execute.

## Requirements

- Bash tool streams output lines as they arrive instead of buffering
- TUI displays partial output in real-time
- Final tool result still contains the complete output for the model
- Support for cancelling long-running commands (Ctrl+C sends SIGINT to child process)
- Non-bash tools (read_file, glob, grep) remain unchanged — they're already fast

## Technical Notes

- `Bun.spawn` already supports streaming via `stdout` readable stream
- Yield intermediate events from the tool or use a callback pattern
- The agent loop currently awaits tool results synchronously — may need a streaming tool result variant

## Files to Modify

- `src/tools/bash.ts` — switch from buffered to streaming output
- `src/types.ts` — add streaming tool result type or callback
- `src/components/MessageList.tsx` — render partial tool output
- `src/app.tsx` — handle tool output streaming events

## Acceptance Criteria

- [ ] `bash` tool output appears line-by-line in the TUI
- [ ] Long-running commands show progress in real-time
- [ ] Complete output is still sent to the model after command finishes
- [ ] Commands can be cancelled mid-execution
