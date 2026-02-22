# Future Architecture

How the system evolves across the roadmap phases. See [architecture.md](architecture.md) for the current design.

## Current → Future: High-Level Overview

```
                          CURRENT                                        FUTURE
                          -------                                        ------

  .env                                                .env / .mcp.json / CLAUDE.md / plugins/
   |                                                       |         |         |         |
   v                                                       v         v         v         v
loadConfig()                                          loadConfig()   |    loadContext()   |
   |                                                       |         |         |         |
   v                                                       v         v         v         v
AgentConfig ──> createModel() ──> single provider     AgentConfig    |    system prompt   |
                                                           |         |    injection       |
                                                           v         v         |          v
                                                      createModel()  |         |    loadPlugins()
                                                           |         |         |          |
                                                    +------+---------+---------+----------+
                                                    |      |         |         |          |
                                                    v      v         v         v          v
                                                 <App config model tools context plugins />
```

## Phase 1: Session & Context Management

### Session Persistence Flow

```
                         Session Lifecycle
                         -----------------

  Agent Start                                           Agent Exit
      |                                                     |
      v                                                     v
  SessionManager.init()                              SessionManager.save()
      |                                                     |
      v                                                     |
  ~/.coding-agent/sessions/                                 |
  exists?                                                   |
      |           |                                         |
     yes          no                                        |
      |           |                                         |
      v           v                                         v
  "Resume last    Start fresh               Serialize SessionState
   session?" ──>  (empty history)           to timestamped JSON
      |                                         |
      v                                         v
  Load & deserialize                    ~/.coding-agent/sessions/
  SessionState                            2026-02-22T03-15-00.json
      |                                         |
      v                                         v
  Restore messages,                     Prune if > 20 sessions
  displayMessages,                      (delete oldest)
  tokenUsage
```

### Slash Command Architecture

```
User input: "/model qwen3:30b"
        |
        v
   starts with "/"?
        |           |
       yes          no
        |           |
        v           v
  CommandRegistry   Send to model
  .execute(input)   (existing flow)
        |
        v
  Parse: name="model"
         args=["qwen3:30b"]
        |
        v
  commandMap.get("model")
        |
        v
  CommandHandler(args, appState)
        |
        v
  Update model in-place,
  show confirmation in TUI

CommandRegistry
    |
    +-- commands: Map<string, Command>
    |
    +-- register(cmd)
    +-- execute(input) -> CommandResult
    +-- listAll() -> Command[]

Built-in Commands
    |
    +-- /help         List commands
    +-- /clear        Reset conversation
    +-- /compact      Trigger compaction (Phase 1)
    +-- /model <id>   Switch model
    +-- /cost         Show token costs
    +-- /save         Save session (Phase 1)
    +-- /load <name>  Load session (Phase 1)
    +-- /sessions     List saved sessions (Phase 1)
    +-- /undo [N]     Revert changes (Phase 2)
    +-- /exit         Quit
```

### Context Window Management

```
                    Token Budget Management
                    -----------------------

  Before each streamText() call:
        |
        v
  ContextManager.check(messages, maxTokens)
        |
        v
  estimateTokens(messages)
        |
        v
  usage > threshold (80%)?
        |              |
       yes             no
        |              |
        v              v
  AUTO-COMPACT       proceed
        |
        v
  +------------------------------------------+
  |  Split messages:                          |
  |                                           |
  |  [msg1, msg2, ..., msgN-5]  [msgN-4...]   |
  |   ^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^   |
  |        old (to summarize)    recent       |
  |              |               (keep)       |
  |              v                            |
  |  Send to model:                           |
  |  "Summarize this conversation so far"     |
  |              |                            |
  |              v                            |
  |  Replace old messages with summary        |
  |              |                            |
  |              v                            |
  |  [summary_msg, msgN-4, ..., msgN]         |
  |                                           |
  +------------------------------------------+
        |
        v
  Notify user: "Compacted conversation
  (12 messages → summary + 5 recent)"
```

## Phase 2: Smarter Tools

### Enhanced Tool Registry

```
                      Tool Registry (Future)
                      ---------------------

  src/tools/
    |
    +-- registry.ts           Creates Map<string, ToolDefinition>
    |
    +-- read.ts               read_file       (safe)
    +-- glob.ts               glob            (safe)
    +-- grep.ts               grep            (safe)
    +-- tree.ts          NEW  tree            (safe)      <-- Story #7
    +-- write.ts              write_file      (dangerous)
    +-- edit.ts               edit_file       (dangerous)
    +-- multi-edit.ts    NEW  multi_edit      (dangerous) <-- Story #5
    +-- bash.ts               bash            (dangerous)

  + MCP tools (dynamic)       mcp_*           (dangerous) <-- Story #13
  + Plugin tools (dynamic)    plugin_*        (varies)    <-- Story #14
```

### Project Context Injection

```
  Agent startup
       |
       v
  loadConfig()
       |
       v
  getSystemPrompt()
       |
       v
  detectContextFile(cwd)
       |
       v
  Search in order:
    1. CLAUDE.md
    2. AGENTS.md
    3. CONTEXT.md
    4. .agent/context.md
       |
       v
  Found? ──no──> return base prompt
       |
      yes
       |
       v
  Read file (cap at 4000 chars)
       |
       v
  Append to system prompt:
  ┌─────────────────────────────┐
  │ base system prompt          │
  │ ...                         │
  │                             │
  │ ## Project Context          │
  │ (from CLAUDE.md)            │
  │                             │
  │ <contents of CLAUDE.md>     │
  └─────────────────────────────┘
```

### Undo System

```
                          Undo Stack
                          ----------

  Before tool execution:

  write_file("src/model.ts", newContent)
        |
        v
  UndoManager.snapshot("src/model.ts")
        |
        v
  Store: { path, originalContent, timestamp, toolCallId }
        |
        v
  Execute tool normally
        |
        v
  Push to undo stack

  Undo stack (LIFO):
  ┌─────────────────────────────────────┐
  │  [3] edit_file  src/types.ts        │  <-- /undo pops this
  │  [2] write_file src/new-feature.ts  │
  │  [1] edit_file  src/config.ts       │
  └─────────────────────────────────────┘

  /undo command:
        |
        v
  Pop latest entry
        |
        v
  Show diff: "Revert src/types.ts?"
        |
        v
  Confirm? ──no──> cancel
        |
       yes
        |
        v
  Restore originalContent to file
```

## Phase 3: Enhanced TUI

### Component Tree (Future)

```
<App>                              State machine + agent orchestration
  |
  +-- <StatusBar />                Model name + tokens + turn progress
  |     |
  |     +-- model: "qwen3-coder-next"
  |     +-- tokens: "12.4k"
  |     +-- turn: "Turn 3/40"          <-- Story #12
  |     +-- status: "⟳ Running bash"   <-- Story #12
  |
  +-- <MessageList />              Scrollable conversation display
  |     |
  |     +-- <UserMessage />
  |     +-- <AssistantMessage />
  |     |     +-- markdown rendering
  |     |     +-- syntax highlighting
  |     |
  |     +-- <ToolCallGroup />          <-- Story #10
  |     |     +-- collapsed: "▶ read_file: src/model.ts (25 lines)"
  |     |     +-- expanded:  "▼ read_file: src/model.ts"
  |     |     |                [full content with syntax highlighting]
  |     |     +-- <DiffView />         <-- Story #9
  |     |           [colored unified diff]
  |     |
  |     +-- <StreamingText />
  |
  +-- <InputBar />                 Text input + history navigation
  |     +-- Up/Down: input history     <-- Story #11
  |     +-- Ctrl+C: cancel generation  <-- Story #11
  |     +-- Ctrl+L: clear screen       <-- Story #11
  |       or
  +-- <ApprovalPrompt />           y/n prompt for dangerous tools
```

### Keyboard Shortcut Map

```
                     Input Handling
                     --------------

  Raw keypress
       |
       v
  useInput(input, key)
       |
       +-- key.ctrl + "c" ──> AbortController.abort()
       |                       Cancel agent loop
       |
       +-- key.ctrl + "l" ──> clearDisplay()
       |                       Redraw screen
       |
       +-- key.escape ──────> dismissPrompt() / clearInput()
       |
       +-- key.upArrow ─────> inputHistory.prev()
       |
       +-- key.downArrow ───> inputHistory.next()
       |
       +-- key.return ──────> handleSubmit(input)
       |                           |
       |                           v
       |                      starts with "/"?
       |                           |        |
       |                          yes       no
       |                           |        |
       |                           v        v
       |                      CommandRegistry  Agent loop
       |
       +-- (other) ─────────> appendToInput(char)

  InputHistory (ring buffer):
  ┌─────────────────────────────────┐
  │  [0] "Read src/model.ts"        │
  │  [1] "Fix the type error"       │
  │  [2] "/model qwen3:30b"         │
  │  cursor: -1 (current input)     │
  └─────────────────────────────────┘
```

## Phase 4: Extensibility Architecture

### MCP Integration

```
                         MCP Architecture
                         ----------------

  .mcp.json                             Agent startup
  ┌────────────────────────┐                 |
  │ {                      │                 v
  │   "servers": {         │          MCPClientManager.init()
  │     "sqlite": {        │                 |
  │       "transport":     │                 v
  │         "stdio",       │      For each server in .mcp.json:
  │       "command":       │                 |
  │         "mcp-sqlite",  │        +--------+--------+
  │       "args": [        │        |                 |
  │         "mydb.sqlite"  │        v                 v
  │       ]                │    stdio transport   SSE transport
  │     },                 │        |                 |
  │     "browser": {       │        v                 v
  │       "transport":     │    Spawn process    Connect to URL
  │         "sse",         │        |                 |
  │       "url": "http://  │        +--------+--------+
  │         localhost:3001" │                 |
  │     }                  │                 v
  │   }                    │         MCPClient.listTools()
  │ }                      │                 |
  └────────────────────────┘                 v
                                   Convert MCP tools to ToolDefinition
                                             |
                                             v
                                   Register in ToolRegistry
                                   alongside built-in tools

  Tool Execution (MCP):
  ┌──────────────────────────────────────────────────┐
  │  Model calls "mcp_sqlite_query"                  │
  │       |                                          │
  │       v                                          │
  │  MCPToolAdapter.execute(input)                   │
  │       |                                          │
  │       v                                          │
  │  MCPClient.callTool("query", input)              │
  │       |                                          │
  │       v                                          │
  │  MCP server executes + returns result            │
  │       |                                          │
  │       v                                          │
  │  Wrap in ToolResult { output, data }             │
  └──────────────────────────────────────────────────┘
```

### Plugin System

```
                       Plugin Architecture
                       -------------------

  plugins/                            ~/.coding-agent/plugins/
    |                                        |
    +-- my-tool.ts                          +-- shared-tool.ts
    +-- custom-hook.ts                      |
    |                                        |
    +--------------------+-------------------+
                         |
                         v
                   PluginLoader.scan()
                         |
                         v
                   For each .ts file:
                         |
                         v
                   dynamic import()
                         |
                         v
                   Validate exports
                         |
                         v
              ┌──────────+──────────┐
              |          |          |
              v          v          v
           tools?     hooks?    commands?
              |          |          |
              v          v          v
         ToolRegistry  HookMgr  CommandRegistry
         .register()   .register() .register()

  Plugin Interface:
  ┌─────────────────────────────────────────┐
  │  export default {                       │
  │    name: "my-plugin",                   │
  │    version: "1.0.0",                    │
  │                                         │
  │    tools?: ToolDefinition[],            │
  │    hooks?: Hook[],                      │
  │    commands?: Command[],                │
  │                                         │
  │    init?(ctx: PluginContext): void,      │
  │    cleanup?(): void,                    │
  │  }                                      │
  └─────────────────────────────────────────┘

  Error Isolation:
  ┌─────────────────────────────────────────┐
  │  try {                                  │
  │    const plugin = await import(path);   │
  │    registerPlugin(plugin);              │
  │  } catch (err) {                        │
  │    log.warn(`Plugin failed: ${path}`);  │
  │    // agent continues without plugin    │
  │  }                                      │
  └─────────────────────────────────────────┘
```

### Parallel Tool Execution

```
                  Sequential (Current)          Parallel (Future)
                  --------------------          -----------------

  Model returns 3 tool calls:         Model returns 3 tool calls:
    [read A, read B, read C]            [read A, read B, read C]
         |                                   |
         v                              All safe? ──no──> sequential
    execute(read A)                          |              (with approval)
         |                                  yes
         v                                   |
    execute(read B)                          v
         |                              Promise.all([
         v                                execute(read A),
    execute(read C)                        execute(read B),
         |                                execute(read C),
         v                              ])
    ~3x latency                              |
                                             v
                                        ~1x latency

  Mixed (safe + dangerous):
  ┌─────────────────────────────────────────────┐
  │  [read A, read B, bash "npm test"]          │
  │       |                                     │
  │       v                                     │
  │  Partition:                                 │
  │    safe:      [read A, read B]              │
  │    dangerous: [bash "npm test"]             │
  │       |                                     │
  │       v                                     │
  │  1. Promise.all(safe tools)   ← parallel    │
  │  2. Approve + execute(bash)   ← sequential  │
  │       |                                     │
  │       v                                     │
  │  Merge results in original order            │
  └─────────────────────────────────────────────┘
```

### Agent-as-Library: Package Architecture

```
                     Monorepo Structure
                     ------------------

  build-your-own-coding-agent/
    |
    +-- packages/
    |     |
    |     +-- core/                    @coding-agent/core
    |     |     +-- src/
    |     |     |     +-- agent.ts          Agent loop (async generator)
    |     |     |     +-- tools/            Built-in tools
    |     |     |     +-- hooks/            Hook pipeline
    |     |     |     +-- config.ts         Config loading
    |     |     |     +-- types.ts          All shared types
    |     |     |     +-- context.ts        Context management
    |     |     |     +-- session.ts        Session persistence
    |     |     |     +-- index.ts          Public API
    |     |     +-- package.json
    |     |
    |     +-- cli/                     @coding-agent/cli
    |           +-- src/
    |           |     +-- index.tsx         Entry point
    |           |     +-- app.tsx           Ink App component
    |           |     +-- components/       TUI components
    |           |     +-- markdown.ts       Markdown rendering
    |           +-- package.json
    |
    +-- package.json                   Workspace root

  Public API (core):
  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │  import { createAgent } from "@coding-agent/core";
  │                                                 │
  │  const agent = createAgent({                    │
  │    provider: "ollama",                          │
  │    modelId: "qwen3-coder-next",                 │
  │    tools: defaultTools(),                       │
  │    cwd: process.cwd(),                          │
  │  });                                            │
  │                                                 │
  │  // Headless usage:                             │
  │  for await (const event of agent.run(messages)) │
  │  {                                              │
  │    switch (event.type) {                        │
  │      case "text-delta":                         │
  │        process.stdout.write(event.text);        │
  │      case "tool-call":                          │
  │        console.log(`Tool: ${event.toolName}`);  │
  │      case "finish":                             │
  │        console.log(`Tokens: ${event.usage}`);   │
  │    }                                            │
  │  }                                              │
  │                                                 │
  └─────────────────────────────────────────────────┘
```

## Full Future Data Flow

```
                            Complete System (Post-Roadmap)
                            =============================

  ┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐
  │ .env        │  │ .mcp.json│  │ CLAUDE.md  │  │ plugins/ │
  └──────┬──────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘
         │              │              │              │
         v              │              v              │
    loadConfig()        │      loadContext()          │
         │              │         (inject into        │
         v              │          system prompt)     │
    AgentConfig         │              │              v
         │              │              │       loadPlugins()
         │              v              │              │
         │      MCPClientManager       │              │
         │       .init(config)         │              │
         │              │              │              │
         v              v              v              v
    createModel()   MCP tools    system prompt    plugin tools
         │              │              │         plugin hooks
         │              │              │         plugin cmds
         │              v              │              │
         │       ToolRegistry <--------+--------------+
         │       (built-in + MCP + plugin)
         │              │
         v              v
  ┌─────────────────────────────────────────────────────────┐
  │                     <App>                               │
  │                                                         │
  │  ┌──────────────────────────────────────────────────┐   │
  │  │              Agent Loop                          │   │
  │  │                                                  │   │
  │  │  User input ──> "/" ? ──yes──> CommandRegistry    │   │
  │  │       │                                          │   │
  │  │       no                                         │   │
  │  │       │                                          │   │
  │  │       v                                          │   │
  │  │  ContextManager.check()                          │   │
  │  │  (auto-compact if needed)                        │   │
  │  │       │                                          │   │
  │  │       v                                          │   │
  │  │  streamText({ model, messages, tools })          │   │
  │  │       │                                          │   │
  │  │       v                                          │   │
  │  │  yield AgentEvent ──> TUI renders                │   │
  │  │       │                                          │   │
  │  │       v                                          │   │
  │  │  Tool calls? ──> UndoManager.snapshot()          │   │
  │  │       │          HookManager.run()               │   │
  │  │       │          execute (parallel if safe)      │   │
  │  │       │                                          │   │
  │  │       v                                          │   │
  │  │  Loop or finish                                  │   │
  │  └──────────────────────────────────────────────────┘   │
  │                                                         │
  │  ┌────────────┐  ┌────────────────┐  ┌──────────────┐   │
  │  │ StatusBar   │  │ MessageList    │  │ InputBar     │   │
  │  │ model+turn  │  │ collapsible    │  │ history      │   │
  │  │ progress    │  │ diff views     │  │ shortcuts    │   │
  │  └────────────┘  └────────────────┘  └──────────────┘   │
  │                                                         │
  │  SessionManager: auto-save on exit, restore on start    │
  └─────────────────────────────────────────────────────────┘
```
