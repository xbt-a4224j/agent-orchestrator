import {
  LLMClient,
  runOrchestrator,
  plan,
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

  const dag = await plan(brief, llm).then((r) => (r.ok ? r.value : DEFAULT_DAG));

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
  const result = await runOrchestrator(brief, dag, registry, emitter, runId);

  // Persist steps
  for (const step of result.steps) {
    await appendStep(db, {
      ...step,
      tokens_in: step.tokens_in ?? 0,
      tokens_out: step.tokens_out ?? 0,
      cost_cents: step.cost_cents ?? 0,
    });
  }

  const totalCost = result.steps.reduce((sum, s) => sum + (s.cost_cents ?? 0), 0);
  await updateRunStatus(db, runId, result.run.status, totalCost);

  // Assemble and persist packet if succeeded
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
