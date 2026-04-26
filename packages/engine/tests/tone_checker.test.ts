import { describe, it, expect, vi } from "vitest";
import { toneCheck } from "../src/specialists/tone_checker";
import { ok, err, LLMPermanentError } from "../src/errors";
import type { ILLMClient } from "../src/llm";

function mockLLM(response: string, succeed = true): ILLMClient {
  return {
    model: "claude-sonnet-4-6",
    call: vi.fn().mockResolvedValue(
      succeed
        ? ok({ output: response, tokens_in: 10, tokens_out: 20, cost_cents: 0, raw_response: {} })
        : err(new LLMPermanentError("failed", 400))
    ),
  };
}

describe("toneCheck", () => {
  it("returns approved=true when LLM approves", async () => {
    const result = await toneCheck(
      { writer_outputs: { outreach_writer: "Hello!" }, brand_voice: "concise" },
      mockLLM('{"approved": true}')
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.approved).toBe(true);
  });

  it("returns approved=false with feedback when rejected", async () => {
    const result = await toneCheck(
      { writer_outputs: { outreach_writer: "AMAZING DEAL!!!" }, brand_voice: "no hype" },
      mockLLM('{"approved": false, "feedback": "Too pushy, remove hyperbole"}')
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approved).toBe(false);
      expect(result.value.feedback).toContain("pushy");
    }
  });

  it("returns SpecialistError on LLM failure", async () => {
    const result = await toneCheck(
      { writer_outputs: { outreach_writer: "Hi" }, brand_voice: "concise" },
      mockLLM("", false)
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.agent).toBe("tone_checker");
  });

  it("treats unparseable LLM response as approved", async () => {
    const result = await toneCheck(
      { writer_outputs: { outreach_writer: "Hi" }, brand_voice: "concise" },
      mockLLM("I think it looks good!")
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.approved).toBe(true);
  });
});
