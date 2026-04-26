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
  offer: { product: "Acme CRM", value_prop: "Cuts outreach time" },
  sender: { name: "Alex", company: "Acme", role: "AE" },
  goal: "book_meeting" as const,
};

const outputs = {
  account_research: {
    summary: "Notion is a productivity company.",
    company_name: "Notion",
    industry: "Productivity",
    employees: 400,
    pain_points_hypothesis: ["Scaling"],
    recent_news: ["Launched AI"],
  },
  contact_research: {
    summary: "Sarah Chen is VP of Marketing.",
    name: "Sarah Chen",
    role: "VP of Marketing",
    linkedin_url: "https://linkedin.com/in/sarah-chen",
    pain_points: ["Scaling outbound"],
    communication_tips: ["Lead with data"],
  },
  outreach_writer: {
    subject: "Quick question",
    preview: "Notion + Acme",
    body: "Hi Sarah...",
  },
  linkedin_writer: {
    text: "Hi Sarah, loved the Notion AI launch!",
    char_count: 37,
  },
  agenda_writer: {
    title: "Discovery: Acme × Notion",
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

  it("VP persona gets Tue 9am as first send slot", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.send_sequence.steps[0]?.time).toBe("09:00");
  });

  it("manager persona gets Wed 11am as first send slot", () => {
    const managerBrief = { ...brief, persona: { role: "Sales Manager" } };
    const packet = assemblePacket(outputs, run, managerBrief, Date.now());
    expect(packet.send_sequence.steps[0]?.time).toBe("11:00");
  });

  it("metadata includes all expected specialist names", () => {
    const packet = assemblePacket(outputs, run, brief, Date.now());
    expect(packet.metadata.specialists).toContain("outreach_writer");
    expect(packet.metadata.specialists).toContain("linkedin_writer");
  });

  it("metadata duration is positive", () => {
    const start = Date.now() - 500;
    const packet = assemblePacket(outputs, run, brief, start);
    expect(packet.metadata.duration_ms).toBeGreaterThan(0);
  });
});
