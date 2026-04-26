import { BriefSchema, OrchestratorEmitter } from "@agent-orchestrator/engine";
import { insertBrief, insertRun } from "@agent-orchestrator/db";
import { getDb } from "../_lib/db";
import { registerEmitter } from "../_lib/runRegistry";
import { executeRun } from "../_lib/engine";
import { toErrorResponse } from "../_lib/errorMap";
import { listRuns } from "@agent-orchestrator/db";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BriefSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const brief = parsed.data;
  const db = getDb();

  try {
    const briefId = await insertBrief(db, brief as Record<string, unknown>);
    const runId = await insertRun(db, briefId);

    const emitter = new OrchestratorEmitter();
    registerEmitter(runId, emitter);

    // Fire and forget — SSE stream surfaces results
    void executeRun(brief, runId, emitter);

    return Response.json({ run_id: runId }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function GET(): Promise<Response> {
  try {
    const db = getDb();
    const runs = await listRuns(db, 20);
    return Response.json({ runs });
  } catch (e) {
    return toErrorResponse(e);
  }
}
