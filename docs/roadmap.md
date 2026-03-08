# Roadmap

A phased plan to evolve the coding agent from a working demo into a daily-driver tool.

See [future-architecture.md](future-architecture.md) for detailed ASCII diagrams of how each phase changes the system architecture.

## Completed

| # | Story | Issue | PR |
|---|-------|-------|----|
| 1 | [Session Persistence](stories/01-session-persistence.md) | | Merged |
| 2 | [Slash Commands](stories/02-slash-commands.md) | | Merged (#18) |
| 3 | [Context Window Management](stories/03-context-window-management.md) | | Merged (#23) |
| 12 | [Progress Indicator](stories/12-progress-indicator.md) | [#12](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/12) | Merged (#24) |
| 7 | [Directory Tree Tool](stories/07-directory-tree-tool.md) | [#7](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/7) | Merged (#25) |
| 8 | [Project Context Injection](stories/08-project-context-injection.md) | [#8](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/8) | Merged (#26) |
| 11 | [Keyboard Shortcuts](stories/11-keyboard-shortcuts.md) | [#11](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/11) | Merged (#27) |
| 4 | [Streaming Tool Output](stories/04-streaming-tool-output.md) | [#4](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/4) | Merged (#28) |
| 10 | [Tool Call Collapsing](stories/10-tool-call-collapsing.md) | [#10](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/10) | Merged (#29) |
| 9 | [Syntax-Highlighted Diffs](stories/09-syntax-highlighted-diffs.md) | [#9](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/9) | Merged (#30) |
| 5 | [Multi-File Edit](stories/05-multi-file-edit.md) | [#5](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/5) | Merged (#31) |

## Open Stories

| # | Story | Issue | Priority | Effort |
|---|-------|-------|----------|--------|
| 6 | [Undo / Rollback](stories/06-undo-rollback.md) | [#6](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/6) | Medium | Medium |
| 13 | [MCP Support](stories/13-mcp-support.md) | [#13](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/13) | Medium | Large |
| 14 | [Plugin System](stories/14-plugin-system.md) | [#14](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/14) | Medium | Large |
| 15 | [Parallel Tool Calls](stories/15-parallel-tool-calls.md) | [#15](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/15) | Medium | Small |
| 16 | [Agent-as-Library](stories/16-agent-as-library.md) | [#16](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/16) | Low | Large |
| — | Medium-term project memory | [#19](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/19) | Medium | Medium |
| — | Long-term user preferences & knowledge | [#20](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/20) | Low | Large |
| — | Learning from mistakes | [#21](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/21) | Low | Large |

## Implementation Order

Ordered by dependency chains and impact. Items in the same tier are independent and can be worked in parallel.

### Tier 1: Quick wins, no dependencies ✅

| Order | Issue | Status |
|-------|-------|--------|
| 1 | [#12 Progress indicator](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/12) | ✅ Merged (#24) |
| 2 | [#7 Directory tree tool](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/7) | ✅ Merged (#25) |
| 3 | [#8 Project context injection](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/8) | ✅ Merged (#26) |

### Tier 2: Core UX improvements ✅

| Order | Issue | Status |
|-------|-------|--------|
| 4 | [#11 Keyboard shortcuts](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/11) | ✅ Merged (#27) |
| 5 | [#4 Streaming bash output](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/4) | ✅ Merged (#28) |
| 6 | [#10 Collapsible tool results](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/10) | ✅ Merged (#29) |
| 7 | [#9 Syntax-highlighted diffs](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/9) | ✅ Merged (#30) |

### Tier 3: Power features

New capabilities that make the agent more effective at complex tasks.

| Order | Issue | Status |
|-------|-------|--------|
| 8 | [#5 Multi-file edit tool](https://github.com/ahmad-luqman/build-your-own-coding-agent/issues/5) | ✅ Merged (#31) |
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
✅ #12 Progress ─┐
✅ #7  Tree ─────┤ (Tier 1 — done)
✅ #8  Context ──┤
                 │
✅ #11 Keyboard ─┤
  └─► ✅ #4 Streaming
✅ #10 Collapse ─┤ (Tier 2 — done)
  └─► ✅ #9 Diffs
                 │
✅ #5  Multi-edit┤
     └─► #6 Undo (pairs with multi-edit)
   #15 Parallel ─┤ (Tier 3)
                 │
✅ #8 ─► #19 Project memory ─► #20 User prefs ─► #21 Learning (Tier 4)
✅ #3 ──┘
                 │
   #14 Plugins ─► #13 MCP ─► #16 Agent-as-library (Tier 5)
                 │
   TodoWrite ─► Subagents ─► Background Tasks ─► Agent Teams (Tier 6)
```

---

## Comparison with learn-claude-code

Reference: [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — a 12-session progressive course on building Claude Code-like agents. Core philosophy: *"The model is the agent. Our job is to give it tools and stay out of the way."*

### What we have

| Course Session | Concept | Our Implementation |
|---|---|---|
| s01 Agent Loop | `while loop + tool dispatch` | `src/agent.ts` — async generator with `streamText()` |
| s02 Tools | Registry-based dispatch | `src/tools/registry.ts` — `Map<string, ToolDefinition>` |
| s05 Skills | Dynamic knowledge injection | `src/context/project-context.ts` — CLAUDE.md injection |
| s06 Compact | Context compression | `src/context/compactor.ts` — summary-based compaction |

Plus features the course doesn't cover: session persistence, slash commands, hook system (pre-tool-use guards), syntax-highlighted diffs, streaming tool output, collapsible tool results, multi-file atomic edits.

### What we're missing

| Course Session | Concept | Description | Effort | Priority |
|---|---|---|---|---|
| **s03 TodoWrite** | Planning tool | Agent outlines steps before acting; prevents drift on complex tasks | Small | High |
| **s04 Subagents** | Context isolation | Independent `messages[]` per subtask; keeps main conversation clean | Medium | High |
| **s07 Tasks** | Persistent task graphs | File-based CRUD with dependencies; resumable multi-step workflows | Medium | Medium |
| **s08 Background Tasks** | Async execution | Slow operations run in background while agent continues reasoning | Small | Medium |
| **s09 Agent Teams** | Multi-agent coordination | Delegate work to persistent teammates via async mailboxes | Large | Low |
| **s10 Team Protocols** | Negotiation patterns | Standardized request-response across all agent interactions | Medium | Low |
| **s11 Autonomous Agents** | Self-assigned work | Agents claim tasks from a shared board without explicit delegation | Medium | Low |
| **s12 Worktree Isolation** | Isolated file systems | Each agent works in its own git worktree; safe parallel changes | Medium | Low |

### Tier 6: Agent intelligence (future)

Inspired by the learn-claude-code curriculum. These build on a stable tool set and agent loop.

| Order | Feature | Rationale |
|-------|---------|-----------|
| 17 | **TodoWrite tool** | ~50 LOC planning tool. Forces step-by-step planning before execution. Prevents aimless drift on multi-step tasks. No dependencies. |
| 18 | **Subagents** | Independent message arrays per subtask. Pairs with #15 (parallel tool calls) for context-isolated parallel execution. |
| 19 | **Background tasks** | Async daemon threads for slow operations (large file searches, test runs). Agent continues reasoning while waiting. |
| 20 | **Agent teams** | Multi-agent coordination via persistent mailboxes. Enables delegation and parallel work across isolated worktrees (#12-style). Depends on subagents and task persistence. |
