import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildSystemPrompt, CONTEXT_FILES, loadProjectContext } from "./context/index.js";
import type { AgentConfig, Provider } from "./types.js";

const MODEL_DEFAULTS: Record<Provider, string> = {
  openrouter: "anthropic/claude-sonnet-4-20250514",
  ollama: "qwen3-coder-next",
};

export async function loadConfig(): Promise<AgentConfig> {
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

  const cwd = process.cwd();
  const projectContext = await loadProjectContext(cwd);
  const systemPrompt = buildSystemPrompt(getSystemPrompt(), projectContext);

  if (projectContext) {
    console.error(`Loaded project context from ${projectContext.fileName}`);
  } else {
    const existsButFailed = await contextFileExists(cwd);
    if (existsButFailed) {
      console.error(`Warning: Found context file but failed to load it. Check file permissions.`);
    }
  }

  return {
    provider,
    modelId: process.env.MODEL_ID ?? MODEL_DEFAULTS[provider],
    apiKey,
    baseURL: process.env.OLLAMA_BASE_URL,
    systemPrompt,
    cwd,
    maxTurns: 40,
    sessionsDir: join(homedir(), ".coding-agent", "sessions"),
  };
}

function getSystemPrompt(): string {
  return `You are a coding agent running in the user's terminal. You help with software engineering tasks.

## Available Tools
- **read_file**: Read file contents (with optional offset/limit for large files)
- **glob**: Find files by pattern (e.g. "**/*.ts")
- **grep**: Search file contents with regex
- **tree**: Show directory structure with file sizes and counts (respects .gitignore)
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

async function contextFileExists(cwd: string): Promise<boolean> {
  for (const fileName of CONTEXT_FILES) {
    try {
      await access(join(cwd, fileName));
      return true;
    } catch {
      // File doesn't exist — try next
    }
  }
  return false;
}
