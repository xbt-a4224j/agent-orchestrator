import postgres from "postgres";

export function createClient(connectionString: string) {
  return postgres(connectionString);
}

export type DbClient = ReturnType<typeof createClient>;

// ── Brief ─────────────────────────────────────────────────────────────────────

export async function insertBrief(
  db: DbClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    INSERT INTO briefs (payload) VALUES (${db.json(payload)}) RETURNING id
  `;
  if (!row) throw new Error("insertBrief: no row returned");
  return row.id;
}

// ── Run ───────────────────────────────────────────────────────────────────────

export async function insertRun(
  db: DbClient,
  briefId: string
): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    INSERT INTO runs (brief_id, status) VALUES (${briefId}, 'pending') RETURNING id
  `;
  if (!row) throw new Error("insertRun: no row returned");
  return row.id;
}

export async function updateRunStatus(
  db: DbClient,
  runId: string,
  status: string,
  totalCostCents: number
): Promise<void> {
  await db`
    UPDATE runs
    SET status = ${status},
        completed_at = NOW(),
        total_cost_cents = ${totalCostCents}
    WHERE id = ${runId}
  `;
}

export interface RunRow {
  id: string;
  brief_id: string;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  total_cost_cents: number;
}

export async function getRun(db: DbClient, runId: string): Promise<RunRow | null> {
  const [row] = await db<RunRow[]>`SELECT * FROM runs WHERE id = ${runId}`;
  return row ?? null;
}

export interface RunSummaryRow extends RunRow {
  target_account?: string;
  playbook?: string;
}

export async function listRuns(db: DbClient, limit = 10): Promise<RunSummaryRow[]> {
  return db<RunSummaryRow[]>`
    SELECT
      r.*,
      b.payload->>'target_account' AS target_account_raw,
      b.payload->'target_account'->>'name' AS target_account,
      b.payload->>'playbook' AS playbook
    FROM runs r
    LEFT JOIN briefs b ON b.id = r.brief_id
    ORDER BY r.started_at DESC
    LIMIT ${limit}
  `;
}

// ── Run Steps ─────────────────────────────────────────────────────────────────

export interface StepRow {
  id: string;
  run_id: string;
  parent_step_id: string | null;
  agent: string;
  status: string;
  input: unknown;
  output: unknown;
  error: unknown;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  started_at: Date | null;
  completed_at: Date | null;
}

export async function appendStep(
  db: DbClient,
  step: {
    id: string;
    run_id: string;
    agent: string;
    status: string;
    input?: unknown;
    output?: unknown;
    error?: unknown;
    tokens_in: number;
    tokens_out: number;
    cost_cents: number;
    started_at?: string;
    completed_at?: string;
  }
): Promise<void> {
  await db`
    INSERT INTO run_steps (
      id, run_id, agent, status, input, output, error,
      tokens_in, tokens_out, cost_cents, started_at, completed_at
    ) VALUES (
      ${step.id}, ${step.run_id}, ${step.agent}, ${step.status},
      ${db.json((step.input ?? null) as never)}, ${db.json((step.output ?? null) as never)}, ${db.json((step.error ?? null) as never)},
      ${step.tokens_in}, ${step.tokens_out}, ${step.cost_cents},
      ${step.started_at ?? null}, ${step.completed_at ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      output = EXCLUDED.output,
      error = EXCLUDED.error,
      completed_at = EXCLUDED.completed_at
  `;
}

export async function getSteps(db: DbClient, runId: string): Promise<StepRow[]> {
  return db<StepRow[]>`SELECT * FROM run_steps WHERE run_id = ${runId} ORDER BY started_at ASC`;
}

// ── LLM Calls ─────────────────────────────────────────────────────────────────

export async function appendLLMCall(
  db: DbClient,
  call: {
    step_id: string;
    request_hash: string;
    request: unknown;
    response: unknown;
    tokens_in: number;
    tokens_out: number;
    cost_cents: number;
  }
): Promise<void> {
  await db`
    INSERT INTO llm_calls (
      step_id, request_hash, request, response, tokens_in, tokens_out, cost_cents
    ) VALUES (
      ${call.step_id}, ${call.request_hash},
      ${db.json(call.request as never)}, ${db.json(call.response as never)},
      ${call.tokens_in}, ${call.tokens_out}, ${call.cost_cents}
    )
    ON CONFLICT (step_id, request_hash) DO NOTHING
  `;
}

export interface LLMCallRow {
  id: string;
  step_id: string;
  request_hash: string;
  request: unknown;
  response: unknown;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  recorded_at: Date;
}

export async function getLLMCallsForRun(db: DbClient, runId: string): Promise<LLMCallRow[]> {
  return db<LLMCallRow[]>`
    SELECT lc.* FROM llm_calls lc
    JOIN run_steps rs ON rs.id = lc.step_id
    WHERE rs.run_id = ${runId}
    ORDER BY lc.recorded_at ASC
  `;
}

// ── Packet ────────────────────────────────────────────────────────────────────

export interface PacketRow {
  run_id: string;
  content: unknown;
  hubspot_campaign_id: string | null;
  created_at: Date;
}

export async function insertPacket(
  db: DbClient,
  runId: string,
  content: unknown
): Promise<void> {
  await db`
    INSERT INTO packets (run_id, content) VALUES (${runId}, ${db.json(content as never)})
    ON CONFLICT (run_id) DO UPDATE SET content = EXCLUDED.content
  `;
}

export async function updatePacketHubspot(
  db: DbClient,
  runId: string,
  hubspotCampaignId: string
): Promise<void> {
  await db`UPDATE packets SET hubspot_campaign_id = ${hubspotCampaignId} WHERE run_id = ${runId}`;
}

export async function getPacket(db: DbClient, runId: string): Promise<PacketRow | null> {
  const [row] = await db<PacketRow[]>`SELECT * FROM packets WHERE run_id = ${runId}`;
  return row ?? null;
}

export async function appendSimulation(
  db: DbClient,
  runId: string,
  sentiment: string
): Promise<void> {
  await db`
    UPDATE packets
    SET content = jsonb_set(
      content,
      '{simulations}',
      COALESCE(content->'simulations', '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
             'sentiment', ${sentiment}::text,
             'simulated_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
           ))
    )
    WHERE run_id = ${runId}
  `;
}
