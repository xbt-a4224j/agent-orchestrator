import { getPacket, appendSimulation } from "@agent-orchestrator/db";
import { LLMClient, runReplySimulator } from "@agent-orchestrator/engine";
import { getDb } from "../../../_lib/db";
import { toErrorResponse } from "../../../_lib/errorMap";
import type { AccountResearch, ContactResearch, OutreachEmail, Brief, ReplySentiment } from "@agent-orchestrator/engine";

function getLLMClient(): LLMClient {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new LLMClient({ apiKey, model: process.env["LLM_MODEL"] ?? "claude-sonnet-4-6" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const { sentiment } = await request.json() as { sentiment: ReplySentiment };

  if (!["positive", "neutral", "objection"].includes(sentiment)) {
    return Response.json({ error: "sentiment must be positive, neutral, or objection" }, { status: 400 });
  }

  const db = getDb();
  try {
    const packet = await getPacket(db, id);
    if (!packet) return Response.json({ error: "not_found" }, { status: 404 });

    const content = packet.content as Record<string, unknown>;
    const storedBrief = content["brief"] as Brief | undefined;
    const ar = content["account_research"] as AccountResearch;
    const cr = content["contact_research"] as ContactResearch;
    const email = content["email"] as OutreachEmail;

    if (!ar || !cr || !email) {
      return Response.json({ error: "packet missing required fields" }, { status: 422 });
    }

    const syntheticBrief: Brief = storedBrief ?? {
      target_account: { name: ar.company_name, domain: "" },
      persona: { role: cr.role },
      offer: { product: "Prism", value_prop: "Full multi-touch attribution from first click to closed-won" },
      sender: { name: "Alex", company: "Prism", role: "AE" },
      playbook: "abm_outbound",
    };

    const llm = getLLMClient();
    const result = await runReplySimulator(sentiment, syntheticBrief, email, ar, cr, llm);
    if (!result.ok) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Persist so admin can report sentiment distribution
    await appendSimulation(db, id, sentiment);

    return Response.json(result.value);
  } catch (e) {
    return toErrorResponse(e);
  }
}
