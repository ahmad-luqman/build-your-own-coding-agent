import { Marked } from "marked";
import * as mt from "marked-terminal";

const markedTerminal = (mt as any).markedTerminal ?? mt.default;

/** @internal Exported for test access only */
export const marked = new Marked(markedTerminal() as any);

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
