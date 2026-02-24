import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
    expect(result!.filePath).toBe(join(tempDir, "CLAUDE.md"));
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
    // Create a file we can't read
    const filePath = join(tempDir, "CLAUDE.md");
    await writeFile(filePath, "secret");
    await chmod(filePath, 0o000);

    const result = await loadProjectContext(tempDir);
    // Should return null since the only file is unreadable
    expect(result).toBeNull();

    // Restore permissions for cleanup
    await chmod(filePath, 0o644);
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
      filePath: "/project/CLAUDE.md",
      fileName: "CLAUDE.md",
      content: "# My Project\nUse bun for everything.",
      truncated: false,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).toContain(basePrompt);
    expect(result).toContain("CLAUDE.md");
    expect(result).toContain("# My Project\nUse bun for everything.");
  });

  test("includes truncation notice when content was truncated", () => {
    const context = {
      filePath: "/project/CLAUDE.md",
      fileName: "CLAUDE.md",
      content: "x".repeat(MAX_CONTEXT_LENGTH),
      truncated: true,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).toContain("truncated");
  });

  test("does not include truncation notice when not truncated", () => {
    const context = {
      filePath: "/project/CLAUDE.md",
      fileName: "CLAUDE.md",
      content: "short content",
      truncated: false,
    };
    const result = buildSystemPrompt(basePrompt, context);
    expect(result).not.toContain("truncated");
  });
});
