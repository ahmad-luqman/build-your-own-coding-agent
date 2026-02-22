# Story 16: Agent-as-Library

**Phase:** 4 — Architecture Upgrades
**Priority:** Low | **Effort:** Large

## Problem

The agent loop, tool system, and hook pipeline are tightly coupled to the Ink TUI. Others who want to build different UIs (web, Electron, VS Code extension) or embed the agent in their own tools can't reuse the core logic.

## Solution

Extract the core agent logic into a standalone, UI-agnostic package that can be imported and used programmatically.

## Requirements

- Separate core (`agent`, `tools`, `hooks`, `config`) from UI (`components`, `app`)
- Export a public API: `createAgent(config)` → agent instance with `run(messages)` method
- Agent emits events (same `AgentEvent` union) that any UI can consume
- Tool registry is configurable — users can provide their own tools
- Publish as a scoped npm package (e.g., `@coding-agent/core`)

## Technical Notes

- Current architecture already has a clean separation via `AgentEvent` — the agent yields events, the UI consumes them
- Main work is untangling the approval flow — currently bridges agent ↔ React via shared Promises
- The library version should use a callback-based approval mechanism instead
- Package structure: monorepo with `packages/core` and `packages/cli`

## Files to Modify

- `packages/core/` — extracted agent, tools, hooks
- `packages/cli/` — Ink TUI that consumes core
- Root `package.json` — workspace configuration
- Build and publish scripts

## Acceptance Criteria

- [ ] Core logic works without any UI dependency
- [ ] A minimal script can `import { createAgent }` and run it headlessly
- [ ] The CLI still works, now importing from the core package
- [ ] Public API is documented with TypeScript types
- [ ] Published to npm (or ready to publish)
