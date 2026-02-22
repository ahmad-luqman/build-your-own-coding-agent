import type { ModelMessage } from "ai";
import { Box, useApp, useInput } from "ink";
import { useCallback, useRef, useState } from "react";
import { runAgent } from "./agent.js";
import { ApprovalPrompt } from "./components/ApprovalPrompt.js";
import { InputBar } from "./components/InputBar.js";
import { MessageList } from "./components/MessageList.js";
import { StatusBar } from "./components/StatusBar.js";
import { createDangerousCommandGuard } from "./hooks/dangerous-command-guard.js";
import { HookManager } from "./hooks/manager.js";
import type { AgentModel } from "./model.js";
import type {
  AgentConfig,
  DisplayMessage,
  HookDecision,
  TokenUsage,
  ToolDefinition,
} from "./types.js";

interface Props {
  config: AgentConfig;
  model: AgentModel;
  tools?: Map<string, ToolDefinition>;
}

interface PendingApproval {
  toolName: string;
  input: Record<string, unknown>;
  resolve: (approved: boolean) => void;
}

export function App({ config, model, tools }: Props) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<ModelMessage[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [totalUsage, setTotalUsage] = useState<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });

  // Set up hook manager with approval flow
  const hookManagerRef = useRef<HookManager | null>(null);
  if (!hookManagerRef.current && tools) {
    const hm = new HookManager();
    hm.register(
      createDangerousCommandGuard(tools, (toolName, input) => {
        return new Promise<boolean>((resolve) => {
          setPendingApproval({ toolName, input, resolve });
        });
      }),
    );
    hookManagerRef.current = hm;
  }

  useInput((input: string, key: { ctrl: boolean }) => {
    if (input === "c" && key.ctrl) {
      exit();
    }
  });

  const handleApprovalDecision = useCallback(
    (approved: boolean) => {
      if (pendingApproval) {
        pendingApproval.resolve(approved);
        setPendingApproval(null);
      }
    },
    [pendingApproval],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      if (text.trim() === "/exit" || text.trim() === "/quit") {
        exit();
        return;
      }

      const userMsg: ModelMessage = { role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);

      const userDisplay: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setDisplayMessages((prev: DisplayMessage[]) => [...prev, userDisplay]);
      setIsLoading(true);
      setStreamingText("");

      let assistantText = "";
      const toolCalls: NonNullable<DisplayMessage["toolCalls"]> = [];

      // Create onPreToolUse that delegates to the hook manager
      const onPreToolUse = hookManagerRef.current
        ? async (ctx: {
            toolName: string;
            input: Record<string, unknown>;
          }): Promise<HookDecision> => {
            return hookManagerRef.current!.run("pre-tool-use", ctx);
          }
        : undefined;

      try {
        const stream = runAgent(newMessages, { model, config, tools, onPreToolUse });

        for await (const event of stream) {
          switch (event.type) {
            case "text-delta":
              assistantText += event.text;
              setStreamingText(assistantText);
              break;

            case "tool-call":
              toolCalls.push({
                toolName: event.toolName,
                toolCallId: event.toolCallId,
                input: event.input,
                status: "running",
              });
              break;

            case "tool-result": {
              const tc = toolCalls.find((t) => t.toolCallId === event.toolCallId);
              if (tc) {
                tc.result = event.result;
                tc.status = event.result.success ? "done" : "error";
              }
              break;
            }

            case "finish":
              setTotalUsage((prev: TokenUsage) => ({
                inputTokens: prev.inputTokens + event.usage.inputTokens,
                outputTokens: prev.outputTokens + event.usage.outputTokens,
                totalTokens: prev.totalTokens + event.usage.totalTokens,
              }));
              break;

            case "error":
              assistantText += `\n\nError: ${event.error.message}`;
              break;
          }
        }
      } catch (err) {
        assistantText += `\n\nError: ${err instanceof Error ? err.message : String(err)}`;
      }

      if (assistantText || toolCalls.length > 0) {
        const assistantDisplay: DisplayMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: Date.now(),
        };
        setDisplayMessages((prev: DisplayMessage[]) => [...prev, assistantDisplay]);
      }

      setMessages(newMessages);
      setStreamingText("");
      setIsLoading(false);
    },
    [messages, isLoading, model, config, tools, exit],
  );

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar modelId={config.modelId} usage={totalUsage} />
      <MessageList messages={displayMessages} streamingText={streamingText} />
      {pendingApproval ? (
        <ApprovalPrompt
          toolName={pendingApproval.toolName}
          input={pendingApproval.input}
          onDecision={handleApprovalDecision}
        />
      ) : (
        <InputBar onSubmit={handleSubmit} isLoading={isLoading} />
      )}
    </Box>
  );
}
