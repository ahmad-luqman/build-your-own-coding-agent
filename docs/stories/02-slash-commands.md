# Story 02: Slash Commands

**Phase:** 1 — Make It Actually Useful Day-to-Day
**Priority:** High | **Effort:** Small

## Problem

There's no way to control the agent itself — you can only send messages to the model. Users need built-in commands for session management, model switching, and debugging.

## Solution

Parse input starting with `/` as commands instead of sending them to the model.

## Requirements

- `/clear` — clear conversation history and start fresh
- `/compact` — summarize older messages to free context window (depends on Story #3)
- `/model <id>` — switch the model mid-session without restarting
- `/cost` — show estimated token cost for the session
- `/exit` — quit the agent (already supported but not via command parsing)
- `/help` — list available commands
- Extensible: easy to add new commands without touching the parser

## Technical Notes

- Parse in `App` component before adding input to messages
- Commands are synchronous actions — they don't enter the agent loop
- Use a `Map<string, CommandHandler>` registry pattern (mirrors tool registry)

## Files to Modify

- `src/commands/` — new directory with registry and individual command files
- `src/app.tsx` — intercept `/` prefix in input handler
- `src/types.ts` — add `Command` interface

## Acceptance Criteria

- [ ] Input starting with `/` is handled as a command, not sent to the model
- [ ] `/help` lists all available commands
- [ ] Unknown commands show an error message
- [ ] At least `/clear`, `/exit`, `/help`, and `/cost` are implemented
