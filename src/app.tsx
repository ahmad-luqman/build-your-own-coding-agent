import type { ModelMessage } from "ai";
import { Box, useApp, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { runAgent } from "./agent.js";
import { ApprovalPrompt } from "./components/ApprovalPrompt.js";
import { InputBar } from "./components/InputBar.js";
import { MessageList } from "./components/MessageList.js";
import { SessionResumePrompt } from "./components/SessionResumePrompt.js";
import { StatusBar } from "./components/StatusBar.js";
import { createDangerousCommandGuard } from "./hooks/dangerous-command-guard.js";
import { HookManager } from "./hooks/manager.js";
import type { AgentModel } from "./model.js";
import { getMostRecentSession, listSessions, loadSession, saveSession } from "./session.js";
import type {
  AgentConfig,
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

export function App({ config, model, tools }: Props) {
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
        { name, modelId: config.modelId, cwd: config.cwd },
      );
    },
    [config.sessionsDir, config.modelId, config.cwd],
  );

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

  useInput((input: string, key: { ctrl: boolean }) => {
    if (input === "c" && key.ctrl) {
      saveCurrentSession()
        .catch(() => {})
        .finally(() => exit());
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

      if (trimmed === "/exit" || trimmed === "/quit") {
        await saveCurrentSession().catch(() => {});
        exit();
        return;
      }

      if (trimmed === "/save" || trimmed.startsWith("/save ")) {
        const name = trimmed.slice(5).trim() || undefined;
        try {
          await saveCurrentSession(name);
          const confirmMsg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Session saved${name ? ` as "${name}"` : ""}.`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, confirmMsg]);
        } catch (err) {
          const errorMsg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Failed to save session: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, errorMsg]);
        }
        return;
      }

      if (trimmed === "/sessions") {
        try {
          const sessions = await listSessions(config.sessionsDir);
          if (sessions.length === 0) {
            const msg: DisplayMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "No saved sessions.",
              timestamp: Date.now(),
            };
            setDisplayMessages((prev) => [...prev, msg]);
          } else {
            const lines = sessions.map(
              (s, i) =>
                `${i + 1}. **${s.name}** (${s.messageCount} messages, ${s.modelId}) — ${s.filename}`,
            );
            const msg: DisplayMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Saved sessions:\n${lines.join("\n")}`,
              timestamp: Date.now(),
            };
            setDisplayMessages((prev) => [...prev, msg]);
          }
        } catch (err) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
        }
        return;
      }

      if (trimmed === "/load" || trimmed.startsWith("/load ")) {
        const arg = trimmed.slice(5).trim();
        if (!arg) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Usage: `/load <number>` or `/load <filename>`",
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
          return;
        }

        try {
          let filename = arg;
          const index = /^\d+$/.test(arg) ? Number.parseInt(arg, 10) : Number.NaN;
          if (!Number.isNaN(index)) {
            const sessions = await listSessions(config.sessionsDir);
            if (index < 1 || index > sessions.length) {
              throw new Error(`Invalid session number. Use /sessions to see available sessions.`);
            }
            filename = sessions[index - 1].filename;
          }

          const session = await loadSession(config.sessionsDir, filename);
          setMessages(session.state.messages);
          setDisplayMessages(session.state.displayMessages);
          setTotalUsage(session.state.totalUsage);

          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Loaded session: ${session.metadata.name}`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
        } catch (err) {
          const msg: DisplayMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Failed to load session: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          };
          setDisplayMessages((prev) => [...prev, msg]);
        }
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
      setDisplayMessages((prev) => [...prev, userDisplay]);
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
    },
    [messages, isLoading, model, config, tools, exit, saveCurrentSession],
  );

  if (phase === "init" && resumeCandidate) {
    return (
      <Box flexDirection="column" height="100%">
        <StatusBar modelId={config.modelId} usage={totalUsage} />
        <SessionResumePrompt session={resumeCandidate} onDecision={handleResumeDecision} />
      </Box>
    );
  }

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
