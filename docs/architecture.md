# Architecture

## High-Level Overview

```
  .env                 src/index.tsx (entry point)
   |                        |
   v                        v
loadConfig()           createModel()         createToolRegistry()
   |                     |                        |
   v                     v                        v
AgentConfig         OpenRouter Provider      Map<name, ToolDefinition>
   |                     |                        |
   +---------------------+------------------------+
                         |
                         v
                  <App config model tools />
                         |
            +------------+------------+
            |            |            |
         StatusBar   MessageList   InputBar / ApprovalPrompt
```

The entry point (`src/index.tsx`) is 14 lines. It loads config from env vars, creates the OpenRouter model, builds the tool registry, and renders the Ink `<App>` component with all three as props.

## Agent Loop

The core of the system is `runAgent()` in `src/agent.ts` — an async generator that implements multi-turn agentic execution.

```
User submits message
        |
        v
  App.handleSubmit()
        |
        v
+------ runAgent(messages, options) ------+
|                                         |
|   turn = 0                              |
|       |                                 |
|       v                                 |
|   while (turn < maxTurns) {             |
|       |                                 |
|       v                                 |
|   streamText({ model, system,           |
|                messages, tools })        |
|       |                                 |
|       v                                 |
|   for await (chunk of fullStream) {     |
|       |                                 |
|       +---> yield AgentEvent            |
|       |     (text-delta, tool-call,     |
|       |      tool-result, finish,       |
|       |      error)                     |
|   }                                     |
|       |                                 |
|       v                                 |
|   Append response messages to history   |
|       |                                 |
|       v                                 |
|   finishReason === "tool-calls"?        |
|       |              |                  |
|      yes             no                 |
|       |              |                  |
|    (loop)         (break)               |
|                                         |
+-----------------------------------------+
        |
        v
  App updates display state
```

Key design: `runAgent` yields `AgentEvent` objects as a stream. The App component consumes these events and updates React state (streaming text, tool call status, token usage). The loop continues as long as the model keeps calling tools and hasn't exceeded `maxTurns` (40).

## AgentEvent Discriminated Union

```
AgentEvent
  |
  +-- { type: "text-delta",  text }
  +-- { type: "tool-call",   toolName, input, toolCallId }
  +-- { type: "tool-result", toolName, toolCallId, result: ToolResult }
  +-- { type: "finish",      usage: TokenUsage }
  +-- { type: "error",       error: Error }
```

## Tool System

```
src/tools/
  |
  +-- registry.ts        Creates Map<string, ToolDefinition>
  |
  +-- read.ts            read_file    (safe)
  +-- glob.ts            glob         (safe)
  +-- grep.ts            grep         (safe)
  +-- write.ts           write_file   (dangerous)
  +-- edit.ts            edit_file    (dangerous)
  +-- bash.ts            bash         (dangerous)
```

Each tool is a `ToolDefinition`:

```
ToolDefinition {
    name: string
    description: string
    inputSchema: z.ZodType       <-- Zod schema for validation + type inference
    dangerous?: boolean          <-- if true, requires user approval
    execute(input, ctx) -> ToolResult
}
```

### Tool Execution Flow

```
Model calls tool
       |
       v
buildAITools() wrapper
       |
       v
onPreToolUse hook? ----no----> execute(input, ctx)
       |                              |
      yes                             v
       |                        ToolResult {
       v                          success: bool
  HookManager.run()               output: string   <-- for TUI display
       |                          data?: object     <-- for model reasoning
       v                          error?: string
  allowed? --no--> return error }
       |
      yes
       |
       v
  execute(input, ctx)
       |
       v
  return result.data ?? result   <-- model gets structured data when available
```

The `buildAITools()` function in `agent.ts` wraps each `ToolDefinition` into AI SDK's `tool()` format, injecting the hook check and dual-output routing.

## Hook System

```
HookManager
    |
    +-- hooks: Hook[]
    |
    +-- register(hook)
    +-- run(event, ctx) -> HookDecision
              |
              v
        Filter hooks by event type
              |
              v
        Run sequentially (first rejection wins)
              |
              v
        { allowed: true } or { allowed: false, reason }
```

Currently one hook is registered:

```
dangerous-command-guard
    |
    +-- Is tool marked dangerous?
    |       |
    |      no ---> { allowed: true }
    |       |
    |      yes
    |       |
    |       v
    +-- Is it bash with dangerous pattern?
    |   (rm -rf /, git push --force,
    |    git reset --hard, DROP TABLE,
    |    sudo, write to /dev/sd*)
    |       |
    |       v
    +-- Request user approval via TUI
            |
            v
        ApprovalPrompt component (y/n)
            |
            v
        Promise<boolean> resolves
```

The approval flow bridges async tool execution with React UI through a Promise: the hook creates a Promise, the App component renders `ApprovalPrompt`, and the user's y/n input resolves it.

## TUI Component Tree

```
<App>                          State machine + agent orchestration
  |
  +-- <StatusBar />            Model name + cumulative token usage
  |
  +-- <MessageList />          Scrollable conversation display
  |     |                      - Markdown rendering (marked + marked-terminal)
  |     +-- user messages      - Syntax highlighting (cli-highlight)
  |     +-- assistant messages
  |     +-- tool calls & results
  |     +-- streaming text
  |
  +-- <InputBar />             Text input (shown when not awaiting approval)
  |       or
  +-- <ApprovalPrompt />       y/n prompt (shown for dangerous tool calls)
```

The `<App>` component manages:
- `messages` — `ModelMessage[]` for the AI SDK (the actual conversation history)
- `displayMessages` — `DisplayMessage[]` for rendering (includes tool call status)
- `streamingText` — in-progress assistant response
- `isLoading` — controls input vs spinner state
- `pendingApproval` — bridges hook system with approval UI
- `totalUsage` — cumulative token counts across all turns

## File Map

```
src/
  index.tsx              Entry point (14 lines)
  config.ts              loadConfig() + system prompt
  model.ts               createModel() via OpenRouter
  agent.ts               runAgent() async generator
  app.tsx                 Main App component (state machine)
  types.ts               All shared type definitions
  tools/
    registry.ts          createToolRegistry()
    read.ts              read_file tool
    glob.ts              glob tool
    grep.ts              grep tool
    write.ts             write_file tool
    edit.ts              edit_file tool
    bash.ts              bash tool (uses Bun.spawn)
  hooks/
    manager.ts           HookManager class
    dangerous-command-guard.ts
  components/
    StatusBar.tsx
    MessageList.tsx
    InputBar.tsx
    ApprovalPrompt.tsx
```
