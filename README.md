# Build Your Own Coding Agent

A minimal CLI coding agent built from scratch with Bun, Ink, and AI SDK v6. It connects to LLMs via OpenRouter and provides an interactive terminal interface where you can chat with an AI that has access to your file system and shell.

```
┌──────────────────────────────────────────────────┐
│  Model: anthropic/claude-sonnet-4  Tokens: 1.2k  │
├──────────────────────────────────────────────────┤
│                                                  │
│  You: Read src/index.tsx and explain it          │
│                                                  │
│  Assistant: [reads file, explains code]          │
│                                                  │
│  > Tool: read_file ✓                             │
│                                                  │
├──────────────────────────────────────────────────┤
│  > _                                             │
└──────────────────────────────────────────────────┘
```

## Why

This project exists to demystify how AI coding agents work. The entire codebase is ~600 lines of TypeScript across 14 files — small enough to read in one sitting, but complete enough to actually use.

If you've used tools like Claude Code, Cursor, or Copilot Workspace and wondered how they work under the hood, this is a from-scratch implementation of the core patterns: multi-turn agentic loops, tool use, streaming, and a terminal UI.

## Features

- **Multi-turn agent loop** — The AI can chain tool calls across multiple turns to complete complex tasks
- **6 built-in tools** — `read_file`, `glob`, `grep`, `write_file`, `edit_file`, `bash`
- **Safety system** — Dangerous tools (write, edit, bash) require user approval before execution
- **Streaming responses** — Text streams token-by-token as the model generates it
- **Model-agnostic** — Swap models via a single env var (Claude, GPT-4o, Gemini, etc.)
- **Terminal UI** — Built with Ink (React for the terminal) with markdown rendering and syntax highlighting

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) and an [OpenRouter API key](https://openrouter.ai/keys).

```bash
# Clone and install
git clone https://github.com/ahmad-luqman/build-your-own-coding-agent.git
cd build-your-own-coding-agent
bun install

# Configure
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Run
bun run start
```

To use a different model:

```bash
MODEL_ID=openai/gpt-4o bun run start
```

## Project Structure

```
src/
  index.tsx        Entry point — wires config, model, tools, and renders the app
  config.ts        Loads env vars and builds the system prompt
  model.ts         Creates the OpenRouter model via AI SDK
  agent.ts         The core agent loop (async generator)
  app.tsx           Main React component (state machine)
  types.ts         All shared type definitions
  tools/
    registry.ts    Collects tools into a Map
    read.ts        read_file — read file contents
    glob.ts        glob — find files by pattern
    grep.ts        grep — search file contents
    write.ts       write_file — create/overwrite files (requires approval)
    edit.ts        edit_file — surgical string replacements (requires approval)
    bash.ts        bash — run shell commands (requires approval)
  hooks/
    manager.ts     Sequential hook pipeline
    dangerous-command-guard.ts — approval flow for dangerous operations
  components/
    StatusBar.tsx   Model name + token usage
    MessageList.tsx Conversation display with markdown rendering
    InputBar.tsx    Text input with loading state
    ApprovalPrompt.tsx  y/n prompt for dangerous tool calls
```

## How It Works

1. **Entry** — `index.tsx` loads config, creates the AI model, builds the tool registry, and renders the Ink app
2. **Input** — User types a message, `App` adds it to the conversation history
3. **Agent loop** — `runAgent()` calls `streamText()` with the conversation + tools, yielding events as an async generator
4. **Tool use** — When the model calls a tool, the hook system checks if approval is needed. Safe tools run immediately; dangerous ones show an approval prompt
5. **Multi-turn** — If the model called tools, the loop continues with the updated history. Otherwise, it stops
6. **Display** — Events stream into React state, updating the TUI in real-time

See [docs/architecture.md](docs/architecture.md) for detailed diagrams and [docs/technical-choices.md](docs/technical-choices.md) for rationale behind each technology decision.

## Key Concepts

### The Agent Loop Pattern

The heart of any coding agent is a loop: call the model, execute any tool calls, feed results back, repeat until done. Here it's implemented as an async generator that yields typed events:

```typescript
async function* runAgent(messages, options): AsyncGenerator<AgentEvent> {
  while (turn < maxTurns) {
    const result = streamText({ model, messages, tools });
    for await (const chunk of result.fullStream) {
      yield { type: "text-delta", text: chunk.text };  // stream to UI
    }
    if (finishReason !== "tool-calls") break;  // done if no more tool calls
  }
}
```

### Dual Output Pattern

Tools return both human-readable output (for the terminal) and structured data (for the model). The user sees a clean summary; the model gets data it can reason about:

```typescript
interface ToolResult {
  output: string;     // "Read 42 lines from src/index.tsx"
  data?: object;      // { content: "...", lines: 42 }
}
```

### Safety via Hooks

Instead of hardcoding safety checks, a hook pipeline intercepts tool calls. The `dangerous-command-guard` checks if a tool is marked `dangerous` and bridges async execution with the React UI through a shared Promise:

```typescript
// Hook creates a Promise → App renders ApprovalPrompt → user input resolves it
const approved = await requestApproval(toolName, input);
```

## Development

```bash
bun run dev          # Run with auto-reload on file changes
bunx tsc --noEmit    # Type-check without emitting
```

## License

MIT
