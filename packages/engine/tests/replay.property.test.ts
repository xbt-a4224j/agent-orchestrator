import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { runOrchestrator, type SpecialistRegistry } from "../src/orchestrator";
import { OrchestratorEmitter } from "../src/events";
import { CapturingLLMClient, FixtureLLMClient, recordRun } from "../src/replay";
import { ok } from "../src/errors";
import type { ILLMClient } from "../src/llm";
import type { Dag } from "../src/dag";

// Deterministic stub LLM that produces output based on prompt content
function makeDeterministicLLM(outputs: Record<string, string>): ILLMClient {
  return {
    model: "claude-sonnet-4-6",
    call: async (prompt) => {
      // Find a matching key or use "default"
      const key = Object.keys(outputs).find((k) => prompt.includes(k)) ?? "default";
      const output = outputs[key] ?? outputs["default"] ?? "{}";
      return ok({ output, tokens_in: 10, tokens_out: 20, cost_cents: 1, raw_response: {} });
    },
  };
}

const briefArbitrary = fc.record({
  target_account: fc.record({
    name: fc.constantFrom("Notion", "Linear", "Figma", "Vercel", "Stripe"),
    domain: fc.option(fc.constantFrom("notion.so", "linear.app", "figma.com"), { nil: undefined }),
  }),
  persona: fc.record({
    role: fc.constantFrom("VP of Marketing", "Head of Sales", "CEO", "CTO"),
    seniority: fc.option(fc.constantFrom("VP", "Director", "C-Level"), { nil: undefined }),
  }),
  offer: fc.record({
    product: fc.constantFrom("Acme CRM", "DataSync", "FlowBuilder"),
    value_prop: fc.constantFrom("Saves 10 hours/week", "Cuts CAC by 30%", "Automates outreach"),
  }),
  sender: fc.record({
    name: fc.constantFrom("Alex", "Sam", "Jordan"),
    company: fc.constantFrom("Acme", "DataCo", "FlowInc"),
    role: fc.constantFrom("AE", "SDR", "CEO"),
  }),
  goal: fc.option(
    fc.constantFrom("book_meeting" as const, "nurture" as const, "reactivate" as const),
    { nil: undefined }
  ),
});

const fixedDag: Dag = {
  nodes: [
    { id: "research", agent: "research", depends_on: [] },
    { id: "writer", agent: "writer", depends_on: ["research"] },
  ],
};

describe("replay invariant", () => {
  it("replay produces identical outputs to live run", async () => {
    await fc.assert(
      fc.asyncProperty(briefArbitrary, async (brief) => {
        const baseLLM = makeDeterministicLLM({
          research: JSON.stringify({ summary: `Research for ${brief.target_account.name}` }),
          default: JSON.stringify({ text: `Outreach for ${brief.persona.role}` }),
        });

        const capturingLLM = new CapturingLLMClient(baseLLM);

        const registry: SpecialistRegistry = {
          research: async ({ brief: b }) => {
            await capturingLLM.call(`research ${b.target_account.name}`);
            return ok({ summary: `Research for ${b.target_account.name}` });
          },
          writer: async ({ brief: b }) => {
            await capturingLLM.call(`writer ${b.persona.role}`);
            return ok({ text: `Outreach for ${b.persona.role}` });
          },
        };

        // Live run
        const emitter1 = new OrchestratorEmitter();
        const liveResult = await runOrchestrator(brief, fixedDag, registry, emitter1);

        // Record
        const recorded = recordRun(liveResult.steps, capturingLLM.captured);
        const fixtureLLM = new FixtureLLMClient("claude-sonnet-4-6", recorded);

        // Replay registry using fixture LLM
        const replayRegistry: SpecialistRegistry = {
          research: async ({ brief: b }) => {
            await fixtureLLM.call(`research ${b.target_account.name}`);
            return ok({ summary: `Research for ${b.target_account.name}` });
          },
          writer: async ({ brief: b }) => {
            await fixtureLLM.call(`writer ${b.persona.role}`);
            return ok({ text: `Outreach for ${b.persona.role}` });
          },
        };

        const emitter2 = new OrchestratorEmitter();
        const replayResult = await runOrchestrator(brief, fixedDag, replayRegistry, emitter2);

        // Invariant: outputs must be identical
        expect(replayResult.outputs).toEqual(liveResult.outputs);
        expect(replayResult.steps.length).toBe(liveResult.steps.length);
      }),
      { numRuns: 25 }
    );
  });

  it("FixtureLLMClient returns error for missing fixture", async () => {
    const recorded = recordRun([], []);
    const fixtureLLM = new FixtureLLMClient("claude-sonnet-4-6", recorded);
    const result = await fixtureLLM.call("some prompt that has no fixture");
    expect(result.ok).toBe(false);
  });

  it("CapturingLLMClient records all calls", async () => {
    const baseLLM = makeDeterministicLLM({ default: "hello" });
    const capturing = new CapturingLLMClient(baseLLM);
    await capturing.call("prompt 1");
    await capturing.call("prompt 2");
    expect(capturing.captured.length).toBe(2);
  });

  it("recordRun indexes by prompt hash", () => {
    const call = {
      prompt_hash: "abc123",
      output: "result",
      tokens_in: 10,
      tokens_out: 20,
      cost_cents: 1,
    };
    const recorded = recordRun([], [call]);
    expect(recorded.index.get("abc123")).toEqual(call);
  });
});
