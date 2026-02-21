import React from "react";
import { Box, Text } from "ink";
import { TextInput } from "@inkjs/ui";

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export function InputBar({ onSubmit, isLoading }: Props) {
  if (isLoading) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">⏳ Thinking...</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text bold color="cyan">&gt; </Text>
      <TextInput
        placeholder="Ask me anything..."
        onSubmit={onSubmit}
      />
    </Box>
  );
}
