import { OrchestratorEmitter } from "@agent-orchestrator/engine";

// Singleton in-process event bus — keyed by run_id
const registry = new Map<string, OrchestratorEmitter>();

export function registerEmitter(runId: string, emitter: OrchestratorEmitter): void {
  registry.set(runId, emitter);
}

export function getEmitter(runId: string): OrchestratorEmitter | undefined {
  return registry.get(runId);
}

export function removeEmitter(runId: string): void {
  registry.delete(runId);
}
