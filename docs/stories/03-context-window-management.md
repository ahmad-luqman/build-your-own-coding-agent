# Story 03: Context Window Management

**Phase:** 1 — Make It Actually Useful Day-to-Day
**Priority:** High | **Effort:** Medium

## Problem

Long sessions will exceed the model's context window, causing errors or degraded performance. There's no mechanism to manage conversation length.

## Solution

Automatically compact old messages when approaching the context limit by summarizing them into a condensed form.

## Requirements

- Track approximate token count per message (use a tokenizer or character-based estimate)
- When total tokens exceed a configurable threshold (e.g., 80% of model's context window), trigger compaction
- Compaction: send older messages to the model with a "summarize this conversation so far" prompt, replace them with the summary
- Keep the most recent N messages intact (they're likely still relevant)
- Add `/compact` slash command for manual trigger (depends on Story #2)
- Show a notification in the TUI when auto-compaction occurs

## Technical Notes

- Different models have different context windows — store this in config or detect from provider
- Token counting: `ai` SDK may expose token counts from responses; otherwise estimate at ~4 chars/token
- The summary itself becomes a system-level message prepended to the remaining history

## Files to Modify

- `src/context.ts` — new file: token counting, compaction logic
- `src/agent.ts` — integrate compaction check before each `streamText` call
- `src/types.ts` — add context window config
- `src/config.ts` — per-provider context window defaults

## Acceptance Criteria

- [ ] Token usage is tracked across the conversation
- [ ] Auto-compaction triggers before hitting the context limit
- [ ] Compacted conversations continue to work normally
- [ ] User is notified when compaction occurs
