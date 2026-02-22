import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import { useMemo, useState } from "react";
import type { CommandDefinition } from "../types.js";

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  commands?: Map<string, CommandDefinition>;
}

export function InputBar({ onSubmit, isLoading, commands }: Props) {
  const [inputValue, setInputValue] = useState("");

  const suggestions = useMemo(() => {
    if (!commands || !inputValue.startsWith("/")) return undefined;

    const partial = inputValue.slice(1).toLowerCase();
    if (!partial) {
      return [...commands.keys()].map((name) => `/${name}`);
    }

    return [...commands.keys()]
      .filter((name) => name.startsWith(partial))
      .map((name) => `/${name}`);
  }, [inputValue, commands]);

  if (isLoading) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">⏳ Thinking...</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text bold color="cyan">
        &gt;{" "}
      </Text>
      <TextInput
        placeholder="Ask me anything..."
        suggestions={suggestions}
        onChange={setInputValue}
        onSubmit={(value) => {
          setInputValue("");
          onSubmit(value);
        }}
      />
    </Box>
  );
}
