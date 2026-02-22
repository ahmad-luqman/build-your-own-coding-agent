import { describe, expect, test } from "bun:test";
import type { CommandDefinition } from "../../types.js";
import { createHelpCommand } from "../help.js";

describe("helpCommand", () => {
  function makeRegistry(): Map<string, CommandDefinition> {
    const reg = new Map<string, CommandDefinition>();
    reg.set("foo", {
      name: "foo",
      description: "Do foo",
      usage: "/foo <arg>",
      execute: () => ({}),
    });
    reg.set("bar", {
      name: "bar",
      description: "Do bar",
      execute: () => ({}),
    });
    return reg;
  }

  test("has correct name", () => {
    const helpCmd = createHelpCommand(new Map());
    expect(helpCmd.name).toBe("help");
  });

  test("lists all registered commands", () => {
    const reg = makeRegistry();
    const helpCmd = createHelpCommand(reg);
    const result = helpCmd.execute("", {} as any);
    const msg = (result as { message: string }).message;

    expect(msg).toContain("/foo <arg>");
    expect(msg).toContain("Do foo");
    expect(msg).toContain("/bar");
    expect(msg).toContain("Do bar");
  });

  test("uses command name as fallback when no usage specified", () => {
    const reg = makeRegistry();
    const helpCmd = createHelpCommand(reg);
    const result = helpCmd.execute("", {} as any);
    const msg = (result as { message: string }).message;

    // bar has no usage, should fall back to /bar
    expect(msg).toContain("/bar");
  });

  test("includes header text", () => {
    const reg = makeRegistry();
    const helpCmd = createHelpCommand(reg);
    const result = helpCmd.execute("", {} as any);
    const msg = (result as { message: string }).message;

    expect(msg).toContain("Available commands");
  });

  test("deduplicates aliased commands", () => {
    const reg = new Map<string, CommandDefinition>();
    const exitCmd: CommandDefinition = {
      name: "exit",
      description: "Exit the app",
      aliases: ["quit"],
      execute: () => ({}),
    };
    reg.set("exit", exitCmd);
    reg.set("quit", exitCmd); // same object reference (alias)

    const helpCmd = createHelpCommand(reg);
    const result = helpCmd.execute("", {} as any);
    const msg = (result as { message: string }).message;

    // "exit" should appear exactly once, not twice
    const exitMatches = msg.match(/Exit the app/g);
    expect(exitMatches).toHaveLength(1);
  });
});
