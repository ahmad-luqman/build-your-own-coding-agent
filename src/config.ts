import type { AgentConfig, Provider } from "./types.js";

const MODEL_DEFAULTS: Record<Provider, string> = {
  openrouter: "anthropic/claude-sonnet-4-20250514",
  ollama: "qwen3-coder-next",
};

export function loadConfig(): AgentConfig {
  const provider = (process.env.PROVIDER ?? "openrouter") as Provider;
  if (provider !== "openrouter" && provider !== "ollama") {
    console.error(`Unknown PROVIDER "${provider}". Supported: openrouter, ollama`);
    process.exit(1);
  }

  let apiKey: string | undefined;
  if (provider === "openrouter") {
    apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error(
        "Missing OPENROUTER_API_KEY in environment. Copy .env.example to .env and fill it in.",
      );
      process.exit(1);
    }
  }

  return {
    provider,
    modelId: process.env.MODEL_ID ?? MODEL_DEFAULTS[provider],
    apiKey,
    baseURL: process.env.OLLAMA_BASE_URL,
    systemPrompt: getSystemPrompt(),
    cwd: process.cwd(),
    maxTurns: 40,
  };
}

function getSystemPrompt(): string {
  return `You are a coding agent running in the user's terminal. You help with software engineering tasks.

## Available Tools
- **read_file**: Read file contents (with optional offset/limit for large files)
- **glob**: Find files by pattern (e.g. "**/*.ts")
- **grep**: Search file contents with regex
- **write_file**: Create or overwrite files (requires approval)
- **edit_file**: Make surgical edits by replacing exact string matches (requires approval)
- **bash**: Run shell commands (requires approval)

## Guidelines
- Be concise. Don't explain what you're about to do unless the task is complex.
- Use tools to read files before modifying them — never guess at file contents.
- For multi-step tasks, briefly outline your plan, then execute.
- Match the existing code style and conventions.
- After making changes, verify they work (run tests, typecheck, etc.) when appropriate.
- If a tool call fails, diagnose the issue and try a different approach.

Current working directory: ${process.cwd()}`;
}
