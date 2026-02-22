# Story 14: Plugin System

**Phase:** 4 — Architecture Upgrades
**Priority:** Medium | **Effort:** Large

## Problem

Adding new tools or hooks requires modifying the core codebase. Users and contributors can't extend the agent without forking.

## Solution

A plugin system that lets users drop TypeScript files into a directory to register custom tools, hooks, and commands.

## Requirements

- Scan a `plugins/` directory (or `~/.coding-agent/plugins/`) on startup
- Each plugin exports a standard interface: `{ tools?, hooks?, commands? }`
- Plugins can register new tools that appear alongside built-in ones
- Plugins can register hooks that run in the hook pipeline
- Plugins can register slash commands (depends on Story #2)
- Plugin errors are isolated — a broken plugin doesn't crash the agent

## Technical Notes

- Use dynamic `import()` to load plugin files
- Define a `Plugin` interface in `types.ts`
- Consider a plugin manifest (`plugin.json`) for metadata (name, version, description)
- Plugins get a context object with access to `cwd`, config, and utility functions

## Files to Modify

- `src/plugins/` — new directory: loader, types, error isolation
- `src/types.ts` — add `Plugin` interface
- `src/tools/registry.ts` — support plugin tool registration
- `src/hooks/manager.ts` — support plugin hook registration
- `src/index.tsx` — load plugins on startup

## Acceptance Criteria

- [ ] Plugins in `plugins/` are loaded automatically on startup
- [ ] Plugin tools work identically to built-in tools
- [ ] Plugin errors are caught and logged without crashing
- [ ] At least one example plugin is provided
