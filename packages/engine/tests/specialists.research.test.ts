import { describe, it, expect, vi } from "vitest";
import { runAccountResearch } from "../src/specialists/account_research";
import { runContactResearch } from "../src/specialists/contact_research";
import { ok, err, LLMPermanentError } from "../src/errors";
import type { ILLMClient } from "../src/llm";

const brief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing" },
  offer: { product: "Acme CRM", value_prop: "Cuts outreach time" },
  sender: { name: "Alex", company: "Acme", role: "AE" },
  goal: "book_meeting" as const,
};

function mockLLM(output: string, succeed = true): ILLMClient {
  return {
    model: "claude-sonnet-4-6",
    call: vi.fn().mockResolvedValue(
      succeed
        ? ok({ output, tokens_in: 10, tokens_out: 50, cost_cents: 0, raw_response: {} })
        : err(new LLMPermanentError("failed", 400))
    ),
  };
}

const validAccountJson = JSON.stringify({
  summary: "Notion is a productivity company with 400 employees.",
  company_name: "Notion",
  industry: "Productivity Software",
  employees: 400,
  pain_points_hypothesis: ["Scaling", "Adoption", "Integration"],
  recent_news: ["Launched Notion AI"],
});

const validContactJson = JSON.stringify({
  summary: "Sarah Chen is a VP of Marketing with 10+ years experience.",
  name: "Sarah Chen",
  role: "VP of Marketing",
  linkedin_url: "https://linkedin.com/in/sarah-chen",
  pain_points: ["Scaling outbound", "Proving ROI"],
  communication_tips: ["Lead with data", "Be concise"],
});

describe("account_research specialist", () => {
  it("happy path returns structured research", async () => {
    const result = await runAccountResearch(brief, mockLLM(validAccountJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company_name).toBe("Notion");
      expect(result.value.employees).toBe(400);
    }
  });

  it("falls back gracefully on unparseable LLM output", async () => {
    const result = await runAccountResearch(brief, mockLLM("Not JSON at all"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company_name).toBeTruthy();
    }
  });

  it("returns SpecialistError on LLM 4xx", async () => {
    const result = await runAccountResearch(brief, mockLLM("", false));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.agent).toBe("account_research");
    }
  });
});

describe("contact_research specialist", () => {
  it("happy path returns contact research", async () => {
    const result = await runContactResearch(brief, mockLLM(validContactJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Sarah Chen");
      expect(result.value.pain_points.length).toBeGreaterThan(0);
    }
  });

  it("falls back on unparseable LLM output", async () => {
    const result = await runContactResearch(brief, mockLLM("hm"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBeTruthy();
    }
  });

  it("returns SpecialistError on LLM 4xx", async () => {
    const result = await runContactResearch(brief, mockLLM("", false));
    expect(result.ok).toBe(false);
  });
});
