import type { CommandDefinition } from "../types.js";

export const costCommand: CommandDefinition = {
  name: "cost",
  description: "Show token usage for this session",
  execute(_args, ctx) {
    const { inputTokens, outputTokens, totalTokens } = ctx.totalUsage;
    const fmt = (n: number) => n.toLocaleString();
    const lines = [
      "**Token Usage**",
      "",
      `  Input tokens:  ${fmt(inputTokens)}`,
      `  Output tokens: ${fmt(outputTokens)}`,
      `  Total tokens:  ${fmt(totalTokens)}`,
    ];
    return { message: lines.join("\n") };
  },
};
