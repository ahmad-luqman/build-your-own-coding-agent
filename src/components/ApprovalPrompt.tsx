import { Box, Text, useInput } from "ink";

interface Props {
  toolName: string;
  input: Record<string, unknown>;
  onDecision: (approved: boolean) => void;
}

export function formatPreview(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "bash":
      return typeof input.command === "string"
        ? input.command
        : JSON.stringify(input).slice(0, 100);
    case "write_file": {
      if (typeof input.file_path === "string") {
        const chars = typeof input.content === "string" ? input.content.length : "?";
        return `${input.file_path} (${chars} chars)`;
      }
      return JSON.stringify(input).slice(0, 100);
    }
    case "edit_file":
      return typeof input.file_path === "string"
        ? input.file_path
        : JSON.stringify(input).slice(0, 100);
    case "multi_edit": {
      if (!Array.isArray(input.edits)) return JSON.stringify(input).slice(0, 100);
      const edits = input.edits as Array<{ file_path: string }>;
      const byFile = new Map<string, number>();
      for (const e of edits) {
        byFile.set(e.file_path, (byFile.get(e.file_path) ?? 0) + 1);
      }
      const lines = [
        `${edits.length} edit${edits.length === 1 ? "" : "s"} across ${byFile.size} file${byFile.size === 1 ? "" : "s"}:`,
      ];
      for (const [path, count] of byFile) {
        lines.push(`  ${path} (${count} edit${count === 1 ? "" : "s"})`);
      }
      return lines.join("\n");
    }
    default:
      return JSON.stringify(input).slice(0, 100);
  }
}

export function ApprovalPrompt({ toolName, input, onDecision }: Props) {
  useInput((char: string) => {
    if (char === "y" || char === "Y") {
      onDecision(true);
    } else if (char === "n" || char === "N" || char === "q") {
      onDecision(false);
    }
  });

  const preview = formatPreview(toolName, input);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginY={1}>
      <Text bold color="yellow">
        Approve {toolName}?
      </Text>
      <Box marginLeft={2} marginY={1}>
        <Text wrap="wrap" dimColor>
          {preview}
        </Text>
      </Box>
      <Text>
        <Text color="green" bold>
          [y]
        </Text>{" "}
        approve
        <Text color="red" bold>
          [n]
        </Text>{" "}
        deny
      </Text>
    </Box>
  );
}
