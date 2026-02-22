import type { CommandDefinition } from "../types.js";

export const saveCommand: CommandDefinition = {
  name: "save",
  description: "Save current session",
  usage: "/save [name]",
  async execute(args, ctx) {
    const name = args.trim() || undefined;
    try {
      await ctx.saveSession(name);
      return { message: `Session saved${name ? ` as "${name}"` : ""}.` };
    } catch (err) {
      return {
        error: `Failed to save session: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
