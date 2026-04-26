import {
  parseEngagementWebhook,
  processEngagementEvent,
} from "@agent-orchestrator/engine";
import { toErrorResponse } from "../../_lib/errorMap";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const event = parseEngagementWebhook(body);
    const result = processEngagementEvent(event);
    return Response.json({ ok: true, engagement_score: result.engagement_score });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return Response.json({ error: "validation_error", message: e.message }, { status: 400 });
    }
    return toErrorResponse(e);
  }
}
