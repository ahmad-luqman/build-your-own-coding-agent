# Story 01: Session Persistence

**Phase:** 1 — Make It Actually Useful Day-to-Day
**Priority:** High | **Effort:** Medium

## Problem

When you exit the agent, the entire conversation is lost. Restarting means re-explaining context, re-reading files, and wasting tokens rebuilding state.

## Solution

Save and restore conversation sessions so users can pick up where they left off.

## Requirements

- On exit, serialize `SessionState` (messages, display messages, token usage) to a JSON file
- Store sessions in `~/.coding-agent/sessions/` with timestamped filenames
- On startup, offer to resume the most recent session or start fresh
- Add `/save` and `/load <session>` slash commands (depends on Story #2)
- Add `/sessions` command to list saved sessions
- Cap stored sessions (e.g., keep last 20, auto-prune oldest)

## Technical Notes

- `SessionState` in `types.ts` already holds everything needed
- `ModelMessage` from AI SDK is serializable to JSON
- Consider compressing large sessions (tool results can be verbose)

## Files to Modify

- `src/types.ts` — add session metadata type (name, timestamp, token count)
- `src/session.ts` — new file: save/load/list/prune logic
- `src/app.tsx` — integrate session restore on startup
- `src/config.ts` — add session storage path to config

## Acceptance Criteria

- [ ] Exiting the agent saves the session automatically
- [ ] Restarting offers to resume the last session
- [ ] Sessions can be listed and loaded by name
- [ ] Old sessions are pruned to prevent unbounded disk usage
