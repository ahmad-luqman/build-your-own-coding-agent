import type { LanguageModelV1 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOllama } from "ollama-ai-provider";
import type { AgentConfig } from "./types.js";

export type AgentModel = LanguageModelV1;

export function createModel(config: AgentConfig): AgentModel {
  switch (config.provider) {
    case "openrouter": {
      const openrouter = createOpenRouter({ apiKey: config.apiKey! });
      return openrouter.chat(config.modelId);
    }
    case "ollama": {
      const ollama = createOllama({
        baseURL: config.baseURL ?? "http://localhost:11434/api",
      });
      return ollama.chat(config.modelId);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
