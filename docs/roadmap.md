# Roadmap

A phased plan to evolve the coding agent from a working demo into a daily-driver tool.

See [future-architecture.md](future-architecture.md) for detailed ASCII diagrams of how each phase changes the system architecture.

## Phase 1: Make It Actually Useful Day-to-Day

These close the gap between "demo" and "tool I reach for."

| # | Story | Priority | Effort |
|---|-------|----------|--------|
| 1 | [Session Persistence](stories/01-session-persistence.md) | High | Medium |
| 2 | [Slash Commands](stories/02-slash-commands.md) | High | Small |
| 3 | [Context Window Management](stories/03-context-window-management.md) | High | Medium |
| 4 | [Streaming Tool Output](stories/04-streaming-tool-output.md) | Medium | Medium |

## Phase 2: Better Tool Intelligence

Reduce wasted turns and make tools smarter.

| # | Story | Priority | Effort |
|---|-------|----------|--------|
| 5 | [Multi-File Edit](stories/05-multi-file-edit.md) | Medium | Medium |
| 6 | [Undo / Rollback](stories/06-undo-rollback.md) | Medium | Medium |
| 7 | [Directory Tree Tool](stories/07-directory-tree-tool.md) | Medium | Small |
| 8 | [Project Context Injection](stories/08-project-context-injection.md) | High | Small |

## Phase 3: UX Polish

Make the terminal experience feel polished.

| # | Story | Priority | Effort |
|---|-------|----------|--------|
| 9 | [Syntax-Highlighted Diffs](stories/09-syntax-highlighted-diffs.md) | Low | Medium |
| 10 | [Tool Call Collapsing](stories/10-tool-call-collapsing.md) | Low | Medium |
| 11 | [Keyboard Shortcuts](stories/11-keyboard-shortcuts.md) | Medium | Small |
| 12 | [Progress Indicator](stories/12-progress-indicator.md) | Medium | Small |

## Phase 4: Architecture Upgrades

Enable extensibility and advanced patterns.

| # | Story | Priority | Effort |
|---|-------|----------|--------|
| 13 | [MCP Support](stories/13-mcp-support.md) | Medium | Large |
| 14 | [Plugin System](stories/14-plugin-system.md) | Medium | Large |
| 15 | [Parallel Tool Calls](stories/15-parallel-tool-calls.md) | Medium | Small |
| 16 | [Agent-as-Library](stories/16-agent-as-library.md) | Low | Large |

## Suggested Order

Start with high-impact, low-effort items:

1. **#8 Project Context Injection** — small change, immediate quality boost
2. **#2 Slash Commands** — foundational for many other features
3. **#1 Session Persistence** — highest QoL improvement
4. **#3 Context Window Management** — prevents crashes on long sessions
5. **#7 Directory Tree Tool** — saves model turns
6. Then pick from Phase 2-4 based on what you need most.
