import React from "react";
import { Box, Text, useInput } from "ink";

interface Props {
  toolName: string;
  input: Record<string, unknown>;
  onDecision: (approved: boolean) => void;
}

export function ApprovalPrompt({ toolName, input, onDecision }: Props) {
  useInput((char: string) => {
    if (char === "y" || char === "Y") {
      onDecision(true);
    } else if (char === "n" || char === "N" || char === "q") {
      onDecision(false);
    }
  });

  const preview = toolName === "bash" && typeof input.command === "string"
    ? input.command
    : toolName === "write_file" && typeof input.file_path === "string"
      ? `${input.file_path} (${typeof input.content === "string" ? input.content.length : "?"} chars)`
      : toolName === "edit_file" && typeof input.file_path === "string"
        ? input.file_path
        : JSON.stringify(input).slice(0, 100);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginY={1}>
      <Text bold color="yellow">
        Approve {toolName}?
      </Text>
      <Box marginLeft={2} marginY={1}>
        <Text wrap="wrap" dimColor>{preview}</Text>
      </Box>
      <Text>
        <Text color="green" bold>[y]</Text> approve
        <Text color="red" bold>[n]</Text> deny
      </Text>
    </Box>
  );
}
