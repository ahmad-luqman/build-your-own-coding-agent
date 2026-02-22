# Story 09: Syntax-Highlighted Diffs

**Phase:** 3 — UX Polish
**Priority:** Low | **Effort:** Medium

## Problem

When `edit_file` or `write_file` runs, the TUI shows a plain text summary ("Wrote 42 lines to src/model.ts"). There's no visibility into what actually changed.

## Solution

Show a colored unified diff in the TUI after each file modification.

## Requirements

- After `edit_file`: show a unified diff of the change (red/green for removed/added lines)
- After `write_file` on an existing file: show a diff against the previous content
- After `write_file` on a new file: show the full content as "added"
- Diffs should be syntax-highlighted for the file's language
- Long diffs should be truncated with a "N more lines" indicator

## Technical Notes

- Use a diffing library (`diff` npm package) to compute unified diffs
- Use `cli-highlight` (already a dependency) for syntax highlighting
- Capture file content before modification in the tool's execute function
- Return the diff as part of the human-readable `output` in `ToolResult`

## Files to Modify

- `src/tools/edit.ts` — capture before-state, compute and display diff
- `src/tools/write.ts` — same
- `src/components/MessageList.tsx` — render diff output with colors

## Acceptance Criteria

- [ ] File edits show a colored diff in the TUI
- [ ] File creates show added content
- [ ] Diffs are syntax-highlighted
- [ ] Long diffs are truncated gracefully
