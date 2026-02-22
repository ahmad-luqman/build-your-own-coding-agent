# Story 05: Multi-File Edit

**Phase:** 2 — Better Tool Intelligence
**Priority:** Medium | **Effort:** Medium

## Problem

Models waste multiple turns making sequential single-file edits. A refactoring that touches 5 files requires 5 separate tool calls, each consuming a round-trip.

## Solution

Add a `multi_edit` tool that accepts an array of file edits and applies them atomically.

## Requirements

- Accept an array of `{ file, old_string, new_string }` edits
- Validate all edits before applying any (atomic — all succeed or none do)
- Report per-file results back to the model
- Mark as `dangerous: true` (requires approval)
- Show a summary diff in the approval prompt

## Technical Notes

- Reuse the existing `edit_file` logic internally
- Validation pass: check all `old_string` matches exist before writing
- Rollback: if any edit fails mid-apply, revert already-applied changes
- Could also support mixed operations (edit + create + delete)

## Files to Modify

- `src/tools/multi-edit.ts` — new tool implementation
- `src/tools/registry.ts` — register the new tool
- `src/agent.ts` or system prompt — mention the tool's availability

## Acceptance Criteria

- [ ] Model can edit multiple files in a single tool call
- [ ] Edits are atomic — partial application is rolled back
- [ ] Approval prompt shows all affected files
- [ ] Reduces turn count for multi-file refactoring tasks
