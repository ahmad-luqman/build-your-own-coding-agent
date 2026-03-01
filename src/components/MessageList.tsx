import { Box, Text } from "ink";
import { renderMarkdown } from "../markdown.js";
import type { DisplayMessage, DisplayToolCall } from "../types.js";

interface Props {
  messages: DisplayMessage[];
  streamingText: string;
  activeToolCalls?: DisplayToolCall[];
}

export function MessageList({ messages, streamingText, activeToolCalls }: Props) {
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
          {msg.toolCalls?.map((tc) => (
            <Box key={tc.toolCallId} marginLeft={2} flexDirection="column">
              <Text color="yellow">
                {">"} {tc.toolName}
                <Text dimColor> {formatToolInput(tc.toolName, tc.input)}</Text>
              </Text>
              {tc.result && (
                <Box marginLeft={2}>
                  <Text color={tc.result.success ? "gray" : "red"} dimColor wrap="wrap">
                    {tc.result.success
                      ? truncate(tc.result.output, 300)
                      : `Error: ${tc.result.error}`}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
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

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}
