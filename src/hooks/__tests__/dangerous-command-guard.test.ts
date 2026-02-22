import { describe, expect, test } from "bun:test";
import type { HookContext, ToolDefinition } from "../../types.js";
import { createDangerousCommandGuard } from "../dangerous-command-guard.js";

function makeTools(dangerous = true): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>();
  tools.set("bash", {
    name: "bash",
    description: "Run commands",
    inputSchema: {} as any,
    dangerous,
    execute: async () => ({ success: true, output: "" }),
  });
  tools.set("read_file", {
    name: "read_file",
    description: "Read files",
    inputSchema: {} as any,
    dangerous: false,
    execute: async () => ({ success: true, output: "" }),
  });
  tools.set("write_file", {
    name: "write_file",
    description: "Write files",
    inputSchema: {} as any,
    dangerous,
    execute: async () => ({ success: true, output: "" }),
  });
  return tools;
}

describe("createDangerousCommandGuard", () => {
  test("allows safe tools without approval", async () => {
    const tools = makeTools();
    const guard = createDangerousCommandGuard(tools, async () => false);

    const ctx: HookContext = { toolName: "read_file", input: { file_path: "test.txt" } };
    const decision = await guard.handler(ctx);
    expect(decision.allowed).toBe(true);
  });

  test("requests approval for dangerous tools", async () => {
    const tools = makeTools();
    let approvalRequested = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      approvalRequested = true;
      return true;
    });

    const ctx: HookContext = { toolName: "write_file", input: { file_path: "test.txt" } };
    const decision = await guard.handler(ctx);
    expect(decision.allowed).toBe(true);
    expect(approvalRequested).toBe(true);
  });

  test("blocks when user denies dangerous tool", async () => {
    const tools = makeTools();
    const guard = createDangerousCommandGuard(tools, async () => false);

    const ctx: HookContext = { toolName: "write_file", input: { file_path: "test.txt" } };
    const decision = await guard.handler(ctx);
    expect(decision.allowed).toBe(false);
  });

  test("detects rm -rf pattern in bash", async () => {
    const tools = makeTools();
    let approvalRequested = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      approvalRequested = true;
      return false;
    });

    const ctx: HookContext = { toolName: "bash", input: { command: "rm -rf /" } };
    const decision = await guard.handler(ctx);
    expect(approvalRequested).toBe(true);
    expect(decision.allowed).toBe(false);
  });

  test("detects sudo pattern", async () => {
    const tools = makeTools();
    let approvalRequested = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      approvalRequested = true;
      return true;
    });

    const ctx: HookContext = { toolName: "bash", input: { command: "sudo apt install foo" } };
    await guard.handler(ctx);
    expect(approvalRequested).toBe(true);
  });

  test("detects git push --force", async () => {
    const tools = makeTools();
    let approvalRequested = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      approvalRequested = true;
      return false;
    });

    const ctx: HookContext = {
      toolName: "bash",
      input: { command: "git push --force origin main" },
    };
    const decision = await guard.handler(ctx);
    expect(approvalRequested).toBe(true);
    expect(decision.allowed).toBe(false);
  });

  test("detects git reset --hard", async () => {
    const tools = makeTools();
    let called = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      called = true;
      return true;
    });

    const ctx: HookContext = { toolName: "bash", input: { command: "git reset --hard HEAD~3" } };
    await guard.handler(ctx);
    expect(called).toBe(true);
  });

  test("regular bash commands still request generic approval", async () => {
    const tools = makeTools();
    let approvalRequested = false;
    const guard = createDangerousCommandGuard(tools, async () => {
      approvalRequested = true;
      return true;
    });

    const ctx: HookContext = { toolName: "bash", input: { command: "echo hello" } };
    const decision = await guard.handler(ctx);
    expect(approvalRequested).toBe(true);
    expect(decision.allowed).toBe(true);
  });

  test("allows unknown tools not in registry", async () => {
    const tools = makeTools();
    const guard = createDangerousCommandGuard(tools, async () => false);

    const ctx: HookContext = { toolName: "unknown_tool", input: {} };
    const decision = await guard.handler(ctx);
    expect(decision.allowed).toBe(true);
  });
});
