import { streamText, tool, type ModelMessage } from "ai";
import type { AgentModel } from "./model.js";
import type { AgentEvent, AgentConfig, ToolDefinition, ToolContext, HookHandler } from "./types.js";

interface AgentOptions {
  model: AgentModel;
  config: AgentConfig;
  tools?: Map<string, ToolDefinition>;
  onPreToolUse?: HookHandler;
}

export async function* runAgent(
  messages: ModelMessage[],
  options: AgentOptions
): AsyncGenerator<AgentEvent> {
  const { model, config, tools, onPreToolUse } = options;

  const aiTools = tools ? buildAITools(tools, config.cwd, onPreToolUse) : undefined;

  let turn = 0;

  while (turn < config.maxTurns) {
    turn++;

    const result = streamText({
      model: model as any,
      system: config.systemPrompt,
      messages,
      tools: aiTools as any,
    });

    for await (const chunk of result.fullStream) {
      switch (chunk.type) {
        case "text-delta":
          yield { type: "text-delta", text: chunk.text };
          break;

        case "tool-call":
          yield {
            type: "tool-call",
            toolName: chunk.toolName,
            input: chunk.input as Record<string, unknown>,
            toolCallId: chunk.toolCallId,
          };
          break;

        case "tool-result":
          yield {
            type: "tool-result",
            toolName: chunk.toolName,
            toolCallId: chunk.toolCallId,
            result: {
              success: true,
              output: typeof chunk.output === "string" ? chunk.output : JSON.stringify(chunk.output),
            },
          };
          break;

        case "tool-error":
          yield {
            type: "tool-result",
            toolName: chunk.toolName,
            toolCallId: chunk.toolCallId,
            result: {
              success: false,
              output: "",
              error: String(chunk.error),
            },
          };
          break;

        case "error":
          yield { type: "error", error: chunk.error instanceof Error ? chunk.error : new Error(String(chunk.error)) };
          break;

        case "finish": {
          const usage = chunk.totalUsage;
          yield {
            type: "finish",
            usage: {
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
              totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
            },
          };
          break;
        }
      }
    }

    // Append response messages to history
    const response = await result.response;
    messages.push(...response.messages);

    // If model didn't call tools, we're done
    const finishReason = await result.finishReason;
    if (finishReason !== "tool-calls") {
      break;
    }
  }
}

function buildAITools(
  tools: Map<string, ToolDefinition>,
  cwd: string,
  onPreToolUse?: HookHandler
): Record<string, unknown> {
  const aiTools: Record<string, unknown> = {};
  const ctx: ToolContext = { cwd };

  for (const [name, def] of tools) {
    aiTools[name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (input: Record<string, unknown>) => {
        // Run pre-tool-use hook
        if (onPreToolUse) {
          const decision = await onPreToolUse({ toolName: name, input });
          if (!decision.allowed) {
            return { success: false, output: "", error: `Blocked: ${decision.reason}` };
          }
        }
        const result = await def.execute(input, ctx);
        // Return structured data to the model when available, fall back to string
        return result.data ?? result;
      },
    }) as any;
  }

  return aiTools;
}
