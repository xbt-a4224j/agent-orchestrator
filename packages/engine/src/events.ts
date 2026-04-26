import { EventEmitter } from "node:events";
import type { Step, Run } from "./schemas";

export type StepEvent =
  | { type: "step.started"; step: Step }
  | { type: "step.succeeded"; step: Step }
  | { type: "step.failed"; step: Step };

export type RunEvent =
  | { type: "run.started"; run: Run }
  | { type: "run.completed"; run: Run }
  | { type: "run.failed"; run: Run };

export type OrchestratorEvent = StepEvent | RunEvent;

export class OrchestratorEmitter extends EventEmitter {
  emit(event: "event", data: OrchestratorEvent): boolean {
    return super.emit(event, data);
  }

  on(event: "event", listener: (data: OrchestratorEvent) => void): this {
    return super.on(event, listener);
  }

  once(event: "event", listener: (data: OrchestratorEvent) => void): this {
    return super.once(event, listener);
  }
}
