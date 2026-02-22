# Roadmap

A phased plan to evolve the coding agent from a working demo into a daily-driver tool.

See [future-architecture.md](future-architecture.md) for detailed ASCII diagrams of how each phase changes the system architecture.

## Completed

| # | Story | PR |
|---|-------|----|
| 1 | [Session Persistence](stories/01-session-persistence.md) | Merged |
| 2 | [Slash Commands](stories/02-slash-commands.md) | Merged (#18) |
| 3 | [Context Window Management](stories/03-context-window-management.md) | Merged (#23) |

## Open Stories

| # | Story | Issue | Priority | Effort |
|---|-------|-------|----------|--------|
| 4 | [Streaming Tool Output](stories/04-streaming-tool-output.md) | [#4](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/4) | Medium | Medium |
| 5 | [Multi-File Edit](stories/05-multi-file-edit.md) | [#5](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/5) | Medium | Medium |
| 6 | [Undo / Rollback](stories/06-undo-rollback.md) | [#6](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/6) | Medium | Medium |
| 7 | [Directory Tree Tool](stories/07-directory-tree-tool.md) | [#7](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/7) | Medium | Small |
| 8 | [Project Context Injection](stories/08-project-context-injection.md) | [#8](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/8) | High | Small |
| 9 | [Syntax-Highlighted Diffs](stories/09-syntax-highlighted-diffs.md) | [#9](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/9) | Low | Medium |
| 10 | [Tool Call Collapsing](stories/10-tool-call-collapsing.md) | [#10](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/10) | Low | Medium |
| 11 | [Keyboard Shortcuts](stories/11-keyboard-shortcuts.md) | [#11](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/11) | Medium | Small |
| 12 | [Progress Indicator](stories/12-progress-indicator.md) | [#12](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/12) | Medium | Small |
| 13 | [MCP Support](stories/13-mcp-support.md) | [#13](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/13) | Medium | Large |
| 14 | [Plugin System](stories/14-plugin-system.md) | [#14](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/14) | Medium | Large |
| 15 | [Parallel Tool Calls](stories/15-parallel-tool-calls.md) | [#15](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/15) | Medium | Small |
| 16 | [Agent-as-Library](stories/16-agent-as-library.md) | [#16](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/16) | Low | Large |
| — | Medium-term project memory | [#19](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/19) | Medium | Medium |
| — | Long-term user preferences & knowledge | [#20](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/20) | Low | Large |
| — | Learning from mistakes | [#21](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/21) | Low | Large |

## Implementation Order

Ordered by dependency chains and impact. Items in the same tier are independent and can be worked in parallel.

### Tier 1: Quick wins, no dependencies

These are small, self-contained, and immediately improve the agent experience.

| Order | Issue | Rationale |
|-------|-------|-----------|
| 1 | [#12 Progress indicator](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/12) | Small scope, immediate UX win — users can see turn count and active tool |
| 2 | [#7 Directory tree tool](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/7) | Single read-only tool, saves 3-4 wasted turns per session |
| 3 | [#8 Project context injection](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/8) | Simple file read on startup, huge impact on agent usefulness |

### Tier 2: Core UX improvements

Better terminal interaction. #11 (cancel) should come before #4 (streaming) since cancel makes streaming useful.

| Order | Issue | Rationale |
|-------|-------|-----------|
| 4 | [#11 Keyboard shortcuts](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/11) | Essential UX — Ctrl+C cancel, input history, Ctrl+L clear |
| 5 | [#4 Streaming bash output](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/4) | Needs cancel support (#11) for best experience |
| 6 | [#10 Collapsible tool results](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/10) | TUI improvement, keeps conversation readable |
| 7 | [#9 Syntax-highlighted diffs](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/9) | TUI polish, pairs well with collapsible results (#10) |

### Tier 3: Power features

New capabilities that make the agent more effective at complex tasks.

| Order | Issue | Rationale |
|-------|-------|-----------|
| 8 | [#5 Multi-file edit tool](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/5) | Atomic multi-file edits, reduces turn count for refactors |
| 9 | [#6 Undo/rollback](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/6) | File snapshot infra, pairs with multi-edit (#5) |
| 10 | [#15 Parallel tool calls](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/15) | Agent loop change, benefits from stable tool set |

### Tier 4: Memory system

Builds on compaction (#3) and context injection (#8). Each layer feeds the next.

| Order | Issue | Rationale |
|-------|-------|-----------|
| 11 | [#19 Medium-term project memory](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/19) | Builds on #8 (context injection) and #3 (compaction summaries) |
| 12 | [#20 Long-term user preferences](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/20) | Reuses #19's storage patterns, adds global layer |
| 13 | [#21 Learning from mistakes](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/21) | Needs stable tool/hook system to capture error-resolution pairs |

### Tier 5: Architecture upgrades

Major refactors best done when the feature set is stable.

| Order | Issue | Rationale |
|-------|-------|-----------|
| 14 | [#14 Plugin system](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/14) | Extension mechanism — best after tool set is settled |
| 15 | [#13 MCP support](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/13) | External tool servers, depends on clean plugin/tool architecture |
| 16 | [#16 Agent-as-library](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/16) | Major refactor into monorepo, best done last when APIs are settled |

### Dependency Graph

```
#12 Progress ─┐
#7  Tree ─────┤ (independent, Tier 1)
#8  Context ──┤
              │
#11 Keyboard ─┤
  └─► #4 Streaming (needs cancel)
#10 Collapse ─┤ (independent, Tier 2)
  └─► #9 Diffs (pairs with collapse)
              │
#5  Multi-edit┤
  └─► #6 Undo (pairs with multi-edit)
#15 Parallel ─┤ (Tier 3)
              │
#8 ─► #19 Project memory ─► #20 User prefs ─► #21 Learning (Tier 4)
#3 ──┘
              │
#14 Plugins ─► #13 MCP ─► #16 Agent-as-library (Tier 5)
```
