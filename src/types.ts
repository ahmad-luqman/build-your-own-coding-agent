import type { ModelMessage } from "ai";
import type { z } from "zod";

// --- Agent Events (yielded from the agent loop) ---

export type AgentEvent =
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

export interface AgentConfig {
  modelId: string;
  apiKey: string;
  systemPrompt: string;
  cwd: string;
  maxTurns: number;
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
