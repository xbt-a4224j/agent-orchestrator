import {
  LLMClient,
  runOrchestrator,
  OrchestratorEmitter,
  DEFAULT_DAG,
  assemblePacket,
  runAccountResearch,
  runContactResearch,
  runOutreachWriter,
  runLinkedinWriter,
  runAgendaWriter,
  type Brief,
  type SpecialistRegistry,
  type AccountResearch,
  type ContactResearch,
} from "@agent-orchestrator/engine";
import {
  getDb,
} from "./db";
import {
  insertBrief,
  insertRun,
  updateRunStatus,
  appendStep,
  insertPacket,
} from "@agent-orchestrator/db";

function getLLMClient(): LLMClient {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new LLMClient({
    apiKey,
    model: process.env["LLM_MODEL"] ?? "claude-sonnet-4-6",
  });
}

export async function executeRun(brief: Brief, runId: string, emitter: OrchestratorEmitter): Promise<void> {
  const db = getDb();
  const llm = getLLMClient();

  await db`UPDATE runs SET status = 'running' WHERE id = ${runId}`;

  // Always use DEFAULT_DAG — specialists are keyed to its exact node IDs
  const dag = DEFAULT_DAG;

  // Persist each step to DB as it completes so SSE polling sees real-time progress
  emitter.on("event", (event) => {
    if (event.type === "step.started" || event.type === "step.succeeded" || event.type === "step.failed") {
      void appendStep(db, {
        ...event.step,
        tokens_in: event.step.tokens_in ?? 0,
        tokens_out: event.step.tokens_out ?? 0,
        cost_cents: event.step.cost_cents ?? 0,
      });
    }
  });

  const registry: SpecialistRegistry = {
    planner: async () => ({ ok: true, value: dag }),
    account_research: async ({ brief: b }) => runAccountResearch(b, llm),
    contact_research: async ({ brief: b }) => runContactResearch(b, llm),
    outreach_writer: async ({ brief: b, deps }) => {
      const ar = deps["account_research"] as AccountResearch;
      const cr = deps["contact_research"] as ContactResearch;
      const feedback = typeof deps["tone_feedback"] === "string" ? deps["tone_feedback"] : undefined;
      return runOutreachWriter(b, ar, cr, llm, feedback);
    },
    linkedin_writer: async ({ brief: b, deps }) => {
      const ar = deps["account_research"] as AccountResearch;
      const cr = deps["contact_research"] as ContactResearch;
      const feedback = typeof deps["tone_feedback"] === "string" ? deps["tone_feedback"] : undefined;
      return runLinkedinWriter(b, ar, cr, llm, feedback);
    },
    agenda_writer: async ({ brief: b, deps }) => {
      const ar = deps["account_research"] as AccountResearch;
      const cr = deps["contact_research"] as ContactResearch;
      const feedback = typeof deps["tone_feedback"] === "string" ? deps["tone_feedback"] : undefined;
      return runAgendaWriter(b, ar, cr, llm, feedback);
    },
    tone_checker: async () => ({ ok: true, value: { approved: true } }),
  };

  const startedAt = Date.now();
  const result = await runOrchestrator(brief, dag, registry, emitter, runId, llm);

  const totalCost = llm.totalCostCents;
  await updateRunStatus(db, runId, result.run.status, totalCost);

  if (result.run.status === "succeeded") {
    const packet = assemblePacket(
      {
        account_research: result.outputs["account_research"] as AccountResearch,
        contact_research: result.outputs["contact_research"] as ContactResearch,
        outreach_writer: result.outputs["outreach_writer"] as never,
        linkedin_writer: result.outputs["linkedin_writer"] as never,
        agenda_writer: result.outputs["agenda_writer"] as never,
      },
      { ...result.run, total_cost_cents: totalCost },
      brief,
      startedAt
    );
    await insertPacket(db, runId, packet);
  }
}

export { insertBrief, insertRun };
