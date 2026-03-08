import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "ink-testing-library";
import { ApprovalPrompt } from "../ApprovalPrompt.js";

describe("ApprovalPrompt", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders tool name in prompt", () => {
    const { lastFrame } = render(
      <ApprovalPrompt toolName="bash" input={{ command: "ls" }} onDecision={() => {}} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Approve bash?");
  });

  test("renders preview from formatPreview", () => {
    const { lastFrame } = render(
      <ApprovalPrompt toolName="bash" input={{ command: "npm test" }} onDecision={() => {}} />,
    );
    expect(lastFrame()!).toContain("npm test");
  });

  test("renders approve and deny labels", () => {
    const { lastFrame } = render(
      <ApprovalPrompt toolName="bash" input={{ command: "ls" }} onDecision={() => {}} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("[y]");
    expect(frame).toContain("approve");
    expect(frame).toContain("[n]");
    expect(frame).toContain("deny");
  });

  test("calls onDecision(true) when y is pressed", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("y");
    await Bun.sleep(10);
    expect(decision).toBe(true);
  });

  test("calls onDecision(true) when Y is pressed", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("Y");
    await Bun.sleep(10);
    expect(decision).toBe(true);
  });

  test("calls onDecision(false) when n is pressed", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("n");
    await Bun.sleep(10);
    expect(decision).toBe(false);
  });

  test("calls onDecision(false) when N is pressed", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("N");
    await Bun.sleep(10);
    expect(decision).toBe(false);
  });

  test("calls onDecision(false) when q is pressed", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("q");
    await Bun.sleep(10);
    expect(decision).toBe(false);
  });

  test("ignores other key presses", async () => {
    let decision = null as boolean | null;
    const { stdin } = render(
      <ApprovalPrompt
        toolName="bash"
        input={{ command: "ls" }}
        onDecision={(d) => {
          decision = d;
        }}
      />,
    );

    await Bun.sleep(50);
    stdin.write("x");
    await Bun.sleep(10);
    expect(decision).toBeNull();
  });

  test("renders multi_edit preview with file details", () => {
    const { lastFrame } = render(
      <ApprovalPrompt
        toolName="multi_edit"
        input={{ edits: [{ file_path: "a.ts" }, { file_path: "b.ts" }] }}
        onDecision={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Approve multi_edit?");
    expect(frame).toContain("2 edits across 2 files");
  });
});
