import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import type { AgentConfig } from "./types.js";

// Both providers return models compatible with streamText() at runtime.
// Using the OpenRouter return type for continuity; the Ollama path casts to match.
export type AgentModel = ReturnType<ReturnType<typeof createOpenRouter>["chat"]>;

export function createModel(config: AgentConfig): AgentModel {
  switch (config.provider) {
    case "openrouter": {
      const openrouter = createOpenRouter({ apiKey: config.apiKey! });
      return openrouter.chat(config.modelId);
    }
    case "ollama": {
      const ollama = createOpenAI({
        baseURL: config.baseURL ?? "http://localhost:11434/v1",
        apiKey: "ollama", // required by the SDK but ignored by Ollama
      });
      return ollama.chat(config.modelId) as unknown as AgentModel;
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
