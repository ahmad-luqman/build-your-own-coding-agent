# Story 15: Parallel Tool Calls

**Phase:** 4 — Architecture Upgrades
**Priority:** Medium | **Effort:** Small

## Problem

When the model emits multiple tool calls in a single response (e.g., "read these 3 files"), they're executed sequentially. This wastes time on independent operations.

## Solution

Detect independent tool calls and execute them concurrently.

## Requirements

- When a model response contains multiple tool calls, execute them with `Promise.all`
- Dangerous tools still require sequential approval (don't batch approval prompts)
- Tool results are returned in the original order regardless of completion order
- Add a concurrency limit to prevent resource exhaustion (e.g., max 5 parallel)

## Technical Notes

- AI SDK v6's `streamText` already supports multiple tool calls per response
- The agent loop in `agent.ts` processes tool calls — change from sequential `for` loop to parallel `Promise.all`
- Dangerous tool approval is the tricky part — may need to separate safe and dangerous calls
- Safe tools run in parallel; dangerous tools run sequentially with approval

## Files to Modify

- `src/agent.ts` — parallel tool execution logic
- `src/app.tsx` — handle multiple concurrent tool-result events

## Acceptance Criteria

- [ ] Multiple safe tool calls execute concurrently
- [ ] Dangerous tools still get individual approval
- [ ] Results are returned to the model in the correct order
- [ ] Observable speedup on multi-tool responses (e.g., reading 5 files)
