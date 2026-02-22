import { listSessions } from "../session.js";
import type { CommandDefinition } from "../types.js";

export const sessionsCommand: CommandDefinition = {
  name: "sessions",
  description: "List saved sessions",
  async execute(_args, ctx) {
    try {
      const sessions = await listSessions(ctx.config.sessionsDir);
      if (sessions.length === 0) {
        return { message: "No saved sessions." };
      }
      const lines = sessions.map(
        (s, i) =>
          `${i + 1}. **${s.name}** (${s.messageCount} messages, ${s.modelId}) — ${s.filename}`,
      );
      return { message: `Saved sessions:\n${lines.join("\n")}` };
    } catch (err) {
      return {
        error: `Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
