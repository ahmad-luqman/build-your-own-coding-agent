import type { CommandDefinition } from "../types.js";

export const clearCommand: CommandDefinition = {
  name: "clear",
  description: "Clear conversation history and token usage",
  execute(_args, ctx) {
    ctx.setMessages([]);
    ctx.setDisplayMessages(() => []);
    ctx.setTotalUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    return { message: "Conversation cleared." };
  },
};
