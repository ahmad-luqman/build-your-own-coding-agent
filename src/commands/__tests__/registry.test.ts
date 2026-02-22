import { describe, expect, test } from "bun:test";
import { createCommandRegistry } from "../registry.js";

describe("createCommandRegistry", () => {
  const registry = createCommandRegistry();

  test("registers all expected commands", () => {
    const names = [...registry.keys()];
    expect(names).toContain("clear");
    expect(names).toContain("cost");
    expect(names).toContain("exit");
    expect(names).toContain("help");
    expect(names).toContain("load");
    expect(names).toContain("model");
    expect(names).toContain("save");
    expect(names).toContain("sessions");
  });

  test("registers quit as alias for exit", () => {
    const exitCmd = registry.get("exit");
    const quitCmd = registry.get("quit");
    expect(exitCmd).toBeDefined();
    expect(quitCmd).toBe(exitCmd);
  });

  test("every command has a name and description", () => {
    for (const [, cmd] of registry) {
      expect(cmd.name).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.execute).toBe("function");
    }
  });

  test("help command is included and self-referencing", () => {
    const helpCmd = registry.get("help");
    expect(helpCmd).toBeDefined();
    expect(helpCmd!.name).toBe("help");
  });

  test("alias keys point to same object as canonical name", () => {
    const exitCmd = registry.get("exit");
    const quitCmd = registry.get("quit");
    // Same object reference — not a copy
    expect(quitCmd).toBe(exitCmd);
    expect(exitCmd!.name).toBe("exit");
  });

  test("unique command count excludes alias duplicates", () => {
    const uniqueCommands = new Set(registry.values());
    // quit is an alias for exit, so unique count should be less than keys count
    expect(uniqueCommands.size).toBeLessThan(registry.size);
  });
});
