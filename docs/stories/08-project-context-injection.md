# Story 08: Project Context Injection

**Phase:** 2 — Better Tool Intelligence
**Priority:** High | **Effort:** Small

## Problem

The agent starts every session with zero knowledge about the project. It doesn't know the tech stack, conventions, or file structure until it reads files manually.

## Solution

Auto-detect and inject project context files (like `CLAUDE.md`, `AGENTS.md`, or `CONTEXT.md`) into the system prompt on startup.

## Requirements

- On startup, look for context files in the working directory (in order of priority):
  - `CLAUDE.md`
  - `AGENTS.md`
  - `CONTEXT.md`
  - `.agent/context.md`
- Append the file contents to the system prompt
- Cap injected context to prevent exceeding limits (e.g., first 4000 chars)
- Log which context file was loaded (visible in StatusBar or startup message)

## Technical Notes

- This is ~20 lines of code in `config.ts`
- Read the file, truncate if needed, append to `getSystemPrompt()`
- The project itself has a `CLAUDE.md` that can serve as a test case

## Files to Modify

- `src/config.ts` — detect and read context files, append to system prompt

## Acceptance Criteria

- [ ] Agent automatically reads `CLAUDE.md` (or equivalent) on startup
- [ ] Context appears in the system prompt sent to the model
- [ ] Works when no context file exists (graceful no-op)
- [ ] Large files are truncated to prevent context window waste
