import { describe, it, expect, vi } from "vitest";
import { plan } from "../src/planner";
import { DEFAULT_DAG, DagSchema } from "../src/dag";
import { LLMPermanentError, ok, err } from "../src/errors";
import type { ILLMClient } from "../src/llm";

const validDagJson = JSON.stringify({
  nodes: [
    { id: "account_research", agent: "account_research", depends_on: [] },
    { id: "contact_research", agent: "contact_research", depends_on: [] },
    {
      id: "outreach_writer",
      agent: "outreach_writer",
      depends_on: ["account_research", "contact_research"],
    },
    {
      id: "tone_checker",
      agent: "tone_checker",
      depends_on: ["outreach_writer"],
    },
  ],
});

const brief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing" },
  offer: { product: "Acme CRM", value_prop: "Cuts outreach time" },
  sender: { name: "Alex", company: "Acme", role: "AE" },
  goal: "book_meeting" as const,
};

function makeMockLLM(output: string, ok_: boolean = true): ILLMClient {
  return {
    model: "claude-sonnet-4-6",
    call: vi.fn().mockResolvedValue(
      ok_
        ? ok({ output, tokens_in: 10, tokens_out: 50, cost_cents: 0, raw_response: {} })
        : err(new LLMPermanentError("bad request", 400))
    ),
  };
}

describe("planner", () => {
  it("returns valid DAG when LLM emits well-formed JSON", async () => {
    const result = await plan(brief, makeMockLLM(validDagJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.length).toBeGreaterThan(0);
    }
  });

  it("falls back to DEFAULT_DAG on malformed JSON", async () => {
    const result = await plan(brief, makeMockLLM("this is not JSON at all"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(DEFAULT_DAG);
    }
  });

  it("falls back to DEFAULT_DAG on schema-invalid DAG (cycle)", async () => {
    const cyclic = JSON.stringify({
      nodes: [
        { id: "a", agent: "account_research", depends_on: ["b"] },
        { id: "b", agent: "contact_research", depends_on: ["a"] },
      ],
    });
    const result = await plan(brief, makeMockLLM(cyclic));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(DEFAULT_DAG);
    }
  });

  it("returns PlannerError on LLM 4xx", async () => {
    const result = await plan(brief, makeMockLLM("", false));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("planner_invalid_dag");
    }
  });

  it("strips markdown fences and parses successfully", async () => {
    const fenced = "```json\n" + validDagJson + "\n```";
    const result = await plan(brief, makeMockLLM(fenced));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.length).toBeGreaterThan(0);
    }
  });

  it("DEFAULT_DAG passes its own schema validation", () => {
    expect(DagSchema.safeParse(DEFAULT_DAG).success).toBe(true);
  });

  it("falls back gracefully when depends_on references missing id", async () => {
    const broken = JSON.stringify({
      nodes: [{ id: "a", agent: "writer", depends_on: ["nonexistent"] }],
    });
    const result = await plan(brief, makeMockLLM(broken));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(DEFAULT_DAG);
    }
  });
});
