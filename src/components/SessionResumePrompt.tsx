import { Box, Text, useInput } from "ink";
import type { SessionListEntry } from "../types.js";

interface Props {
  session: SessionListEntry;
  onDecision: (resume: boolean) => void;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionResumePrompt({ session, onDecision }: Props) {
  useInput((char: string) => {
    if (char === "y" || char === "Y") {
      onDecision(true);
    } else if (char === "n" || char === "N" || char === "q") {
      onDecision(false);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginY={1}>
      <Text bold color="cyan">
        Resume previous session?
      </Text>
      <Box flexDirection="column" marginLeft={2} marginY={1}>
        <Text>
          <Text dimColor>Name: </Text>
          <Text>{session.name}</Text>
        </Text>
        <Text>
          <Text dimColor>Messages: </Text>
          <Text>{session.messageCount}</Text>
        </Text>
        <Text>
          <Text dimColor>Model: </Text>
          <Text>{session.modelId}</Text>
        </Text>
        <Text>
          <Text dimColor>Last updated: </Text>
          <Text>{formatTimeAgo(session.updatedAt)}</Text>
        </Text>
        <Text>
          <Text dimColor>Directory: </Text>
          <Text>{session.cwd}</Text>
        </Text>
      </Box>
      <Text>
        <Text color="green" bold>
          [y]
        </Text>{" "}
        resume
        <Text color="red" bold>
          {" "}
          [n]
        </Text>{" "}
        start fresh
      </Text>
    </Box>
  );
}
