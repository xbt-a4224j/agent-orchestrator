export const runtime = "nodejs";
// Keep SSE connection alive for the full run duration
export const maxDuration = 300;

import { getDb } from "../../../_lib/db";
import { getSteps } from "@agent-orchestrator/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const db = getDb();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const seenIds = new Set<string>();
      let done = false;
      let ticks = 0;

      // Poll DB every 1s — works across serverless instances, no shared state needed
      while (!done && ticks < 300) {
        try {
          const [run] = await db<{ status: string; total_cost_cents: number }[]>`
            SELECT status, total_cost_cents FROM runs WHERE id = ${id}
          `;

          if (!run) {
            // Run not created yet — wait
            await new Promise((r) => setTimeout(r, 1000));
            ticks++;
            continue;
          }

          const steps = await getSteps(db, id);

          for (const step of steps) {
            if (!seenIds.has(step.id)) {
              seenIds.add(step.id);
              const eventType =
                step.status === "succeeded"
                  ? "step.succeeded"
                  : step.status === "failed"
                    ? "step.failed"
                    : "step.started";
              send({ type: eventType, step, total_cost_cents: run.total_cost_cents });
            }
          }

          if (run.status === "succeeded" || run.status === "failed") {
            send({
              type: run.status === "succeeded" ? "run.completed" : "run.failed",
              run: { id, status: run.status, total_cost_cents: run.total_cost_cents },
            });
            done = true;
          }
        } catch {
          // DB hiccup — keep polling
        }

        if (!done) {
          await new Promise((r) => setTimeout(r, 1000));
          ticks++;
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
