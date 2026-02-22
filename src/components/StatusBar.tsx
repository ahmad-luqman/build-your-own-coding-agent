import { Box, Text } from "ink";
import type { TokenUsage } from "../types.js";

interface Props {
  modelId: string;
  usage: TokenUsage;
}

export function StatusBar({ modelId, usage }: Props) {
  const shortModel = modelId.split("/").pop() ?? modelId;

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Text dimColor>
        <Text color="blue">{shortModel}</Text> | /exit to quit
      </Text>
      {usage.totalTokens > 0 && (
        <Text dimColor>
          tokens: {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()}{" "}
          out
        </Text>
      )}
    </Box>
  );
}
