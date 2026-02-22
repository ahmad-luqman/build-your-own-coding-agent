# Story 06: Undo / Rollback

**Phase:** 2 — Better Tool Intelligence
**Priority:** Medium | **Effort:** Medium

## Problem

When the model makes a mistake (bad edit, wrong file overwrite), there's no way to undo it without manually restoring the file.

## Solution

Track file changes per turn and provide an `/undo` command to revert the last modification.

## Requirements

- Before any file-modifying tool (write_file, edit_file, bash with writes), snapshot the affected files
- `/undo` reverts the most recent file changes
- `/undo N` reverts the last N sets of changes
- Show what will be reverted before applying
- Support undo stack (multiple levels)

## Technical Notes

- Option A: Store file snapshots in memory (simple, lost on exit)
- Option B: Use git stash/commits under the hood (persistent, leverages existing VCS)
- Option C: Store diffs (memory-efficient)
- Consider integrating with session persistence (Story #1) to survive restarts

## Files to Modify

- `src/undo.ts` — new file: snapshot/restore logic
- `src/tools/write.ts`, `src/tools/edit.ts` — add pre-execution snapshots
- `src/commands/undo.ts` — `/undo` command (depends on Story #2)

## Acceptance Criteria

- [ ] File state is captured before each modifying tool call
- [ ] `/undo` reverts the last set of file changes
- [ ] Multiple undo levels are supported
- [ ] User sees what will be reverted before confirming
