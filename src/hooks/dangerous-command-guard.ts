import type { Hook, ToolDefinition } from "../types.js";

// Patterns that are especially dangerous in bash
const DANGEROUS_BASH_PATTERNS = [
  /\brm\s+(-[rf]+\s+)?\//, // rm -rf /
  /\bgit\s+push\s+--force/,
  /\bgit\s+reset\s+--hard/,
  /\bdrop\s+(table|database)/i,
  /\bsudo\b/,
  />\s*\/dev\/sd/,
];

export function createDangerousCommandGuard(
  tools: Map<string, ToolDefinition>,
  requestApproval: (toolName: string, input: Record<string, unknown>) => Promise<boolean>,
): Hook {
  return {
    event: "pre-tool-use",
    name: "dangerous-command-guard",
    handler: async (ctx) => {
      const toolDef = tools.get(ctx.toolName);

      // Check if tool is marked dangerous
      if (toolDef?.dangerous) {
        // Extra check for bash — some commands are especially dangerous
        if (ctx.toolName === "bash" && typeof ctx.input.command === "string") {
          for (const pattern of DANGEROUS_BASH_PATTERNS) {
            if (pattern.test(ctx.input.command)) {
              const approved = await requestApproval(ctx.toolName, ctx.input);
              if (!approved) {
                return { allowed: false, reason: "User denied dangerous command" };
              }
              return { allowed: true };
            }
          }
        }

        // Generic approval for all dangerous tools
        const approved = await requestApproval(ctx.toolName, ctx.input);
        if (!approved) {
          return { allowed: false, reason: "User denied tool use" };
        }
      }

      return { allowed: true };
    },
  };
}
