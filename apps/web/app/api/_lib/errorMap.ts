import { EngineError, PlannerError, LLMPermanentError } from "@agent-orchestrator/engine";

export function engineErrorToStatus(error: EngineError): number {
  if (error instanceof PlannerError) return 422;
  if (error instanceof LLMPermanentError) return 502;
  return 500;
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof EngineError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: engineErrorToStatus(error) }
    );
  }
  return Response.json(
    { error: "internal_error", message: String(error) },
    { status: 500 }
  );
}
