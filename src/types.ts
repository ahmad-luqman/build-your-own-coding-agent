import type { ModelMessage } from "ai";
import type { z } from "zod";

// --- Agent Events (yielded from the agent loop) ---

export type AgentEvent =
  | { type: "turn-start"; turn: number; maxTurns: number }
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolName: string; input: Record<string, unknown>; toolCallId: string }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: ToolResult }
  | { type: "finish"; usage: TokenUsage }
  | { type: "error"; error: Error };

// --- Tool System ---

export interface ToolResult {
  success: boolean;
  /** Human-readable summary for TUI display */
  output: string;
  /** Structured data returned to the model for better reasoning */
  data?: Record<string, unknown>;
  error?: string;
}

export interface ToolContext {
  cwd: string;
  abortSignal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  dangerous?: boolean; // requires approval
  execute: (input: any, ctx: ToolContext) => Promise<ToolResult>;
}

// --- Hooks ---

export type HookEvent = "pre-tool-use" | "post-tool-use";

export interface HookContext {
  toolName: string;
  input: Record<string, unknown>;
  result?: ToolResult;
}

export type HookDecision = { allowed: true } | { allowed: false; reason: string };
export type HookHandler = (ctx: HookContext) => Promise<HookDecision> | HookDecision;

export interface Hook {
  event: HookEvent;
  name: string;
  handler: HookHandler;
}

// --- Config ---

export type Provider = "openrouter" | "ollama";

export interface AgentConfig {
  provider: Provider;
  modelId: string;
  apiKey?: string;
  baseURL?: string;
  systemPrompt: string;
  cwd: string;
  maxTurns: number;
  sessionsDir: string;
}

// --- Token Tracking ---

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// --- Display ---

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: DisplayToolCall[];
  timestamp: number;
}

export interface DisplayToolCall {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  status: "pending" | "running" | "done" | "error";
}

// --- Session ---

export interface SessionState {
  messages: ModelMessage[];
  displayMessages: DisplayMessage[];
  totalUsage: TokenUsage;
}

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  modelId: string;
  messageCount: number;
  cwd: string;
}

export interface SessionFile {
  version: 1;
  metadata: SessionMetadata;
  state: SessionState;
}

export interface SessionListEntry extends SessionMetadata {
  filename: string;
}

// --- Context Compaction ---

export interface CompactionResult {
  messages: ModelMessage[];
  displayMessages: DisplayMessage[];
  compacted: boolean;
  summary?: string;
}

// --- Slash Commands ---

export interface CommandContext {
  config: Readonly<AgentConfig>;
  setMessages: (msgs: ModelMessage[]) => void;
  setDisplayMessages: (updater: (prev: DisplayMessage[]) => DisplayMessage[]) => void;
  totalUsage: TokenUsage;
  setTotalUsage: (usage: TokenUsage) => void;
  saveSession: (name?: string) => Promise<void>;
  setModel: (modelId: string) => void;
  compactMessages?: () => Promise<CompactionResult>;
  exit: () => void;
}

export interface CommandResult {
  /** Displayed as an assistant message */
  message?: string;
  /** Displayed as an error message */
  error?: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  execute: (args: string, ctx: CommandContext) => Promise<CommandResult> | CommandResult;
}
