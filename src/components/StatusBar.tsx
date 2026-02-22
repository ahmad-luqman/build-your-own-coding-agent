import { Box, Text } from "ink";
import type { TokenUsage } from "../types.js";

interface Props {
  modelId: string;
  usage: TokenUsage;
  lastInputTokens?: number;
  contextLimit?: number;
}

export function StatusBar({ modelId, usage, lastInputTokens, contextLimit }: Props) {
  const shortModel = modelId.split("/").pop() ?? modelId;

  const contextPercent =
    lastInputTokens && contextLimit ? Math.round((lastInputTokens / contextLimit) * 100) : null;

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Text dimColor>
        <Text color="blue">{shortModel}</Text> | /exit to quit
      </Text>
      <Box gap={2}>
        {contextPercent !== null && (
          <Text dimColor>
            ctx: <Text color={contextPercent > 80 ? "yellow" : undefined}>{contextPercent}%</Text>
          </Text>
        )}
        {usage.totalTokens > 0 && (
          <Text dimColor>
            tokens: {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()}{" "}
            out
          </Text>
        )}
      </Box>
    </Box>
  );
}
