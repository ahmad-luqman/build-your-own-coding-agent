# Technical Choices

Rationale behind the key technology and design decisions in this project.

## Runtime: Bun

**Why not Node.js?**

- **Native TypeScript** — Bun runs `.ts` and `.tsx` directly, no build step or `ts-node` needed. The entry point is `#!/usr/bin/env bun` and `bun run src/index.tsx` just works.
- **Fast startup** — A CLI tool that takes seconds to load feels broken. Bun's startup time is near-instant.
- **`Bun.spawn`** — The bash tool uses `Bun.spawn` for subprocess execution, which provides a cleaner API than Node's `child_process` with built-in support for streaming stdout/stderr and a simple `exited` promise.
- **Built-in package management** — `bun install` is fast and handles the lockfile.

## TUI Framework: Ink (React for terminals)

**Why not raw ANSI / blessed / prompts?**

- **Component model** — The UI has real state management needs: streaming text, tool call status tracking, conditional rendering of approval prompts vs input bar. React's declarative model maps well to this.
- **Familiar paradigm** — Anyone who knows React can read and extend the TUI components. `useState`, `useCallback`, `useRef` all work as expected.
- **Ink 5** — Provides `<Box>`, `useInput`, `useApp`, and flexbox-style layout for the terminal. The component tree (`StatusBar` / `MessageList` / `InputBar`) mirrors what you'd build in a web app.

The main trade-off is bundle size — Ink pulls in React — but for a dev tool that's acceptable.

## AI Integration: Vercel AI SDK v6

**Why not call the API directly?**

- **Streaming protocol** — `streamText()` returns a `fullStream` async iterable that yields typed chunks (`text-delta`, `tool-call`, `tool-result`, `finish`). Building this from raw SSE would be significant work.
- **Tool use protocol** — The SDK's `tool()` helper handles the tool call/result lifecycle, including schema validation via Zod and automatic message construction for multi-turn tool use.
- **Provider-agnostic** — The `model` object is created from `@openrouter/ai-sdk-provider`, but the agent loop (`streamText`, `tool`, message types) doesn't know or care about the provider. Swapping to Anthropic direct, OpenAI, or any other AI SDK provider would only change `src/model.ts`.

## Model Provider: OpenRouter

**Why not Anthropic/OpenAI directly?**

- **Multi-model access** — One API key, many models. The `MODEL_ID` env var can be set to any model OpenRouter supports (`anthropic/claude-sonnet-4-20250514`, `openai/gpt-4o`, `google/gemini-2.0-flash`, etc.).
- **Single integration point** — Rather than maintaining provider-specific API clients, OpenRouter normalizes the interface. Combined with AI SDK's provider abstraction, the agent is genuinely model-agnostic.

## Agent Loop: Async Generator

**Why `async function*` instead of callbacks or a plain async function?**

```typescript
export async function* runAgent(messages, options): AsyncGenerator<AgentEvent> {
  // ...
  yield { type: "text-delta", text: chunk.text };
  // ...
}
```

- **Backpressure** — The consumer (`App.handleSubmit`) processes events at its own pace. If React state updates are slow, the generator naturally pauses. With callbacks, you'd need explicit buffering.
- **Composability** — `for await (const event of stream)` is a standard pattern. You could pipe events through transforms, fan out to multiple consumers, or wrap in higher-level generators.
- **Clean cancellation** — Returning from the `for await` loop signals the generator to stop. No need for explicit abort controllers or cleanup callbacks.
- **Testability** — A generator is easy to test: call it, collect events into an array, assert. No need to mock callback registrations.

## Schema Validation: Zod

**Why Zod for tool input schemas?**

- **Runtime validation + type inference** — Each tool defines a Zod schema (`z.object({...})`). The AI SDK uses this both to describe the tool's parameters to the model and to validate inputs at runtime.
- **AI SDK integration** — AI SDK v6's `tool()` helper accepts Zod schemas directly via `inputSchema`. No separate JSON Schema definition needed.
- **Composable** — Tools can build complex input shapes (`z.object`, `z.enum`, `z.optional`) with clear error messages when validation fails.

## Dual Output Pattern

**Why do tools return both `output` and `data`?**

```typescript
interface ToolResult {
  success: boolean;
  output: string;    // Human-readable, for TUI display
  data?: object;     // Structured, sent to model for reasoning
}
```

- **Different audiences** — The user sees a nicely formatted summary in the terminal. The model gets structured data it can reason about effectively (e.g., file contents as a string vs a formatted display with line numbers and truncation indicators).
- **In `buildAITools`** — The wrapper returns `result.data ?? result`, so the model always gets the best available representation. If a tool doesn't provide `data`, the full `ToolResult` object is sent.
- **Example** — `read_file` might show truncated content with line numbers in `output` for the user, while `data` contains the full file contents and metadata the model needs to make edits.

## Hook System: Sequential Pipeline

**Why a hook system instead of inline checks?**

- **Separation of concerns** — The agent loop doesn't know about approval UIs or danger heuristics. It just calls `onPreToolUse` and respects the `HookDecision`.
- **Extensibility** — Adding new pre-tool-use checks (rate limiting, logging, command filtering) means registering another hook, not modifying the agent loop or tool execution.
- **Sequential with early exit** — `HookManager.run()` runs hooks in order. The first rejection short-circuits, which makes reasoning about security checks straightforward.

The approval flow is the most interesting part architecturally: the `dangerous-command-guard` hook returns a Promise that resolves when the user interacts with the `ApprovalPrompt` React component. This bridges the async tool execution world with the React rendering world through a shared Promise reference stored in App state.
