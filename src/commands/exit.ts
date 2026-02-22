import type { CommandDefinition } from "../types.js";

export const exitCommand: CommandDefinition = {
  name: "exit",
  description: "Save session and exit",
  aliases: ["quit"],
  async execute(_args, ctx) {
    try {
      await ctx.saveSession();
    } catch (err) {
      return {
        error: `Session could not be saved: ${err instanceof Error ? err.message : String(err)}. Use /save to retry or /exit again to quit without saving.`,
      };
    }
    ctx.exit();
    return {};
  },
};
