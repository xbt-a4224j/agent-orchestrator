export const runtime = "nodejs";

import { getEmitter, removeEmitter } from "../../../_lib/runRegistry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const emitter = getEmitter(id);

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      if (!emitter) {
        send({ type: "error", message: "Run not found or already completed" });
        controller.close();
        return;
      }

      emitter.on("event", (event) => {
        send(event);

        if (event.type === "run.completed" || event.type === "run.failed") {
          removeEmitter(id);
          controller.close();
        }
      });
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
