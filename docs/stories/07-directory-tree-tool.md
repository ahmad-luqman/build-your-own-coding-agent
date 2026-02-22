# Story 07: Directory Tree Tool

**Phase:** 2 — Better Tool Intelligence
**Priority:** Medium | **Effort:** Small

## Problem

Models frequently need to understand project structure. Currently they glob for `**/*`, then read individual files — wasting 3-4 turns to build a mental map.

## Solution

Add a `tree` tool that returns a structured directory listing in one call.

## Requirements

- Return a tree-formatted directory listing (like the `tree` command)
- Support depth limit parameter (default: 3 levels)
- Support path parameter (default: cwd)
- Respect `.gitignore` patterns (skip `node_modules`, `.git`, etc.)
- Include file sizes and counts per directory
- Not marked as dangerous (read-only)

## Technical Notes

- Use `fs.readdir` with `recursive: true` or walk manually
- Parse `.gitignore` with a library like `ignore` or shell out to `git ls-files`
- Return structured data for the model, formatted tree for the human display

## Files to Modify

- `src/tools/tree.ts` — new tool implementation
- `src/tools/registry.ts` — register the tool
- `src/config.ts` — update system prompt to mention the tool

## Acceptance Criteria

- [ ] Model can get project structure in a single tool call
- [ ] Output respects `.gitignore`
- [ ] Depth is configurable
- [ ] File counts and sizes are included
