import { describe, it, expect } from "vitest";
import {
  BriefSchema,
  StepSchema,
  RunSchema,
  PacketSchema,
  StepStatusSchema,
} from "../src/schemas";

const validBrief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing", seniority: "VP" },
  offer: { product: "Acme CRM", value_prop: "Cuts outreach time by 60%" },
  sender: { name: "Alex", company: "Acme", role: "AE" },
  goal: "book_meeting" as const,
};

describe("BriefSchema", () => {
  it("parses a valid brief", () => {
    expect(BriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("parses a brief without optional fields", () => {
    const minimal = {
      target_account: { name: "Notion" },
      persona: { role: "VP of Marketing" },
      offer: { product: "Acme CRM", value_prop: "Saves time" },
      sender: { name: "Alex", company: "Acme", role: "AE" },
    };
    expect(BriefSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects a brief missing required fields", () => {
    const result = BriefSchema.safeParse({ target_account: { name: "Notion" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("persona"))).toBe(true);
    }
  });
});

describe("StepStatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const s of ["pending", "running", "succeeded", "failed", "skipped"]) {
      expect(StepStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(StepStatusSchema.safeParse("done").success).toBe(false);
  });
});

describe("StepSchema", () => {
  it("parses a valid step", () => {
    const step = {
      id: "00000000-0000-0000-0000-000000000001",
      run_id: "00000000-0000-0000-0000-000000000002",
      agent: "account_research",
      status: "succeeded",
      tokens_in: 100,
      tokens_out: 200,
      cost_cents: 3,
    };
    expect(StepSchema.safeParse(step).success).toBe(true);
  });

  it("rejects negative token counts", () => {
    const step = {
      id: "00000000-0000-0000-0000-000000000001",
      run_id: "00000000-0000-0000-0000-000000000002",
      agent: "account_research",
      status: "succeeded",
      tokens_in: -1,
      tokens_out: 200,
      cost_cents: 3,
    };
    expect(StepSchema.safeParse(step).success).toBe(false);
  });
});

describe("RunSchema", () => {
  it("parses a valid run", () => {
    const run = {
      id: "00000000-0000-0000-0000-000000000001",
      brief_id: "00000000-0000-0000-0000-000000000002",
      status: "running",
      started_at: new Date().toISOString(),
      total_cost_cents: 0,
    };
    expect(RunSchema.safeParse(run).success).toBe(true);
  });
});

describe("PacketSchema", () => {
  it("rejects a packet missing required artifacts", () => {
    const result = PacketSchema.safeParse({ run_id: "00000000-0000-0000-0000-000000000001" });
    expect(result.success).toBe(false);
  });
});
