/**
 * Manages input history for arrow-key navigation in the InputBar.
 * Cursor convention: -1 means "not navigating" (at draft/live position).
 * Items are stored oldest-first; cursor moves backward (toward 0) on Up.
 */
export class InputHistory {
  private items: string[] = [];
  private cursor = -1;
  private draft = "";

  /** Add a non-empty entry; skip if it duplicates the most recent item. Resets navigation. */
  push(item: string): void {
    if (!item) return;
    if (this.items.length > 0 && this.items[this.items.length - 1] === item) {
      this.reset();
      return;
    }
    this.items.push(item);
    this.reset();
  }

  /** Save partially typed text before starting navigation so it can be restored. */
  saveDraft(text: string): void {
    this.draft = text;
  }

  /**
   * Move cursor backward (toward older entries).
   * Returns the item at the new cursor position, or undefined if history is empty.
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
   * Returns the next item, or the saved draft when moving past the newest entry.
   * Returns undefined when not currently navigating.
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
