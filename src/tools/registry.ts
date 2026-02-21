import type { ToolDefinition } from "../types.js";
import { readTool } from "./read.js";
import { globTool } from "./glob.js";
import { grepTool } from "./grep.js";
import { writeTool } from "./write.js";
import { editTool } from "./edit.js";
import { bashTool } from "./bash.js";

export function createToolRegistry(): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>();

  const allTools = [readTool, globTool, grepTool, writeTool, editTool, bashTool];

  for (const t of allTools) {
    tools.set(t.name, t);
  }

  return tools;
}
