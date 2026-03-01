import { type ModelMessage, streamText, tool } from "ai";
import type { AgentModel } from "./model.js";
import type { AgentConfig, AgentEvent, HookHandler, ToolContext, ToolDefinition } from "./types.js";

interface AgentOptions {
  model: AgentModel;
  config: AgentConfig;
  tools?: Map<string, ToolDefinition>;
  onPreToolUse?: HookHandler;
  abortSignal?: AbortSignal;
  onToolOutput?: (toolCallId: string, output: string) => void;
}

export async function* runAgent(
  messages: ModelMessage[],
  options: AgentOptions,
): AsyncGenerator<AgentEvent> {
  const { model, config, tools, onPreToolUse, abortSignal, onToolOutput } = options;

  const aiTools = tools ? buildAITools(tools, config.cwd, onPreToolUse, onToolOutput) : undefined;

  let turn = 0;

  while (turn < config.maxTurns) {
    if (abortSignal?.aborted) return;

    turn++;
    yield { type: "turn-start" as const, turn, maxTurns: config.maxTurns };

    const result = streamText({
      model: model as any,
      system: config.systemPrompt,
      messages,
      tools: aiTools as any,
      abortSignal,
    });

    try {
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
                output:
                  typeof chunk.output === "string" ? chunk.output : JSON.stringify(chunk.output),
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
            yield {
              type: "error",
              error: chunk.error instanceof Error ? chunk.error : new Error(String(chunk.error)),
            };
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
    } catch (err: unknown) {
      // If our signal fired, stop cleanly — checking signal.aborted is authoritative
      // and handles all runtimes (DOMException, plain Error, etc.) without name-matching.
      // All other errors are re-thrown to be handled by the caller.
      if (abortSignal?.aborted) return;
      throw err;
    }

    // Guard against a late abort that fires after the stream finishes but before
    // result.response / result.finishReason resolve, which could cause them to reject.
    if (abortSignal?.aborted) return;

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
  onPreToolUse?: HookHandler,
  onToolOutput?: (toolCallId: string, output: string) => void,
): Record<string, unknown> {
  const aiTools: Record<string, unknown> = {};

  for (const [name, def] of tools) {
    aiTools[name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (
        input: Record<string, unknown>,
        {
          toolCallId,
          abortSignal: toolAbortSignal,
        }: { toolCallId?: string; abortSignal?: AbortSignal } = {},
      ) => {
        // Run pre-tool-use hook
        if (onPreToolUse) {
          const decision = await onPreToolUse({ toolName: name, input });
          if (!decision.allowed) {
            return { success: false, output: "", error: `Blocked: ${decision.reason}` };
          }
        }
        const ctx: ToolContext = {
          cwd,
          abortSignal: toolAbortSignal,
          onOutput:
            onToolOutput && toolCallId
              ? (chunk: string) => onToolOutput(toolCallId, chunk)
              : undefined,
        };
        const result = await def.execute(input, ctx);
        // Return structured data to the model when available, fall back to string
        return result.data ?? result;
      },
    }) as any;
  }

  return aiTools;
}
