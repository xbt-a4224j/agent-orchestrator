import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PacketView from "./PacketView";
import type { Packet } from "@agent-orchestrator/engine";

const PACKET: Packet = {
  run_id: "00000000-0000-0000-0000-000000000001",
  email: {
    subject: "Quick question about Notion's outreach ops",
    preview: "Hi Alex, saw your recent…",
    body: "Hi Alex,\n\nSeen your recent post about Notion's growth. Acme CRM cuts outreach time by 60%.\n\nWorth 15 minutes?\n\n– Alex",
  },
  linkedin_note: { text: "Hi Alex — love what Notion's doing. Would love to share how Acme CRM helps teams like yours.", char_count: 90 },
  discovery_agenda: {
    title: "Discovery call — Notion + Acme CRM",
    duration_minutes: 30,
    talking_points: ["Current outreach workflow", "Key bottlenecks", "Acme fit"],
  },
  send_sequence: {
    steps: [
      { day: 0, channel: "email", time: "09:00", note: "Initial outreach" },
      { day: 3, channel: "linkedin", time: "10:00", note: "Connect request" },
    ],
  },
  account_research: "Notion is a productivity platform used by over 30M users.",
  contact_research: "VP of Marketing, 8 years in B2B SaaS, focused on pipeline velocity.",
  metadata: {
    total_cost_cents: 45,
    tokens_in: 3000,
    tokens_out: 800,
    duration_ms: 12500,
    specialists: ["account_research", "contact_research", "outreach_writer", "linkedin_writer", "agenda_writer"],
  },
};

// This is the PacketRow shape that comes back from GET /api/runs/:id
// The bug was page.tsx passing this whole object to PacketView instead of .content
const PACKET_ROW = {
  run_id: PACKET.run_id,
  content: PACKET,
  hubspot_campaign_id: null,
  created_at: new Date().toISOString(),
};

describe("PacketView", () => {
  it("renders with a correctly-shaped Packet", () => {
    render(<PacketView packet={PACKET} runId={PACKET.run_id} onReplay={() => {}} />);
    expect(screen.getByText("Outreach Packet")).toBeTruthy();
    expect(screen.getByText(PACKET.email.subject)).toBeTruthy();
  });

  it("shows cost from metadata", () => {
    render(<PacketView packet={PACKET} runId={PACKET.run_id} onReplay={() => {}} />);
    // 45 cents → $0.4500
    expect(screen.getByText(/\$0\.4500/)).toBeTruthy();
  });

  // Regression guard: passing PacketRow instead of Packet caused TypeError on metadata
  it("does NOT crash when metadata is present (regression: PacketRow.content != Packet)", () => {
    // This would throw before the fix: packet.metadata is undefined on PacketRow
    expect(() =>
      render(<PacketView packet={PACKET_ROW.content} runId={PACKET.run_id} onReplay={() => {}} />)
    ).not.toThrow();
  });
});
