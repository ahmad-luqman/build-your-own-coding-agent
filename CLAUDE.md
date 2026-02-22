# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI coding agent built with Bun, Ink (React-based terminal UI), and AI SDK v6. It connects to LLMs via OpenRouter and provides an interactive terminal interface where users can chat with an AI that has access to file system and shell tools.

## Commands

```bash
bun run start          # Run the agent
bun run dev            # Run with --watch (auto-reload on changes)
bun install            # Install dependencies
```

### Code Quality

```bash
bun run lint           # Biome lint + format check
bun run lint:fix       # Auto-fix lint/format issues
bun run format         # Format files with Biome
bun run typecheck      # TypeScript type checking (tsc --noEmit)
bun test               # Run unit tests (Bun built-in runner)
bun test --coverage    # Run tests with coverage report
bun run check          # Full quality gate: lint + typecheck + test
```

## Environment Setup

Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`. Optionally set `MODEL_ID` (defaults to `anthropic/claude-sonnet-4-20250514`).

## Architecture

### Entry & Wiring (`src/index.tsx`)
Loads config, creates the OpenRouter model, builds the tool registry, and renders the Ink `<App>` component.

### Agent Loop (`src/agent.ts`)
`runAgent()` is an async generator that implements a multi-turn agentic loop. It calls `streamText()` from AI SDK, yields `AgentEvent` discriminated union events (text-delta, tool-call, tool-result, finish, error), appends response messages to history, and loops until the model stops calling tools or hits `maxTurns` (40).

### Tool System (`src/tools/`)
Tools are defined as `ToolDefinition` objects (in `src/types.ts`) with a Zod `inputSchema` and an `execute` function. Each tool returns a `ToolResult` with both a human-readable `output` (for TUI display) and an optional `data` field (structured data sent back to the model).

The registry (`src/tools/registry.ts`) collects tools into a `Map<string, ToolDefinition>`. Tools marked `dangerous: true` (bash, write_file, edit_file) require user approval before execution.

### Hook System (`src/hooks/`)
`HookManager` runs registered hooks sequentially for events like `pre-tool-use`. The `dangerous-command-guard` hook intercepts dangerous tools and prompts for user approval via the TUI. It also checks bash commands against regex patterns for especially dangerous operations (rm -rf /, force push, sudo, etc.).

### TUI Components (`src/components/`)
Ink/React components: `App` (main state machine), `StatusBar` (model name + token usage), `MessageList` (conversation display with markdown rendering), `InputBar` (text input with loading state), `ApprovalPrompt` (y/n prompt for dangerous tools).

### Key Types (`src/types.ts`)
Central type definitions: `AgentEvent` (discriminated union for stream events), `ToolDefinition`, `ToolResult`, `Hook`/`HookDecision`, `AgentConfig`, `DisplayMessage`, `TokenUsage`.

## Testing

- **Runner**: Bun's built-in test runner (`bun test`)
- **Location**: Co-located `__tests__/` directories next to source (e.g., `src/__tests__/`, `src/hooks/__tests__/`)
- **API**: Import from `"bun:test"` — `describe`, `test`, `expect`, `mock`, `beforeEach`, `afterEach`
- **Naming**: `*.test.ts` files
- **Strategy**: Test pure logic (config, model factory, hooks, tool execute functions). UI components and AI SDK integration are not unit-tested.

## CI / Git Hooks

- **CI**: GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, and test on push to `main` and all PRs
- **Pre-commit**: Lefthook runs `biome check --staged` and `tsc --noEmit`
- **Pre-push**: Lefthook runs `bun test`
- **Setup**: Git hooks install automatically via `prepare` script on `bun install`

## Conventions

- All imports use `.js` extensions (ESM with bundler resolution)
- Node.js built-in imports use `node:` protocol (e.g., `node:fs/promises`, `node:path`)
- Bun APIs used directly (e.g., `Bun.spawn` in bash tool)
- Tool `execute` functions receive `(input, ctx: ToolContext)` where `ctx.cwd` is the working directory
- React components use function declarations, not arrow functions
- Code is formatted with Biome (2-space indent, double quotes, 100 line width)
