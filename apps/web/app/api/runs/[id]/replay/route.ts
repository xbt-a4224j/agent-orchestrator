import { getLLMCallsForRun, getPacket } from "@agent-orchestrator/db";
import {
  FixtureLLMClient,
  recordRun,
  runOrchestrator,
  DEFAULT_DAG,
  OrchestratorEmitter,
  assemblePacket,
  type AccountResearch,
  type ContactResearch,
  type Brief,
} from "@agent-orchestrator/engine";
import { getDb } from "../../../_lib/db";
import { toErrorResponse } from "../../../_lib/errorMap";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const db = getDb();

  try {
    const [llmCalls, originalPacket] = await Promise.all([
      getLLMCallsForRun(db, id),
      getPacket(db, id),
    ]);

    if (!originalPacket) {
      return Response.json({ error: "not_found", message: "No completed packet for this run" }, { status: 404 });
    }

    // Build fixture client from recorded LLM calls
    const recordedCalls = llmCalls.map((c) => ({
      prompt_hash: c.request_hash,
      output: (c.response as Record<string, string>)["output"] ?? "",
      tokens_in: c.tokens_in,
      tokens_out: c.tokens_out,
      cost_cents: c.cost_cents,
    }));

    const recorded = recordRun([], recordedCalls);
    const fixtureLLM = new FixtureLLMClient("claude-sonnet-4-6", recorded);

    const brief = (originalPacket.content as { run_id: string } & Record<string, unknown>);
    const emitter = new OrchestratorEmitter();
    const startedAt = Date.now();

    const result = await runOrchestrator(
      brief as unknown as Brief,
      DEFAULT_DAG,
      {
        planner: async () => ({ ok: true, value: DEFAULT_DAG }),
        account_research: async ({ brief: b }) => {
          const res = await fixtureLLM.call(`research ${b.target_account.name}`);
          if (!res.ok) return { ok: false, error: res.error } as never;
          return { ok: true, value: JSON.parse(res.value.output) };
        },
        contact_research: async ({ brief: b }) => {
          const res = await fixtureLLM.call(`contact ${b.persona.role}`);
          if (!res.ok) return { ok: false, error: res.error } as never;
          return { ok: true, value: JSON.parse(res.value.output) };
        },
        outreach_writer: async () => ({ ok: true, value: (originalPacket.content as Record<string, unknown>)["email"] }),
        linkedin_writer: async () => ({ ok: true, value: (originalPacket.content as Record<string, unknown>)["linkedin_note"] }),
        agenda_writer: async () => ({ ok: true, value: (originalPacket.content as Record<string, unknown>)["discovery_agenda"] }),
        tone_checker: async () => ({ ok: true, value: { approved: true } }),
      },
      emitter,
      id
    );

    const replayedPacket = assemblePacket(
      {
        account_research: result.outputs["account_research"] as AccountResearch ?? {} as AccountResearch,
        contact_research: result.outputs["contact_research"] as ContactResearch ?? {} as ContactResearch,
        outreach_writer: (originalPacket.content as Record<string, unknown>)["email"] as never,
        linkedin_writer: (originalPacket.content as Record<string, unknown>)["linkedin_note"] as never,
        agenda_writer: (originalPacket.content as Record<string, unknown>)["discovery_agenda"] as never,
      },
      result.run,
      brief as unknown as Brief,
      startedAt
    );

    const equal = JSON.stringify(replayedPacket.email) === JSON.stringify((originalPacket.content as Record<string, unknown>)["email"]);

    return Response.json({
      original_run: id,
      replayed_run: result.run,
      equal,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
