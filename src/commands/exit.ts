import type { CommandDefinition } from "../types.js";

export const exitCommand: CommandDefinition = {
  name: "exit",
  description: "Save session and exit",
  aliases: ["quit"],
  async execute(_args, ctx) {
    await ctx.saveSession().catch(() => {});
    ctx.exit();
    return {};
  },
};
