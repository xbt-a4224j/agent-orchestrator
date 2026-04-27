import { getDb } from "../_lib/db";
import { toErrorResponse } from "../_lib/errorMap";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const db = getDb();

  try {
    const [
      runStats,
      playbookMix,
      recentRuns,
      dbMeta,
      costStats,
      langfuseStatus,
    ] = await Promise.all([
      // Campaign counts by status
      db<{ status: string; count: string }[]>`
        SELECT status, count(*)::text FROM runs GROUP BY status
      `,

      // Playbook mix
      db<{ playbook: string; count: string }[]>`
        SELECT
          COALESCE(b.payload->>'playbook', 'unknown') AS playbook,
          count(*)::text
        FROM runs r
        LEFT JOIN briefs b ON b.id = r.brief_id
        GROUP BY playbook
        ORDER BY count(*) DESC
      `,

      // Recent runs with account + cost
      db<{ id: string; status: string; total_cost_cents: number; started_at: string; account: string | null; playbook: string | null }[]>`
        SELECT
          r.id,
          r.status,
          r.total_cost_cents,
          r.started_at,
          b.payload->'target_account'->>'name' AS account,
          b.payload->>'playbook' AS playbook
        FROM runs r
        LEFT JOIN briefs b ON b.id = r.brief_id
        ORDER BY r.started_at DESC
        LIMIT 15
      `,

      // DB health: version + size
      db<{ version: string; db_size: string; db_name: string }[]>`
        SELECT
          split_part(version(), ' ', 2) AS version,
          pg_size_pretty(pg_database_size(current_database())) AS db_size,
          current_database() AS db_name
      `,

      // Cost stats (succeeded runs only)
      db<{ avg_cents: string; total_cents: string; p95_cents: string }[]>`
        SELECT
          round(avg(total_cost_cents))::text AS avg_cents,
          sum(total_cost_cents)::text AS total_cents,
          round(percentile_cont(0.95) WITHIN GROUP (ORDER BY total_cost_cents))::text AS p95_cents
        FROM runs
        WHERE status = 'succeeded' AND total_cost_cents > 0
      `,

      // Langfuse reachability (fire-and-forget check)
      Promise.resolve(!!process.env["LANGFUSE_PUBLIC_KEY"]),
    ]);

    const statusMap = Object.fromEntries(runStats.map((r) => [r.status, parseInt(r.count)]));
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const succeeded = statusMap["succeeded"] ?? 0;
    const failed = statusMap["failed"] ?? 0;

    const dbUrl = process.env["DATABASE_URL"] ?? "";
    const dbHost = dbUrl ? (() => {
      try { return new URL(dbUrl).hostname; } catch { return "unknown"; }
    })() : "unknown";

    return Response.json({
      campaigns: {
        total,
        succeeded,
        failed,
        running: statusMap["running"] ?? 0,
        success_rate: total > 0 ? Math.round((succeeded / total) * 100) : null,
      },
      cost: {
        avg_cents: parseInt(costStats[0]?.avg_cents ?? "0"),
        total_cents: parseInt(costStats[0]?.total_cents ?? "0"),
        p95_cents: parseInt(costStats[0]?.p95_cents ?? "0"),
      },
      playbook_mix: playbookMix.map((r) => ({ playbook: r.playbook, count: parseInt(r.count) })),
      recent_runs: recentRuns,
      db: {
        host: dbHost,
        name: dbMeta[0]?.db_name ?? "unknown",
        version: dbMeta[0]?.version ?? "unknown",
        size: dbMeta[0]?.db_size ?? "unknown",
        healthy: true,
      },
      integrations: {
        langfuse: langfuseStatus,
        anthropic: !!process.env["ANTHROPIC_API_KEY"],
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
