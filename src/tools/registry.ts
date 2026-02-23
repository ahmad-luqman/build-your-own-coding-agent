import type { ToolDefinition } from "../types.js";
import { bashTool } from "./bash.js";
import { editTool } from "./edit.js";
import { globTool } from "./glob.js";
import { grepTool } from "./grep.js";
import { readTool } from "./read.js";
import { treeTool } from "./tree.js";
import { writeTool } from "./write.js";

export function createToolRegistry(): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>();

  const allTools = [readTool, globTool, grepTool, treeTool, writeTool, editTool, bashTool];

  for (const t of allTools) {
    tools.set(t.name, t);
  }

  return tools;
}
