import type { CommandDefinition } from "../types.js";

export const compactCommand: CommandDefinition = {
  name: "compact",
  description: "Summarize older messages to free context window space",
  async execute(_args, ctx) {
    if (!ctx.compactMessages) {
      return { error: "Compaction is not available." };
    }

    const result = await ctx.compactMessages();

    if (!result.compacted) {
      return { message: "Not enough messages to compact." };
    }

    return { message: "Context compacted — older messages have been summarized." };
  },
};
