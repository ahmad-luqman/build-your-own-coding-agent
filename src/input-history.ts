/**
 * Manages input history for arrow-key navigation in the InputBar.
 * Cursor convention: -1 means "not navigating" (at draft/live position).
 * Items are stored oldest-first. On the first Up press the cursor jumps to
 * the newest entry (items.length - 1) and decrements toward 0 on subsequent presses.
 */
export class InputHistory {
  private items: string[] = [];
  private cursor = -1;
  private draft = "";

  /** Add a non-empty entry; skip if it duplicates the immediately preceding item (consecutive deduplication). Resets navigation. */
  push(item: string): void {
    if (!item) return;
    if (this.items.length > 0 && this.items[this.items.length - 1] === item) {
      this.reset();
      return;
    }
    this.items.push(item);
    this.reset();
  }

  /**
   * Save partially typed text before starting navigation so it can be restored.
   * Ignored when already navigating (cursor !== -1) to prevent overwriting a saved draft.
   */
  saveDraft(text: string): void {
    if (this.cursor === -1) {
      this.draft = text;
    }
  }

  /**
   * Move cursor backward (toward older entries).
   * Returns the item at the new cursor position, or undefined if history is empty.
   * When already at the oldest entry, the cursor stays and the same item is returned again.
   */
  navigateUp(): string | undefined {
    if (this.items.length === 0) return undefined;
    if (this.cursor === -1) {
      this.cursor = this.items.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    }
    return this.items[this.cursor];
  }

  /**
   * Move cursor forward (toward newer entries / draft).
   * Returns undefined immediately when not currently navigating (cursor = -1).
   * Returns the saved draft and resets the cursor when moving past the newest entry.
   * Otherwise returns the item at the advanced cursor position.
   */
  navigateDown(): string | undefined {
    if (this.cursor === -1) return undefined;
    if (this.cursor < this.items.length - 1) {
      this.cursor++;
      return this.items[this.cursor];
    }
    // Past the newest entry — return to draft position
    this.cursor = -1;
    return this.draft;
  }

  /** True when the user is mid-navigation (cursor is pointing at a history entry). */
  isNavigating(): boolean {
    return this.cursor !== -1;
  }

  /** Reset navigation state (cursor = -1, draft = ""). */
  reset(): void {
    this.cursor = -1;
    this.draft = "";
  }

  /** Number of history entries. */
  get size(): number {
    return this.items.length;
  }
}
