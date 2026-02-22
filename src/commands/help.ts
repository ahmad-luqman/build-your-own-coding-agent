import type { CommandDefinition } from "../types.js";

export function createHelpCommand(registry: Map<string, CommandDefinition>): CommandDefinition {
  return {
    name: "help",
    description: "Show available commands",
    execute() {
      const lines: string[] = ["**Available commands:**", ""];
      for (const cmd of registry.values()) {
        const usage = cmd.usage ?? `/${cmd.name}`;
        lines.push(`  \`${usage}\` — ${cmd.description}`);
      }
      return { message: lines.join("\n") };
    },
  };
}
