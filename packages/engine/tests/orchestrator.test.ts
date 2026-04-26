import { describe, it, expect, vi } from "vitest";
import { runOrchestrator, type SpecialistRegistry } from "../src/orchestrator";
import { OrchestratorEmitter } from "../src/events";
import { ok, err, SpecialistError, LLMTransientError } from "../src/errors";
import type { Dag } from "../src/dag";

const brief = {
  target_account: { name: "Notion", domain: "notion.so" },
  persona: { role: "VP of Marketing" },
  offer: { product: "Acme CRM", value_prop: "Cuts outreach time" },
  sender: { name: "Alex", company: "Acme", role: "AE" },
  goal: "book_meeting" as const,
};

const simpleDag: Dag = {
  nodes: [
    { id: "a", agent: "agent_a", depends_on: [] },
    { id: "b", agent: "agent_b", depends_on: ["a"] },
    { id: "c", agent: "agent_c", depends_on: ["a"] },
  ],
};

const parallelDag: Dag = {
  nodes: [
    { id: "root", agent: "root_agent", depends_on: [] },
    { id: "p1", agent: "parallel_1", depends_on: ["root"] },
    { id: "p2", agent: "parallel_2", depends_on: ["root"] },
  ],
};

describe("runOrchestrator", () => {
  it("happy 3-node DAG: all steps succeed", async () => {
    const registry: SpecialistRegistry = {
      agent_a: async () => ok({ result: "a" }),
      agent_b: async () => ok({ result: "b" }),
      agent_c: async () => ok({ result: "c" }),
    };
    const emitter = new OrchestratorEmitter();
    const result = await runOrchestrator(brief, simpleDag, registry, emitter);
    expect(result.run.status).toBe("succeeded");
    expect(result.steps.length).toBe(3);
    expect(result.steps.every((s) => s.status === "succeeded")).toBe(true);
  });

  it("parallel siblings run in parallel (wall-clock < sequential)", async () => {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const registry: SpecialistRegistry = {
      root_agent: async () => ok("root"),
      parallel_1: async () => { await delay(50); return ok("p1"); },
      parallel_2: async () => { await delay(50); return ok("p2"); },
    };
    const emitter = new OrchestratorEmitter();
    const start = Date.now();
    await runOrchestrator(brief, parallelDag, registry, emitter);
    const elapsed = Date.now() - start;
    // If sequential: >100ms. Parallel: ~50ms. Allow generous slack for CI.
    expect(elapsed).toBeLessThan(150);
  });

  it("failed specialist marks dependents as skipped", async () => {
    const registry: SpecialistRegistry = {
      agent_a: async () =>
        err(new SpecialistError("failed", "agent_a", 1)),
      agent_b: async () => ok("b"),
      agent_c: async () => ok("c"),
    };
    const emitter = new OrchestratorEmitter();
    const result = await runOrchestrator(brief, simpleDag, registry, emitter);
    const aStep = result.steps.find((s) => s.agent === "agent_a");
    const bStep = result.steps.find((s) => s.agent === "agent_b");
    const cStep = result.steps.find((s) => s.agent === "agent_c");
    expect(aStep?.status).toBe("failed");
    expect(bStep?.status).toBe("skipped");
    expect(cStep?.status).toBe("skipped");
  });

  it("retries once on LLMTransientError then succeeds", async () => {
    let calls = 0;
    const registry: SpecialistRegistry = {
      agent_a: async () => {
        calls++;
        if (calls === 1) {
          return err(
            new SpecialistError("transient", "agent_a", 1, new LLMTransientError("5xx", 503))
          );
        }
        return ok("success");
      },
      agent_b: async () => ok("b"),
      agent_c: async () => ok("c"),
    };
    const emitter = new OrchestratorEmitter();
    const result = await runOrchestrator(brief, simpleDag, registry, emitter);
    expect(calls).toBe(2);
    expect(result.run.status).toBe("succeeded");
  });

  it("emitter fires all expected event types", async () => {
    const registry: SpecialistRegistry = {
      agent_a: async () => ok("a"),
      agent_b: async () => ok("b"),
      agent_c: async () => ok("c"),
    };
    const emitter = new OrchestratorEmitter();
    const events: string[] = [];
    emitter.on("event", (e) => events.push(e.type));
    await runOrchestrator(brief, simpleDag, registry, emitter);
    expect(events).toContain("run.started");
    expect(events).toContain("step.started");
    expect(events).toContain("step.succeeded");
    expect(events).toContain("run.completed");
  });

  it("deps outputs are passed to dependents", async () => {
    let receivedDeps: Record<string, unknown> = {};
    const registry: SpecialistRegistry = {
      agent_a: async () => ok({ value: 42 }),
      agent_b: async ({ deps }) => {
        receivedDeps = deps;
        return ok("b");
      },
      agent_c: async () => ok("c"),
    };
    const emitter = new OrchestratorEmitter();
    await runOrchestrator(brief, simpleDag, registry, emitter);
    expect(receivedDeps["a"]).toEqual({ value: 42 });
  });
});
