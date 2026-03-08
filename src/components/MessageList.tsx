import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "../markdown.js";
import type { DisplayMessage, DisplayToolCall } from "../types.js";

interface Props {
  messages: DisplayMessage[];
  streamingText: string;
  activeToolCalls?: DisplayToolCall[];
  browseMode: boolean;
  onBrowseModeChange: (active: boolean) => void;
}

export function MessageList({
  messages,
  streamingText,
  activeToolCalls,
  browseMode,
  onBrowseModeChange,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(-1);

  // Flat list of all completed tool call IDs for keyboard navigation
  const allToolCallIds = useMemo(() => {
    const ids: string[] = [];
    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.result) ids.push(tc.toolCallId);
        }
      }
    }
    return ids;
  }, [messages]);

  // Auto-expand most recent tool result, collapse previous latest
  const prevLatestRef = useRef<string | null>(null);
  useEffect(() => {
    if (allToolCallIds.length === 0) {
      prevLatestRef.current = null;
      return;
    }
    const latest = allToolCallIds[allToolCallIds.length - 1];
    if (latest !== prevLatestRef.current) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (prevLatestRef.current) next.delete(prevLatestRef.current);
        next.add(latest);
        return next;
      });
      prevLatestRef.current = latest;
    }
  }, [allToolCallIds]);

  // Reset state when messages are cleared (Ctrl+L)
  useEffect(() => {
    if (messages.length === 0) {
      setExpandedIds(new Set());
      setFocusIndex(-1);
      prevLatestRef.current = null;
    }
  }, [messages.length]);

  // When entering browse mode, focus the most recent tool call
  useEffect(() => {
    if (browseMode && allToolCallIds.length > 0) {
      setFocusIndex(allToolCallIds.length - 1);
    }
    if (browseMode && allToolCallIds.length === 0) {
      onBrowseModeChange(false);
    }
  }, [browseMode, allToolCallIds.length, onBrowseModeChange]);

  // Keyboard navigation in browse mode
  useInput(
    (_input, key) => {
      if (key.escape) {
        onBrowseModeChange(false);
        return;
      }
      if (key.upArrow) {
        setFocusIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setFocusIndex((i) => Math.min(allToolCallIds.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const id = allToolCallIds[focusIndex];
        if (id) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }
      }
    },
    { isActive: browseMode },
  );

  const focusedId = browseMode ? allToolCallIds[focusIndex] : null;

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.map((msg) => (
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
          <Text bold color={msg.role === "user" ? "cyan" : "green"}>
            {msg.role === "user" ? "You" : "Agent"}
          </Text>
          <Box marginLeft={2}>
            <Text wrap="wrap">
              {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
            </Text>
          </Box>
          {msg.toolCalls?.map((tc) => {
            const isExpanded = expandedIds.has(tc.toolCallId);
            const isFocused = tc.toolCallId === focusedId;
            const chevron = browseMode ? (isExpanded ? "▾" : "▸") : ">";

            return (
              <Box key={tc.toolCallId} marginLeft={2} flexDirection="column">
                <Text color={isFocused ? "cyan" : "yellow"}>
                  {chevron} {tc.toolName}
                  <Text dimColor>
                    {" "}
                    {tc.result
                      ? formatToolSummary(tc.toolName, tc.input, tc.result)
                      : formatToolInput(tc.toolName, tc.input)}
                  </Text>
                </Text>
                {tc.result && isExpanded && tc.result.success && (
                  <Box marginLeft={2}>
                    <Text color="gray" dimColor wrap="wrap">
                      {truncate(tc.result.output, 2000)}
                    </Text>
                  </Box>
                )}
                {tc.result && !tc.result.success && (
                  <Box marginLeft={2}>
                    <Text color="red" dimColor wrap="wrap">
                      Error: {tc.result.error}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ))}

      {streamingText && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">
            Agent
          </Text>
          <Box marginLeft={2}>
            <Text wrap="wrap">{streamingText}</Text>
          </Box>
        </Box>
      )}

      {activeToolCalls?.map((tc) => (
        <Box key={tc.toolCallId} marginLeft={2} flexDirection="column">
          <Text color="yellow">
            {">"} {tc.toolName}
            <Text dimColor> {formatToolInput(tc.toolName, tc.input)}</Text>
          </Text>
          {tc.streamingOutput && (
            <Box marginLeft={2}>
              <Text color="gray" dimColor wrap="wrap">
                {truncate(tc.streamingOutput, 500)}
              </Text>
            </Box>
          )}
          {tc.result && (
            <Box marginLeft={2}>
              <Text color={tc.result.success ? "gray" : "red"} dimColor wrap="wrap">
                {tc.result.success ? truncate(tc.result.output, 300) : `Error: ${tc.result.error}`}
              </Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "read_file":
      return String(input.file_path ?? "");
    case "write_file":
      return String(input.file_path ?? "");
    case "edit_file":
      return String(input.file_path ?? "");
    case "glob":
      return String(input.pattern ?? "");
    case "grep":
      return `/${input.pattern}/ ${input.file_pattern ?? ""}`;
    case "bash":
      return String(input.command ?? "");
    default:
      return JSON.stringify(input).slice(0, 80);
  }
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

export function formatToolSummary(
  toolName: string,
  input: Record<string, unknown>,
  result: { success: boolean; output: string; data?: Record<string, unknown>; error?: string },
): string {
  const d = result.data;

  if (!result.success) {
    return result.error ? `Error: ${truncate(result.error, 80)}` : "Error";
  }

  switch (toolName) {
    case "read_file": {
      const path = String(input.file_path ?? "");
      const lines = d?.totalLines;
      return lines != null ? `${path} (${lines} lines)` : path;
    }
    case "grep": {
      const count = d?.count ?? 0;
      return `/${input.pattern}/ → ${count} match${count === 1 ? "" : "es"}`;
    }
    case "bash": {
      const cmd = truncate(String(input.command ?? ""), 40);
      const exit = d?.exitCode;
      return exit != null ? `${cmd} → exit ${exit}` : cmd;
    }
    case "write_file": {
      const path = String(input.file_path ?? "");
      const lines = d?.linesWritten;
      return lines != null ? `${path} (${lines} lines written)` : path;
    }
    case "edit_file": {
      const path = String(input.file_path ?? "");
      const line = d?.editLine;
      const added = d?.linesAdded;
      const removed = d?.linesRemoved;
      if (line != null && added != null && removed != null) {
        return `${path} (line ${line}, +${added}/-${removed})`;
      }
      return path;
    }
    case "glob": {
      const count = d?.count ?? 0;
      return `${input.pattern} → ${count} file${count === 1 ? "" : "s"}`;
    }
    case "tree": {
      const files = d?.totalFiles ?? 0;
      const dirs = d?.totalDirs ?? 0;
      const root = d?.root ?? input.path ?? ".";
      return `${root} (${files} files, ${dirs} dirs)`;
    }
    default:
      return `${formatToolInput(toolName, input)} → done`;
  }
}
