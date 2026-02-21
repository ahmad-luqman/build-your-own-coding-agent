# Ollama Setup Guide

Run the coding agent with local models using [Ollama](https://ollama.com).

## Prerequisites

1. **Install Ollama**: https://ollama.com/download
2. **Pull a model** with tool calling support:
   ```bash
   ollama pull qwen3-coder-next
   ```
3. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

## Configuration

In your `.env` file:

```bash
PROVIDER=ollama
MODEL_ID=qwen3-coder-next
# OLLAMA_BASE_URL=http://localhost:11434/v1  # default, only set if non-standard
```

Or run inline:

```bash
PROVIDER=ollama MODEL_ID=qwen3-coder-next bun run start
```

## Recommended Models for Coding Agents

Tool calling is critical for the agent loop — the model must be able to emit structured tool calls. Models that work well:

| Model | Size | Tool Calling | Notes |
|-------|------|:------------:|-------|
| `qwen3-coder-next` | varies | Yes | Optimized for coding tasks |
| `qwen2.5-coder:32b` | 32B | Yes | Strong code generation |
| `llama3.1:70b` | 70B | Yes | General purpose, good tool use |
| `mistral-small` | 22B | Yes | Compact, capable |
| `command-r` | 35B | Yes | Good instruction following |

Models **without** reliable tool calling (e.g., `codellama`, `phi3`) won't work well — the agent needs tool calls to read/write files and run commands.

## Troubleshooting

### "Connection refused" errors
Ollama isn't running. Start it:
```bash
ollama serve
```

### Model not found
Pull the model first:
```bash
ollama pull qwen3-coder-next
```

### Model doesn't call tools
Some models don't support tool calling or do it unreliably. Try a model from the recommended list above.

### Custom Ollama host
If Ollama runs on a different machine or port:
```bash
OLLAMA_BASE_URL=http://192.168.1.100:11434/v1
```

## How It Works

We connect to Ollama via its [OpenAI-compatible API](https://ollama.com/blog/openai-compatibility) (`/v1` endpoint) using the `@ai-sdk/openai` provider from the AI SDK. This gives us full compatibility with AI SDK v6's streaming and tool calling, without needing a dedicated Ollama provider package.
