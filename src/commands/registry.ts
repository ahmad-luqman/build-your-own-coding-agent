import type { CommandDefinition } from "../types.js";
import { clearCommand } from "./clear.js";
import { costCommand } from "./cost.js";
import { exitCommand } from "./exit.js";
import { createHelpCommand } from "./help.js";
import { loadCommand } from "./load.js";
import { modelCommand } from "./model.js";
import { saveCommand } from "./save.js";
import { sessionsCommand } from "./sessions.js";

export function createCommandRegistry(): Map<string, CommandDefinition> {
  const commands = new Map<string, CommandDefinition>();

  const allCommands = [
    clearCommand,
    costCommand,
    exitCommand,
    loadCommand,
    modelCommand,
    saveCommand,
    sessionsCommand,
  ];

  for (const cmd of allCommands) {
    commands.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        commands.set(alias, cmd);
      }
    }
  }

  // Help command needs access to the registry itself
  const helpCmd = createHelpCommand(commands);
  commands.set(helpCmd.name, helpCmd);

  return commands;
}
