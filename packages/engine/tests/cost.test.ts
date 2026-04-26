import { describe, it, expect } from "vitest";
import { costCents } from "../src/cost";
import { LLMPermanentError } from "../src/errors";

describe("costCents", () => {
  it("calculates cost for claude-sonnet-4-6", () => {
    // 1M in tokens = 300 cents, 1M out = 1500 cents
    const cost = costCents("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBe(1800);
  });

  it("returns 0 for zero tokens", () => {
    expect(costCents("claude-sonnet-4-6", 0, 0)).toBe(0);
  });

  it("throws LLMPermanentError for unknown model", () => {
    expect(() => costCents("gpt-5-turbo", 100, 100)).toThrow(LLMPermanentError);
  });

  it("throws LLMPermanentError for negative input tokens", () => {
    expect(() => costCents("claude-sonnet-4-6", -1, 100)).toThrow(LLMPermanentError);
  });

  it("throws LLMPermanentError for negative output tokens", () => {
    expect(() => costCents("claude-sonnet-4-6", 100, -1)).toThrow(LLMPermanentError);
  });

  it("rounds to nearest cent", () => {
    // 1 token at sonnet pricing = 0.0003 cents in, effectively 0 after rounding
    const cost = costCents("claude-sonnet-4-6", 1, 0);
    expect(typeof cost).toBe("number");
    expect(Number.isInteger(cost)).toBe(true);
  });

  it("handles large token counts without overflow", () => {
    // 10M in + 10M out for haiku
    const cost = costCents("claude-haiku-4-5-20251001", 10_000_000, 10_000_000);
    expect(cost).toBe(1500); // (10 * 25) + (10 * 125) = 250 + 1250 = 1500
  });
});
