import { getRun, getSteps, getPacket } from "@agent-orchestrator/db";
import { getDb } from "../../_lib/db";
import { toErrorResponse } from "../../_lib/errorMap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const db = getDb();

  try {
    const [run, steps, packet] = await Promise.all([
      getRun(db, id),
      getSteps(db, id),
      getPacket(db, id),
    ]);

    if (!run) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    return Response.json({ run, steps, packet });
  } catch (e) {
    return toErrorResponse(e);
  }
}
