import type { ModelMessage } from "ai";
import { Box, useApp, useInput } from "ink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runAgent } from "./agent.js";
import { createCommandRegistry } from "./commands/registry.js";
import { ApprovalPrompt } from "./components/ApprovalPrompt.js";
import { InputBar } from "./components/InputBar.js";
import { MessageList } from "./components/MessageList.js";
import { SessionResumePrompt } from "./components/SessionResumePrompt.js";
import { StatusBar } from "./components/StatusBar.js";
import { compactMessages, getCompactionThreshold, getContextWindowLimit } from "./context/index.js";
import { createDangerousCommandGuard } from "./hooks/dangerous-command-guard.js";
import { HookManager } from "./hooks/manager.js";
import type { AgentModel } from "./model.js";
import { createModel } from "./model.js";
import { INITIAL_PROGRESS, type ProgressState, progressReducer } from "./progress.js";
import { getMostRecentSession, saveSession } from "./session.js";
import type {
  AgentConfig,
  CommandContext,
  CompactionResult,
  DisplayMessage,
  HookDecision,
  SessionListEntry,
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

export function App({ config, model: initialModel, tools }: Props) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"init" | "active">("init");
  const [resumeCandidate, setResumeCandidate] = useState<SessionListEntry | null>(null);
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

  // Model switching state
  const [currentModel, setCurrentModel] = useState<AgentModel>(initialModel);
  const [currentModelId, setCurrentModelId] = useState(config.modelId);
  const [lastInputTokens, setLastInputTokens] = useState(0);
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);

  const commandRegistry = useMemo(() => createCommandRegistry(), []);

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

  // Refs for save callback to access latest state without re-creating
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const displayMessagesRef = useRef(displayMessages);
  displayMessagesRef.current = displayMessages;
  const totalUsageRef = useRef(totalUsage);
  totalUsageRef.current = totalUsage;
  const currentModelIdRef = useRef(currentModelId);
  currentModelIdRef.current = currentModelId;

  const saveCurrentSession = useCallback(
    async (name?: string) => {
      if (messagesRef.current.length === 0) return;
      await saveSession(
        config.sessionsDir,
        {
          messages: messagesRef.current,
          displayMessages: displayMessagesRef.current,
          totalUsage: totalUsageRef.current,
        },
        { name, modelId: currentModelIdRef.current, cwd: config.cwd },
      );
    },
    [config.sessionsDir, config.cwd],
  );

  // Shared compaction logic for both auto and manual compaction
  const compactConversation = useCallback(async (): Promise<CompactionResult> => {
    const result = await compactMessages({
      model: currentModel,
      messages: messagesRef.current,
      displayMessages: displayMessagesRef.current,
    });

    if (result.compacted) {
      setMessages(result.messages);
      setDisplayMessages(result.displayMessages);
    }

    return result;
  }, [currentModel]);

  // Check for resumable session on startup
  useEffect(() => {
    getMostRecentSession(config.sessionsDir)
      .then((entry) => {
        if (entry) {
          setResumeCandidate(entry);
        } else {
          setPhase("active");
        }
      })
      .catch(() => {
        setPhase("active");
      });
  }, [config.sessionsDir]);

  const handleResumeDecision = useCallback(
    async (resume: boolean) => {
      if (resume && resumeCandidate) {
        const { loadSession } = await import("./session.js");
        try {
          const session = await loadSession(config.sessionsDir, resumeCandidate.filename);
          setMessages(session.state.messages);
          setDisplayMessages(session.state.displayMessages);
          setTotalUsage(session.state.totalUsage);
        } catch (err) {
          const errorMsg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Failed to resume session: ${err instanceof Error ? err.message : String(err)}. Starting fresh.`,
            timestamp: Date.now(),
          };
          setDisplayMessages([errorMsg]);
        }
      }
      setResumeCandidate(null);
      setPhase("active");
    },
    [resumeCandidate, config.sessionsDir],
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  useInput((input: string, key: { ctrl: boolean }) => {
    if (input === "c" && key.ctrl) {
      if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
      } else {
        saveCurrentSession()
          .catch(() => {})
          .finally(() => exit());
      }
    }
    if (input === "l" && key.ctrl) {
      setDisplayMessages([]);
      setStreamingText("");
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

      const trimmed = text.trim();

      // Slash command handling via registry
      if (trimmed.startsWith("/")) {
        const [cmdName, ...rest] = trimmed.slice(1).split(" ");
        const cmd = commandRegistry.get(cmdName);

        if (!cmd) {
          const errorMsg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Unknown command: \`/${cmdName}\`. Type \`/help\` to see available commands.`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, errorMsg]);
          return;
        }

        const commandCtx: CommandContext = {
          config: { ...config, modelId: currentModelIdRef.current },
          setMessages,
          setDisplayMessages,
          totalUsage: totalUsageRef.current,
          setTotalUsage,
          saveSession: saveCurrentSession,
          setModel: (modelId: string) => {
            const newModel = createModel({ ...config, modelId });
            setCurrentModel(newModel);
            setCurrentModelId(modelId);
          },
          compactMessages: compactConversation,
          exit,
        };

        let result: import("./types.js").CommandResult;
        try {
          result = await cmd.execute(rest.join(" "), commandCtx);
        } catch (err) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Command /${cmdName} failed: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
          return;
        }

        if (result.error) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
        } else if (result.message) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.message,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
        }
        return;
      }

      const userMsg: ModelMessage = { role: "user", content: text };
      let newMessages = [...messages, userMsg];
      setMessages(newMessages);

      const userDisplay: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setDisplayMessages((prev) => [...prev, userDisplay]);
      setIsLoading(true);
      setStreamingText("");

      // Auto-compaction: if last turn's input tokens exceeded threshold, compact
      const threshold = getCompactionThreshold(currentModelIdRef.current);
      if (lastInputTokens > threshold && newMessages.length > 8) {
        try {
          const compResult = await compactConversation();
          if (compResult.compacted) {
            newMessages = compResult.messages;
          }
        } catch {
          // Compaction failure is non-fatal — continue with original messages
        }
      }

      let assistantText = "";
      const toolCalls: NonNullable<DisplayMessage["toolCalls"]> = [];
      let currentProgress = INITIAL_PROGRESS;

      // Create onPreToolUse that delegates to the hook manager
      const onPreToolUse = hookManagerRef.current
        ? async (ctx: {
            toolName: string;
            input: Record<string, unknown>;
          }): Promise<HookDecision> => {
            return hookManagerRef.current!.run("pre-tool-use", ctx);
          }
        : undefined;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const stream = runAgent(newMessages, {
          model: currentModel,
          config,
          tools,
          onPreToolUse,
          abortSignal: abortController.signal,
        });

        for await (const event of stream) {
          currentProgress = progressReducer(currentProgress, event);
          setProgress(currentProgress);

          switch (event.type) {
            case "turn-start":
              break;

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
              setLastInputTokens(event.usage.inputTokens);
              setTotalUsage((prev) => ({
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

      const wasCancelled = abortController.signal.aborted;
      abortControllerRef.current = null;

      if (wasCancelled) {
        const cancelledMsg: DisplayMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "[cancelled]",
          timestamp: Date.now(),
        };
        setDisplayMessages((prev) => [...prev, cancelledMsg]);
        setIsLoading(false);
        setProgress(INITIAL_PROGRESS);
        setStreamingText("");
        return;
      }

      if (assistantText || toolCalls.length > 0) {
        const assistantDisplay: DisplayMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: Date.now(),
        };
        setDisplayMessages((prev) => [...prev, assistantDisplay]);
      }

      setMessages(newMessages);
      setStreamingText("");
      setIsLoading(false);
      setProgress(INITIAL_PROGRESS);
    },
    [
      messages,
      isLoading,
      currentModel,
      config,
      tools,
      exit,
      saveCurrentSession,
      commandRegistry,
      lastInputTokens,
      compactConversation,
    ],
  );

  if (phase === "init" && resumeCandidate) {
    return (
      <Box flexDirection="column" height="100%">
        <StatusBar
          modelId={currentModelId}
          usage={totalUsage}
          lastInputTokens={lastInputTokens}
          contextLimit={getContextWindowLimit(currentModelId)}
        />
        <SessionResumePrompt session={resumeCandidate} onDecision={handleResumeDecision} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        modelId={currentModelId}
        usage={totalUsage}
        lastInputTokens={lastInputTokens}
        contextLimit={getContextWindowLimit(currentModelId)}
      />
      <MessageList messages={displayMessages} streamingText={streamingText} />
      {pendingApproval ? (
        <ApprovalPrompt
          toolName={pendingApproval.toolName}
          input={pendingApproval.input}
          onDecision={handleApprovalDecision}
        />
      ) : (
        <InputBar
          onSubmit={handleSubmit}
          isLoading={isLoading}
          commands={commandRegistry}
          progress={progress}
        />
      )}
    </Box>
  );
}
