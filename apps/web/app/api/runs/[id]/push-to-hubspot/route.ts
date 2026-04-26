import { getPacket, updatePacketHubspot } from "@agent-orchestrator/db";
import { pushCampaign } from "@agent-orchestrator/engine";
import { getDb } from "../../../_lib/db";
import { toErrorResponse } from "../../../_lib/errorMap";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const db = getDb();

  try {
    const packet = await getPacket(db, id);
    if (!packet) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const content = packet.content as Record<string, unknown>;
    const email = content["email"] as Record<string, string> | undefined;

    const result = await pushCampaign({
      subject: email?.["subject"] ?? "Outreach campaign",
      body: email?.["body"] ?? "",
      run_id: id,
    });

    await updatePacketHubspot(db, id, result.hubspot_campaign_id);

    return Response.json({ hubspot_campaign_id: result.hubspot_campaign_id });
  } catch (e) {
    return toErrorResponse(e);
  }
}
