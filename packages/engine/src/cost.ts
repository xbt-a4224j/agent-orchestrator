import { LLMPermanentError } from "./errors";

// Pricing as of 2025-04-01. Source: https://www.anthropic.com/pricing
const MODEL_PRICING: Record<string, { in_per_mtok_cents: number; out_per_mtok_cents: number }> = {
  "claude-opus-4-7": { in_per_mtok_cents: 1500, out_per_mtok_cents: 7500 },
  "claude-sonnet-4-6": { in_per_mtok_cents: 300, out_per_mtok_cents: 1500 },
  "claude-haiku-4-5-20251001": { in_per_mtok_cents: 25, out_per_mtok_cents: 125 },
  "claude-3-5-sonnet-20241022": { in_per_mtok_cents: 300, out_per_mtok_cents: 1500 },
  "claude-3-5-haiku-20241022": { in_per_mtok_cents: 80, out_per_mtok_cents: 400 },
};

export function costCents(model: string, tokens_in: number, tokens_out: number): number {
  if (tokens_in < 0 || tokens_out < 0) {
    throw new LLMPermanentError("Token counts cannot be negative", 400);
  }

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new LLMPermanentError(`Unknown model for cost calculation: ${model}`, 400);
  }

  const inCost = (tokens_in / 1_000_000) * pricing.in_per_mtok_cents;
  const outCost = (tokens_out / 1_000_000) * pricing.out_per_mtok_cents;
  return Math.round(inCost + outCost);
}

export { MODEL_PRICING };
