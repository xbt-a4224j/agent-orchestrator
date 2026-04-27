import { describe, it, expect, vi } from "vitest";
import { runOutreachWriter } from "../src/specialists/outreach_writer";
import { runLinkedinWriter } from "../src/specialists/linkedin_writer";
import { runAgendaWriter } from "../src/specialists/agenda_writer";
import { ok, err, LLMPermanentError } from "../src/errors";
import type { ILLMClient } from "../src/llm";
import type { AccountResearch } from "../src/specialists/account_research";
import type { ContactResearch } from "../src/specialists/contact_research";

const brief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing" },
  offer: { product: "Prism", value_prop: "One AI agent for the full campaign lifecycle" },
  sender: { name: "Alex", company: "Prism", role: "AE" },
  playbook: "abm_outbound" as const,
};

const accountResearch: AccountResearch = {
  summary: "Notion is a productivity company with 400 employees.",
  company_name: "Notion",
  industry: "Productivity Software",
  employees: 400,
  pain_points_hypothesis: ["Scaling", "Adoption"],
  recent_news: ["Launched Notion AI"],
  marketing_stack: ["Marketo", "Salesforce"],
  icp_fit_signals: ["Series C", "Hiring marketing ops"],
  competitive_displacement_angle: "Replaces Marketo campaigns and Salesforce sequences.",
};

const contactResearch: ContactResearch = {
  summary: "Sarah Chen is VP of Marketing with 10+ years experience.",
  name: "Sarah Chen",
  role: "VP of Marketing",
  linkedin_url: "https://linkedin.com/in/sarah-chen",
  pain_points: ["Scaling outbound", "Proving ROI"],
  communication_tips: ["Lead with data"],
  champion_hypothesis: "Would champion Prism to consolidate the martech stack and demonstrate strategic leverage.",
  buying_trigger: "Headcount freeze forcing the team to do more with less.",
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

describe("outreach_writer", () => {
  it("happy path returns valid email", async () => {
    const emailJson = JSON.stringify({
      subject: "Quick question Sarah",
      preview: "Notion + Prism",
      body: "Hi Sarah, noticed Notion AI launch...",
    });
    const result = await runOutreachWriter(brief, accountResearch, contactResearch, mockLLM(emailJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subject).toBeTruthy();
      expect(result.value.body).toBeTruthy();
    }
  });

  it("includes tone feedback in prompt when provided", async () => {
    const mockLLMInst = mockLLM(JSON.stringify({ subject: "s", preview: "p", body: "b" }));
    await runOutreachWriter(brief, accountResearch, contactResearch, mockLLMInst, "Too pushy");
    const callArg = (mockLLMInst.call as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(callArg).toContain("Too pushy");
  });

  it("competitive_displacement playbook includes displacement angle in prompt", async () => {
    const dispBrief = { ...brief, playbook: "competitive_displacement" as const };
    const mockLLMInst = mockLLM(JSON.stringify({ subject: "s", preview: "p", body: "b" }));
    await runOutreachWriter(dispBrief, accountResearch, contactResearch, mockLLMInst);
    const callArg = (mockLLMInst.call as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(callArg).toContain("Displacement angle");
  });

  it("returns SpecialistError on LLM failure", async () => {
    const result = await runOutreachWriter(brief, accountResearch, contactResearch, mockLLM("", false));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.agent).toBe("outreach_writer");
  });
});

describe("linkedin_writer", () => {
  it("happy path returns valid note under 300 chars", async () => {
    const noteJson = JSON.stringify({ text: "Hi Sarah, loved the Notion AI launch!", char_count: 37 });
    const result = await runLinkedinWriter(brief, accountResearch, contactResearch, mockLLM(noteJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text.length).toBeLessThanOrEqual(300);
      expect(result.value.char_count).toBe(result.value.text.length);
    }
  });

  it("includes feedback in prompt when provided", async () => {
    const mockLLMInst = mockLLM(JSON.stringify({ text: "Hi", char_count: 2 }));
    await runLinkedinWriter(brief, accountResearch, contactResearch, mockLLMInst, "Tone too casual");
    const callArg = (mockLLMInst.call as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(callArg).toContain("Tone too casual");
  });

  it("returns SpecialistError on LLM failure", async () => {
    const result = await runLinkedinWriter(brief, accountResearch, contactResearch, mockLLM("", false));
    expect(result.ok).toBe(false);
  });
});

describe("agenda_writer", () => {
  it("happy path returns valid agenda", async () => {
    const agendaJson = JSON.stringify({
      title: "Discovery: Prism × Notion",
      duration_minutes: 25,
      talking_points: ["Current priorities?", "Pain with scale?", "Success metrics?"],
    });
    const result = await runAgendaWriter(brief, accountResearch, contactResearch, mockLLM(agendaJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.duration_minutes).toBe(25);
      expect(result.value.talking_points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("falls back gracefully on unparseable output", async () => {
    const result = await runAgendaWriter(brief, accountResearch, contactResearch, mockLLM("not json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.talking_points.length).toBeGreaterThan(0);
    }
  });

  it("returns SpecialistError on LLM failure", async () => {
    const result = await runAgendaWriter(brief, accountResearch, contactResearch, mockLLM("", false));
    expect(result.ok).toBe(false);
  });
});
