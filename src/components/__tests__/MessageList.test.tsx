import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render } from "ink-testing-library";
import type { DisplayMessage, DisplayToolCall } from "../../types.js";
import { MessageList } from "../MessageList.js";

afterEach(() => {
  cleanup();
});

// Wait for React effects to flush
const tick = () => new Promise<void>((r) => setTimeout(r, 50));

function makeToolCall(overrides: Partial<DisplayToolCall> = {}): DisplayToolCall {
  return {
    toolName: "read_file",
    toolCallId: `tc-${Math.random().toString(36).slice(2)}`,
    input: { file_path: "src/index.ts" },
    status: "done",
    result: { success: true, output: "file contents here", data: { totalLines: 10 } },
    ...overrides,
  };
}

function makeMessage(overrides: Partial<DisplayMessage> = {}): DisplayMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: "assistant",
    content: "Here is the file:",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("MessageList", () => {
  test("renders user messages", () => {
    const msg = makeMessage({ role: "user", content: "Hello" });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("You");
    expect(frame).toContain("Hello");
  });

  test("renders assistant messages", () => {
    const msg = makeMessage({ content: "I can help with that" });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Agent");
    expect(frame).toContain("I can help with that");
  });

  test("renders tool call with summary line", () => {
    const tc = makeToolCall();
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("read_file");
    expect(frame).toContain("src/index.ts (10 lines)");
  });

  test("auto-expands most recent tool call result", async () => {
    const tc = makeToolCall({
      toolCallId: "tc-expand",
      result: { success: true, output: "expanded content here", data: { totalLines: 3 } },
    });
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();
    const frame = lastFrame()!;
    expect(frame).toContain("expanded content here");
  });

  test("older tool calls are collapsed (output not shown)", async () => {
    const tc1 = makeToolCall({
      toolCallId: "tc-old",
      result: { success: true, output: "old content", data: { totalLines: 5 } },
    });
    const tc2 = makeToolCall({
      toolCallId: "tc-new",
      result: { success: true, output: "new content", data: { totalLines: 8 } },
    });
    const msg = makeMessage({ toolCalls: [tc1, tc2] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();
    const frame = lastFrame()!;
    expect(frame).toContain("new content");
    expect(frame).not.toContain("old content");
  });

  test("error results are always shown even when collapsed", async () => {
    const tcErr = makeToolCall({
      toolCallId: "tc-err",
      toolName: "bash",
      input: { command: "fail" },
      status: "error",
      result: { success: false, output: "", error: "command failed" },
    });
    const tcOk = makeToolCall({
      toolCallId: "tc-ok",
      result: { success: true, output: "ok", data: { totalLines: 1 } },
    });
    const msg = makeMessage({ toolCalls: [tcErr, tcOk] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();
    const frame = lastFrame()!;
    expect(frame).toContain("command failed");
  });

  test("renders streaming text", () => {
    const { lastFrame } = render(
      <MessageList
        messages={[]}
        streamingText="thinking about it..."
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Agent");
    expect(frame).toContain("thinking about it...");
  });

  test("renders active tool calls with streaming output", () => {
    const active: DisplayToolCall = {
      toolName: "bash",
      toolCallId: "tc-active",
      input: { command: "npm test" },
      status: "running",
      streamingOutput: "PASS src/test.ts",
    };
    const { lastFrame } = render(
      <MessageList
        messages={[]}
        streamingText=""
        activeToolCalls={[active]}
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("bash");
    expect(frame).toContain("npm test");
    expect(frame).toContain("PASS src/test.ts");
  });

  test("active tool calls with completed result", () => {
    const active: DisplayToolCall = {
      toolName: "bash",
      toolCallId: "tc-active-done",
      input: { command: "echo hi" },
      status: "done",
      result: { success: true, output: "hi\n" },
    };
    const { lastFrame } = render(
      <MessageList
        messages={[]}
        streamingText=""
        activeToolCalls={[active]}
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("hi");
  });

  test("active tool calls with error result", () => {
    const active: DisplayToolCall = {
      toolName: "bash",
      toolCallId: "tc-active-err",
      input: { command: "bad" },
      status: "error",
      result: { success: false, output: "", error: "not found" },
    };
    const { lastFrame } = render(
      <MessageList
        messages={[]}
        streamingText=""
        activeToolCalls={[active]}
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Error: not found");
  });

  test("browse mode shows chevrons", async () => {
    const tc = makeToolCall({ toolCallId: "tc-browse" });
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={true}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();
    const frame = lastFrame()!;
    expect(frame).toMatch(/[▾▸]/);
  });

  test("browse mode exits when no tool calls", async () => {
    const onBrowseModeChange = mock(() => {});
    render(
      <MessageList
        messages={[]}
        streamingText=""
        browseMode={true}
        onBrowseModeChange={onBrowseModeChange}
      />,
    );
    await tick();
    expect(onBrowseModeChange).toHaveBeenCalledWith(false);
  });

  test("keyboard: Escape exits browse mode", async () => {
    const onBrowseModeChange = mock(() => {});
    const tc = makeToolCall({ toolCallId: "tc-esc" });
    const msg = makeMessage({ toolCalls: [tc] });
    const { stdin } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={true}
        onBrowseModeChange={onBrowseModeChange}
      />,
    );
    await tick();
    stdin.write("\x1B"); // Escape
    await tick();
    expect(onBrowseModeChange).toHaveBeenCalledWith(false);
  });

  test("keyboard: Enter toggles expand/collapse in browse mode", async () => {
    const tc = makeToolCall({
      toolCallId: "tc-toggle",
      result: { success: true, output: "toggle me", data: { totalLines: 5 } },
    });
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame, stdin } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={true}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();

    // Initially auto-expanded (most recent)
    expect(lastFrame()!).toContain("toggle me");

    // Press Enter to collapse
    stdin.write("\r");
    await tick();
    expect(lastFrame()!).not.toContain("toggle me");

    // Press Enter again to expand
    stdin.write("\r");
    await tick();
    expect(lastFrame()!).toContain("toggle me");
  });

  test("keyboard: arrow keys navigate focus", async () => {
    const tc1 = makeToolCall({
      toolCallId: "tc-nav-1",
      toolName: "read_file",
      input: { file_path: "first.ts" },
      result: { success: true, output: "first content", data: { totalLines: 1 } },
    });
    const tc2 = makeToolCall({
      toolCallId: "tc-nav-2",
      toolName: "read_file",
      input: { file_path: "second.ts" },
      result: { success: true, output: "second content", data: { totalLines: 2 } },
    });
    const msg = makeMessage({ toolCalls: [tc1, tc2] });
    const { lastFrame, stdin } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={true}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();

    // Focus starts on last item (tc2). Press up to move to tc1.
    stdin.write("\x1B[A"); // Up arrow
    await tick();

    // Now press Enter to expand tc1 (which was collapsed)
    stdin.write("\r");
    await tick();
    expect(lastFrame()!).toContain("first content");

    // Press down to move back to tc2
    stdin.write("\x1B[B"); // Down arrow
    await tick();

    // Press Enter to collapse tc2 (which was auto-expanded)
    stdin.write("\r");
    await tick();
    expect(lastFrame()!).not.toContain("second content");
  });

  test("tool call without result shows formatToolInput", () => {
    const tc: DisplayToolCall = {
      toolName: "read_file",
      toolCallId: "tc-pending",
      input: { file_path: "pending.ts" },
      status: "pending",
    };
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("pending.ts");
  });

  test("renders without active tool calls prop", () => {
    const { lastFrame } = render(
      <MessageList
        messages={[]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    expect(lastFrame()).toBeDefined();
  });

  test("truncates long tool output in expanded view", async () => {
    const longOutput = "x".repeat(3000);
    const tc = makeToolCall({
      toolCallId: "tc-long",
      result: { success: true, output: longOutput, data: { totalLines: 100 } },
    });
    const msg = makeMessage({ toolCalls: [tc] });
    const { lastFrame } = render(
      <MessageList
        messages={[msg]}
        streamingText=""
        browseMode={false}
        onBrowseModeChange={() => {}}
      />,
    );
    await tick();
    const frame = lastFrame()!;
    // Output should be truncated (2000 chars max + "...")
    expect(frame).toContain("...");
    // Should not contain the full 3000-char string
    expect(frame).not.toContain(longOutput);
  });
});
