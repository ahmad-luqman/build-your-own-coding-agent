import { TextInput } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import { useMemo, useState } from "react";
import { InputHistory } from "../input-history.js";
import type { ProgressState } from "../progress.js";
import type { CommandDefinition } from "../types.js";

function formatProgressText(progress?: ProgressState): string {
  if (!progress || progress.currentTurn === 0) {
    return "⏳ Thinking...";
  }
  const turn = `Turn ${progress.currentTurn}/${progress.maxTurns}`;
  const status = progress.activeTool ? `Running ${progress.activeTool}...` : "Thinking...";
  return `⏳ ${turn} | ${status}`;
}

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  commands?: Map<string, CommandDefinition>;
  progress?: ProgressState;
}

export function InputBar({ onSubmit, isLoading, commands, progress }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [remountKey, setRemountKey] = useState(0);
  const [historyValue, setHistoryValue] = useState("");
  const history = useMemo(() => new InputHistory(), []);

  useInput(
    (_, key) => {
      if (suggestions && suggestions.length > 0) return;
      if (key.upArrow) {
        if (!history.isNavigating()) history.saveDraft(inputValue);
        const val = history.navigateUp();
        if (val !== undefined) {
          setHistoryValue(val);
          setInputValue(val);
          setRemountKey((k) => k + 1);
        }
      }
      if (key.downArrow) {
        const val = history.navigateDown();
        if (val !== undefined) {
          setHistoryValue(val);
          setInputValue(val);
          setRemountKey((k) => k + 1);
        }
      }
    },
    { isActive: !isLoading },
  );

  const suggestions = useMemo(() => {
    if (!commands || !inputValue.startsWith("/")) return undefined;

    // Deduplicate: only use canonical command names, not alias keys
    const uniqueNames = new Set<string>();
    for (const cmd of commands.values()) {
      uniqueNames.add(cmd.name);
    }

    const partial = inputValue.slice(1).toLowerCase();
    const names = [...uniqueNames];
    if (!partial) {
      return names.map((name) => `/${name}`);
    }

    return names.filter((name) => name.startsWith(partial)).map((name) => `/${name}`);
  }, [inputValue, commands]);

  if (isLoading) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">{formatProgressText(progress)}</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text bold color="cyan">
        &gt;{" "}
      </Text>
      <TextInput
        key={remountKey}
        defaultValue={historyValue}
        placeholder="Ask me anything..."
        suggestions={suggestions}
        onChange={setInputValue}
        onSubmit={(value) => {
          if (value.trim()) history.push(value);
          history.reset();
          setHistoryValue("");
          setInputValue("");
          onSubmit(value);
        }}
      />
    </Box>
  );
}
