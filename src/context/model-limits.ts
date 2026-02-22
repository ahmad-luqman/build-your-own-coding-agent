/**
 * Model context window limits and compaction thresholds.
 * Uses pattern matching on model IDs to determine limits.
 */

const MODEL_LIMITS: [pattern: RegExp, limit: number][] = [
  [/claude-3[.-]5/, 200_000],
  [/claude-sonnet-4/, 200_000],
  [/claude-opus/, 200_000],
  [/claude/, 200_000],
  [/gpt-4o/, 128_000],
  [/gpt-4-turbo/, 128_000],
  [/gpt-4/, 8_192],
  [/o1/, 200_000],
  [/o3/, 200_000],
  [/gemini/, 1_000_000],
  [/deepseek/, 128_000],
  [/llama/, 128_000],
];

const DEFAULT_LIMIT = 128_000;
const COMPACTION_RATIO = 0.8;

export function getContextWindowLimit(modelId: string): number {
  for (const [pattern, limit] of MODEL_LIMITS) {
    if (pattern.test(modelId)) return limit;
  }
  return DEFAULT_LIMIT;
}

export function getCompactionThreshold(modelId: string): number {
  return Math.floor(getContextWindowLimit(modelId) * COMPACTION_RATIO);
}
