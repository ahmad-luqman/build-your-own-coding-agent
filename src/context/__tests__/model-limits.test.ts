import { describe, expect, test } from "bun:test";
import { getCompactionThreshold, getContextWindowLimit } from "../model-limits.js";

describe("getContextWindowLimit", () => {
  test("returns 200k for Claude 3.5 models", () => {
    expect(getContextWindowLimit("anthropic/claude-3.5-sonnet")).toBe(200_000);
    expect(getContextWindowLimit("anthropic/claude-3-5-haiku")).toBe(200_000);
  });

  test("returns 200k for Claude Sonnet 4 models", () => {
    expect(getContextWindowLimit("anthropic/claude-sonnet-4-20250514")).toBe(200_000);
  });

  test("returns 200k for Claude Opus models", () => {
    expect(getContextWindowLimit("anthropic/claude-opus-4")).toBe(200_000);
  });

  test("returns 200k for generic claude models", () => {
    expect(getContextWindowLimit("claude-instant")).toBe(200_000);
  });

  test("returns 128k for GPT-4o models", () => {
    expect(getContextWindowLimit("openai/gpt-4o")).toBe(128_000);
    expect(getContextWindowLimit("openai/gpt-4o-mini")).toBe(128_000);
  });

  test("returns 128k for GPT-4-turbo", () => {
    expect(getContextWindowLimit("openai/gpt-4-turbo")).toBe(128_000);
  });

  test("returns 8k for base GPT-4", () => {
    expect(getContextWindowLimit("openai/gpt-4")).toBe(8_192);
  });

  test("returns 200k for o1 models", () => {
    expect(getContextWindowLimit("openai/o1")).toBe(200_000);
    expect(getContextWindowLimit("openai/o1-mini")).toBe(200_000);
  });

  test("returns 200k for o3 models", () => {
    expect(getContextWindowLimit("openai/o3")).toBe(200_000);
  });

  test("returns 1M for Gemini models", () => {
    expect(getContextWindowLimit("google/gemini-pro")).toBe(1_000_000);
    expect(getContextWindowLimit("google/gemini-1.5-flash")).toBe(1_000_000);
  });

  test("returns 128k for DeepSeek models", () => {
    expect(getContextWindowLimit("deepseek/deepseek-coder")).toBe(128_000);
  });

  test("returns 128k for Llama models", () => {
    expect(getContextWindowLimit("meta/llama-3-70b")).toBe(128_000);
  });

  test("returns default 128k for unknown models", () => {
    expect(getContextWindowLimit("unknown/model-xyz")).toBe(128_000);
    expect(getContextWindowLimit("some-random-model")).toBe(128_000);
  });
});

describe("getCompactionThreshold", () => {
  test("returns 80% of context window limit", () => {
    // Claude: 200k * 0.8 = 160k
    expect(getCompactionThreshold("anthropic/claude-sonnet-4-20250514")).toBe(160_000);
  });

  test("returns 80% of limit for GPT-4o", () => {
    // 128k * 0.8 = 102,400
    expect(getCompactionThreshold("openai/gpt-4o")).toBe(102_400);
  });

  test("returns 80% of limit for unknown models", () => {
    // default 128k * 0.8 = 102,400
    expect(getCompactionThreshold("unknown/model")).toBe(102_400);
  });

  test("returns 80% for Gemini (large context)", () => {
    // 1M * 0.8 = 800k
    expect(getCompactionThreshold("google/gemini-pro")).toBe(800_000);
  });

  test("returns 80% for base GPT-4 (small context)", () => {
    // 8192 * 0.8 = 6553 (floored)
    expect(getCompactionThreshold("openai/gpt-4")).toBe(6_553);
  });
});
