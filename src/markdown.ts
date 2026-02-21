import { Marked } from "marked";
import markedTerminal from "marked-terminal";

const marked = new Marked(markedTerminal() as any);

export function renderMarkdown(text: string): string {
  try {
    const result = marked.parse(text);
    if (typeof result === "string") {
      return result.trimEnd();
    }
    return text;
  } catch {
    return text;
  }
}
