import { describe, expect, test } from "bun:test";
import { createToolRegistry } from "../registry.js";

describe("createToolRegistry", () => {
  const registry = createToolRegistry();

  test("registers all 6 tools", () => {
    expect(registry.size).toBe(6);
  });

  test("contains expected tool names", () => {
    const names = [...registry.keys()];
    expect(names).toContain("read_file");
    expect(names).toContain("glob");
    expect(names).toContain("grep");
    expect(names).toContain("write_file");
    expect(names).toContain("edit_file");
    expect(names).toContain("bash");
  });

  test("marks bash as dangerous", () => {
    expect(registry.get("bash")?.dangerous).toBe(true);
  });

  test("marks write_file as dangerous", () => {
    expect(registry.get("write_file")?.dangerous).toBe(true);
  });

  test("marks edit_file as dangerous", () => {
    expect(registry.get("edit_file")?.dangerous).toBe(true);
  });

  test("read_file is not dangerous", () => {
    expect(registry.get("read_file")?.dangerous).toBeFalsy();
  });

  test("glob is not dangerous", () => {
    expect(registry.get("glob")?.dangerous).toBeFalsy();
  });

  test("grep is not dangerous", () => {
    expect(registry.get("grep")?.dangerous).toBeFalsy();
  });
});
