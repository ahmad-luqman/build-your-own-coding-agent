import { describe, expect, test } from "bun:test";
import type { Hook, HookContext } from "../../types.js";
import { HookManager } from "../manager.js";

function makeCtx(overrides: Partial<HookContext> = {}): HookContext {
  return {
    toolName: "bash",
    input: { command: "echo hi" },
    ...overrides,
  };
}

describe("HookManager", () => {
  test("allows when no hooks registered", async () => {
    const manager = new HookManager();
    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(true);
  });

  test("runs matching hooks", async () => {
    const manager = new HookManager();
    const hook: Hook = {
      event: "pre-tool-use",
      name: "test-hook",
      handler: async () => ({ allowed: true }),
    };
    manager.register(hook);

    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(true);
  });

  test("blocks when a hook denies", async () => {
    const manager = new HookManager();
    manager.register({
      event: "pre-tool-use",
      name: "blocker",
      handler: async () => ({ allowed: false, reason: "Blocked" }),
    });

    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("Blocked");
    }
  });

  test("first rejection wins with multiple hooks", async () => {
    const manager = new HookManager();
    manager.register({
      event: "pre-tool-use",
      name: "hook-1",
      handler: async () => ({ allowed: false, reason: "First blocker" }),
    });
    manager.register({
      event: "pre-tool-use",
      name: "hook-2",
      handler: async () => ({ allowed: false, reason: "Second blocker" }),
    });

    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("First blocker");
    }
  });

  test("ignores hooks for different events", async () => {
    const manager = new HookManager();
    manager.register({
      event: "post-tool-use",
      name: "post-hook",
      handler: async () => ({ allowed: false, reason: "Should not run" }),
    });

    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(true);
  });

  test("runs hooks sequentially — passes if all allow", async () => {
    const manager = new HookManager();
    const order: string[] = [];

    manager.register({
      event: "pre-tool-use",
      name: "hook-a",
      handler: async () => {
        order.push("a");
        return { allowed: true };
      },
    });
    manager.register({
      event: "pre-tool-use",
      name: "hook-b",
      handler: async () => {
        order.push("b");
        return { allowed: true };
      },
    });

    const decision = await manager.run("pre-tool-use", makeCtx());
    expect(decision.allowed).toBe(true);
    expect(order).toEqual(["a", "b"]);
  });
});
