import { generateText, type ModelMessage } from "ai";
import type { AgentModel } from "../model.js";
import type { CompactionResult, DisplayMessage } from "../types.js";

const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Summarize the following conversation history concisely but completely. Preserve:
- Key decisions made
- Important file paths and code changes discussed
- Current task context and goals
- Any errors encountered and their resolutions
- Tool calls and their outcomes (briefly)

Output a clear, structured summary in 2-4 paragraphs. Do NOT include any preamble like "Here is a summary" — just output the summary directly.`;

const DEFAULT_RETAIN_COUNT = 6;

interface CompactOptions {
  model: AgentModel;
  messages: ModelMessage[];
  displayMessages: DisplayMessage[];
  retainCount?: number;
}

export async function compactMessages({
  model,
  messages,
  displayMessages,
  retainCount = DEFAULT_RETAIN_COUNT,
}: CompactOptions): Promise<CompactionResult> {
  if (messages.length <= retainCount) {
    return { messages, displayMessages, compacted: false };
  }

  const splitIndex = messages.length - retainCount;
  const toSummarize = messages.slice(0, splitIndex);
  const toRetain = messages.slice(splitIndex);

  // Build a text representation of messages to summarize
  const conversationText = toSummarize
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      return `${role}: ${content}`;
    })
    .join("\n\n");

  const { text: summary } = await generateText({
    model: model as any,
    system: SUMMARIZATION_PROMPT,
    messages: [{ role: "user", content: conversationText }],
  });

  // Create a summary message that replaces the old messages
  const summaryMessage: ModelMessage = {
    role: "user",
    content: `[Conversation summary — older messages were compacted to save context space]\n\n${summary}\n\n[End of summary — recent messages follow]`,
  };

  // Handle display messages similarly
  const displaySplitIndex = Math.max(0, displayMessages.length - retainCount);
  const retainedDisplay = displayMessages.slice(displaySplitIndex);

  const summaryDisplay: DisplayMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: `**Context compacted** — ${splitIndex} messages summarized to save context space.`,
    timestamp: Date.now(),
  };

  return {
    messages: [summaryMessage, ...toRetain],
    displayMessages: [summaryDisplay, ...retainedDisplay],
    compacted: true,
    summary,
  };
}
