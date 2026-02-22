import { listSessions, loadSession } from "../session.js";
import type { CommandDefinition } from "../types.js";

export const loadCommand: CommandDefinition = {
  name: "load",
  description: "Load a saved session",
  usage: "/load <number|filename>",
  async execute(args, ctx) {
    const arg = args.trim();
    if (!arg) {
      return { error: "Usage: `/load <number>` or `/load <filename>`" };
    }

    try {
      let filename = arg;
      const index = /^\d+$/.test(arg) ? Number.parseInt(arg, 10) : Number.NaN;
      if (!Number.isNaN(index)) {
        const sessions = await listSessions(ctx.config.sessionsDir);
        if (index < 1 || index > sessions.length) {
          throw new Error("Invalid session number. Use /sessions to see available sessions.");
        }
        filename = sessions[index - 1].filename;
      }

      const session = await loadSession(ctx.config.sessionsDir, filename);
      ctx.setMessages(session.state.messages);
      ctx.setDisplayMessages(() => session.state.displayMessages);
      ctx.setTotalUsage(session.state.totalUsage);

      return { message: `Loaded session: ${session.metadata.name}` };
    } catch (err) {
      return {
        error: `Failed to load session: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
