import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSystemPrompt,
  CONTEXT_FILES,
  loadProjectContext,
  MAX_CONTEXT_LENGTH,
} from "../project-context.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ctx-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// --- Constants ---

describe("constants", () => {
  test("CONTEXT_FILES contains expected file names in priority order", () => {
    expect(CONTEXT_FILES).toEqual(["CLAUDE.md", "AGENTS.md", "CONTEXT.md", ".agent/context.md"]);
  });

  test("MAX_CONTEXT_LENGTH is 4000", () => {
    expect(MAX_CONTEXT_LENGTH).toBe(4000);
  });
});

// --- loadProjectContext ---

describe("loadProjectContext", () => {
  test("returns null when no context file exists", async () => {
    const result = await loadProjectContext(tempDir);
    expect(result).toBeNull();
  });

  test("reads CLAUDE.md when it exists", async () => {
    await writeFile(join(tempDir, "CLAUDE.md"), "# Project\nThis is a test project.");
    const result = await loadProjectContext(tempDir);
    expect(result).not.toBeNull();
    expect(result!.fileName).toBe("CLAUDE.md");
    expect(result!.content).toBe("# Project\nThis is a test project.");
    expect(result!.truncated).toBe(false);
  });

  test("CLAUDE.md takes priority over AGENTS.md", async () => {
    await writeFile(join(tempDir, "CLAUDE.md"), "claude content");
    await writeFile(join(tempDir, "AGENTS.md"), "agents content");
    const result = await loadProjectContext(tempDir);
    expect(result!.fileName).toBe("CLAUDE.md");
    expect(result!.content).toBe("claude content");
  });

  test("falls back to AGENTS.md when CLAUDE.md is missing", async () => {
    await writeFile(join(tempDir, "AGENTS.md"), "agents content");
    const result = await loadProjectContext(tempDir);
    expect(result!.fileName).toBe("AGENTS.md");
    expect(result!.content).toBe("agents content");
  });

  test("falls back to CONTEXT.md", async () => {
    await writeFile(join(tempDir, "CONTEXT.md"), "context content");
    const result = await loadProjectContext(tempDir);
    expect(result!.fileName).toBe("CONTEXT.md");
  });

  test("falls back to .agent/context.md", async () => {
    await mkdir(join(tempDir, ".agent"), { recursive: true });
    await writeFile(join(tempDir, ".agent", "context.md"), "agent context");
    const result = await loadProjectContext(tempDir);
    expect(result!.fileName).toBe(".agent/context.md");
    expect(result!.content).toBe("agent context");
  });

  test("truncates content exceeding MAX_CONTEXT_LENGTH", async () => {
    const longContent = "x".repeat(5000);
    await writeFile(join(tempDir, "CLAUDE.md"), longContent);
    const result = await loadProjectContext(tempDir);
    expect(result!.content).toHaveLength(MAX_CONTEXT_LENGTH);
    expect(result!.truncated).toBe(true);
  });

  test("logs warning for oversized files exceeding SIZE_WARNING_THRESHOLD", async () => {
    const errorSpy = mock(() => {});
    const origError = console.error;
    console.error = errorSpy as any;

    try {
      // SIZE_WARNING_THRESHOLD = MAX_CONTEXT_LENGTH * 4 = 16000
      const hugeContent = "a".repeat(MAX_CONTEXT_LENGTH * 4 + 1);
      await writeFile(join(tempDir, "CLAUDE.md"), hugeContent);
      const result = await loadProjectContext(tempDir);
      expect(result!.truncated).toBe(true);
      const warningCalls = (errorSpy as any).mock.calls.filter((call: any[]) =>
        String(call[0]).includes("Warning:"),
      );
      expect(warningCalls.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = origError;
    }
  });

  test("truncates at MAX_CONTEXT_LENGTH + 1 boundary", async () => {
    const content = "z".repeat(MAX_CONTEXT_LENGTH + 1);
    await writeFile(join(tempDir, "CLAUDE.md"), content);
    const result = await loadProjectContext(tempDir);
    expect(result!.content).toHaveLength(MAX_CONTEXT_LENGTH);
    expect(result!.truncated).toBe(true);
  });

  test("does not truncate content at exact boundary", async () => {
    const exactContent = "y".repeat(MAX_CONTEXT_LENGTH);
    await writeFile(join(tempDir, "CLAUDE.md"), exactContent);
    const result = await loadProjectContext(tempDir);
    expect(result!.content).toHaveLength(MAX_CONTEXT_LENGTH);
    expect(result!.truncated).toBe(false);
  });

  test("returns empty content for empty file", async () => {
    await writeFile(join(tempDir, "CLAUDE.md"), "");
    const result = await loadProjectContext(tempDir);
    expect(result).not.toBeNull();
    expect(result!.content).toBe("");
    expect(result!.truncated).toBe(false);
  });

  test("gracefully skips unreadable files and returns null", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    await writeFile(filePath, "secret");
    await chmod(filePath, 0o000);

    // chmod 000 doesn't prevent reads when running as root (CAP_DAC_OVERRIDE).
    // Detect this and skip the assertion if we're in a privileged environment.
    let isPrivileged = false;
    try {
      const { readFile } = await import("node:fs/promises");
      await readFile(filePath, "utf-8");
      isPrivileged = true;
    } catch {
      // Expected — we are not root
    }

    if (!isPrivileged) {
      const result = await loadProjectContext(tempDir);
      expect(result).toBeNull();
    }

    await chmod(filePath, 0o644);
  });

  test("skips unreadable CLAUDE.md and falls back to AGENTS.md", async () => {
    const claudePath = join(tempDir, "CLAUDE.md");
    await writeFile(claudePath, "secret");
    await chmod(claudePath, 0o000);
    await writeFile(join(tempDir, "AGENTS.md"), "agents fallback");

    // Detect privileged runtime (root/CAP_DAC_OVERRIDE)
    let isPrivileged = false;
    try {
      const { readFile } = await import("node:fs/promises");
      await readFile(claudePath, "utf-8");
      isPrivileged = true;
    } catch {
      // Expected — we are not root
    }

    const result = await loadProjectContext(tempDir);
    if (isPrivileged) {
      // Root can read everything — CLAUDE.md wins
      expect(result!.fileName).toBe("CLAUDE.md");
    } else {
      // Normal user — CLAUDE.md skipped, falls back to AGENTS.md
      expect(result!.fileName).toBe("AGENTS.md");
      expect(result!.content).toBe("agents fallback");
    }

    await chmod(claudePath, 0o644);
  });

  test("logs warning for unexpected errors (not ENOENT/EACCES)", async () => {
    const errorSpy = mock(() => {});
    const origError = console.error;
    console.error = errorSpy as any;

    try {
      // Use a directory as if it were a file — causes EISDIR on readFile
      await mkdir(join(tempDir, "CLAUDE.md"), { recursive: true });
      const result = await loadProjectContext(tempDir);
      // Should not return the "directory" as context
      expect(result).toBeNull();
      // Should have logged a warning for the unexpected error
      const warningCalls = (errorSpy as any).mock.calls.filter((call: any[]) =>
        String(call[0]).includes("Warning: Failed to read"),
      );
      expect(warningCalls.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = origError;
    }
  });
});

// --- buildSystemPrompt ---

describe("buildSystemPrompt", () => {
  const basePrompt = "You are a helpful assistant.";

  test("returns base prompt when context is null", () => {
    const result = buildSystemPrompt(basePrompt, null);
    expect(result).toBe(basePrompt);
  });

  test("appends context section with file name", () => {
    const context = {
      fileName: "CLAUDE.md" as const,
      content: "# My Project\nUse bun for everything.",
      truncated: false,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).toContain(basePrompt);
    expect(result).toContain("## Project Context (from CLAUDE.md)");
    expect(result).toContain("# My Project\nUse bun for everything.");
  });

  test("includes truncation notice when content was truncated", () => {
    const context = {
      fileName: "CLAUDE.md" as const,
      content: "x".repeat(MAX_CONTEXT_LENGTH),
      truncated: true,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).toContain("(truncated)");
  });

  test("does not include truncation notice when not truncated", () => {
    const context = {
      fileName: "CLAUDE.md" as const,
      content: "short content",
      truncated: false,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).not.toContain("truncated");
  });
});
