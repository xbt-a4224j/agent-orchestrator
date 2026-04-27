import { describe, it, expect } from "vitest";
import { assemblePacket } from "../src/packet";
import { PacketSchema } from "../src/schemas";

const run = {
  id: "00000000-0000-0000-0000-000000000001",
  brief_id: "00000000-0000-0000-0000-000000000002",
  status: "succeeded" as const,
  started_at: new Date().toISOString(),
  total_cost_cents: 42,
};

const brief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing" },
  offer: { product: "Quotient", value_prop: "One AI agent for the full campaign lifecycle" },
  sender: { name: "Alex", company: "Quotient", role: "AE" },
  playbook: "abm_outbound" as const,
};

const outputs = {
  account_research: {
    summary: "Notion is a productivity company.",
    company_name: "Notion",
    industry: "Productivity",
    employees: 400,
    pain_points_hypothesis: ["Scaling"],
    recent_news: ["Launched AI"],
    marketing_stack: ["Marketo", "Salesforce"],
    icp_fit_signals: ["Series C", "Hiring marketing ops"],
    competitive_displacement_angle: "Replaces Marketo campaigns and Salesforce sequences.",
  },
  contact_research: {
    summary: "Sarah Chen is VP of Marketing.",
    name: "Sarah Chen",
    role: "VP of Marketing",
    linkedin_url: "https://linkedin.com/in/sarah-chen",
    pain_points: ["Scaling outbound"],
    communication_tips: ["Lead with data"],
    champion_hypothesis: "Would champion Quotient to consolidate the martech stack.",
    buying_trigger: "Headcount freeze forcing the team to do more with less.",
  },
  outreach_writer: {
    subject: "Quick question",
    preview: "Notion + Quotient",
    body: "Hi Sarah...",
  },
  linkedin_writer: {
    text: "Hi Sarah, loved the Notion AI launch!",
    char_count: 37,
  },
  agenda_writer: {
    title: "Discovery: Quotient × Notion",
    duration_minutes: 25,
    talking_points: ["Current priorities?", "Pain points?", "Success metrics?"],
  },
};

describe("assemblePacket", () => {
  it("assembles a valid packet from outputs", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now() - 1000);
    const validation = PacketSchema.safeParse(packet);
    expect(validation.success).toBe(true);
    expect(packet.run_id).toBe(run.id);
  });

  it("packet stores full account_research object, not just summary string", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.account_research.marketing_stack).toContain("Marketo");
    expect(packet.account_research.icp_fit_signals).toContain("Series C");
    expect(packet.account_research.competitive_displacement_angle).toBeTruthy();
  });

  it("packet stores full contact_research object with champion fields", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.contact_research.champion_hypothesis).toBeTruthy();
    expect(packet.contact_research.buying_trigger).toBeTruthy();
  });

  it("VP persona gets 09:00 as first send slot", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.send_sequence.steps[0]?.time).toBe("09:00");
  });

  it("thought_leadership playbook leads with linkedin", () => {
    const tlBrief = { ...brief, playbook: "thought_leadership" as const };
    const packet = assemblePacket(outputs, run, tlBrief, Date.now());
    expect(packet.send_sequence.steps[0]?.channel).toBe("linkedin");
  });

  it("metadata includes playbook", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.metadata.playbook).toBe("abm_outbound");
    expect(packet.metadata.specialists).toContain("outreach_writer");
  });

  it("metadata duration is positive", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now() - 500);
    expect(packet.metadata.duration_ms).toBeGreaterThan(0);
  });
});
