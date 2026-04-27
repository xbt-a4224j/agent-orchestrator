import { getPacket } from "@agent-orchestrator/db";
import { LLMClient, runBattlecard } from "@agent-orchestrator/engine";
import { getDb } from "../../../_lib/db";
import { toErrorResponse } from "../../../_lib/errorMap";
import type { AccountResearch } from "@agent-orchestrator/engine";

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
  const { tool } = await request.json() as { tool: string };

  if (!tool?.trim()) {
    return Response.json({ error: "tool is required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const packet = await getPacket(db, id);
    if (!packet) return Response.json({ error: "not_found" }, { status: 404 });

    const ar = (packet.content as Record<string, unknown>)["account_research"] as AccountResearch;
    if (!ar?.marketing_stack) {
      return Response.json({ error: "no account research in packet" }, { status: 422 });
    }

    const llm = getLLMClient();
    const result = await runBattlecard(tool, ar, llm);
    if (!result.ok) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json(result.value);
  } catch (e) {
    return toErrorResponse(e);
  }
}
