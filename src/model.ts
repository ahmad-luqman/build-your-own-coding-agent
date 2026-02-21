import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function createModel(apiKey: string, modelId: string) {
  const openrouter = createOpenRouter({ apiKey });
  return openrouter.chat(modelId);
}

export type AgentModel = ReturnType<ReturnType<typeof createOpenRouter>["chat"]>;
