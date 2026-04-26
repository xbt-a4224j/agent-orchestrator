import { randomUUID } from "node:crypto";
import type { Dag } from "./dag";
import type { Brief, Step, Run, StepStatus } from "./schemas";
import { SpecialistError, LLMTransientError, ok, err, type Result } from "./errors";
import type { OrchestratorEmitter } from "./events";

export type SpecialistInput = {
  brief: Brief;
  deps: Record<string, unknown>;
};

export type Specialist = (
  input: SpecialistInput
) => Promise<Result<unknown, SpecialistError>>;

export type SpecialistRegistry = Record<string, Specialist>;

export type OrchestratorResult = {
  run: Run;
  steps: Step[];
  outputs: Record<string, unknown>;
};

export async function runOrchestrator(
  brief: Brief,
  dag: Dag,
  registry: SpecialistRegistry,
  emitter: OrchestratorEmitter,
  runId?: string
): Promise<OrchestratorResult> {
  const run_id = runId ?? randomUUID();
  const brief_id = randomUUID();
  const started_at = new Date().toISOString();

  const run: Run = {
    id: run_id,
    brief_id,
    status: "running",
    started_at,
    total_cost_cents: 0,
  };

  emitter.emit("event", { type: "run.started", run });

  const steps: Step[] = [];
  const outputs: Record<string, unknown> = {};
  const stepStatus: Record<string, StepStatus> = {};
  let stepCounter = 0;

  // Initialize all nodes as pending
  for (const node of dag.nodes) {
    stepStatus[node.id] = "pending";
  }

  // Topological wave execution: repeatedly find nodes whose deps are all done
  const completed = new Set<string>();
  const failed = new Set<string>();

  while (completed.size + failed.size < dag.nodes.length) {
    // Find nodes ready to run (deps satisfied, not yet started)
    const ready = dag.nodes.filter(
      (n) =>
        stepStatus[n.id] === "pending" &&
        n.depends_on.every((d) => completed.has(d) || failed.has(d))
    );

    if (ready.length === 0) break; // deadlock or done

    // Mark nodes that have a failed dependency as skipped
    const toRun = ready.filter((n) => n.depends_on.every((d) => completed.has(d)));
    const toSkip = ready.filter((n) => n.depends_on.some((d) => failed.has(d)));

    for (const node of toSkip) {
      const step = makeStep(run_id, node.agent, "skipped", ++stepCounter);
      steps.push(step);
      stepStatus[node.id] = "skipped";
      failed.add(node.id);
      emitter.emit("event", { type: "step.failed", step });
    }

    // Fan-out: run ready nodes in parallel
    await Promise.all(
      toRun.map(async (node) => {
        const step = makeStep(run_id, node.agent, "running", ++stepCounter);
        step.started_at = new Date().toISOString();
        steps.push(step);
        stepStatus[node.id] = "running";
        emitter.emit("event", { type: "step.started", step });

        const specialist = registry[node.agent];
        if (!specialist) {
          step.status = "failed";
          step.error = { message: `No specialist registered for agent: ${node.agent}` };
          step.completed_at = new Date().toISOString();
          stepStatus[node.id] = "failed";
          failed.add(node.id);
          emitter.emit("event", { type: "step.failed", step });
          return;
        }

        const depOutputs: Record<string, unknown> = {};
        for (const depId of node.depends_on) {
          depOutputs[depId] = outputs[depId];
        }

        const result = await runWithRetry(specialist, { brief, deps: depOutputs });

        step.completed_at = new Date().toISOString();

        if (result.ok) {
          step.status = "succeeded";
          step.output = result.value;
          outputs[node.id] = result.value;
          completed.add(node.id);
          stepStatus[node.id] = "succeeded";
          emitter.emit("event", { type: "step.succeeded", step });
        } else {
          step.status = "failed";
          step.error = { code: result.error.code, message: result.error.message };
          failed.add(node.id);
          stepStatus[node.id] = "failed";
          emitter.emit("event", { type: "step.failed", step });
        }
      })
    );
  }

  const finalStatus = failed.size === 0 ? "succeeded" : "running";
  const completedRun: Run = {
    ...run,
    status: finalStatus === "succeeded" ? "succeeded" : "failed",
    completed_at: new Date().toISOString(),
    total_cost_cents: 0,
  };

  emitter.emit("event", {
    type: failed.size === 0 ? "run.completed" : "run.failed",
    run: completedRun,
  });

  return { run: completedRun, steps, outputs };
}

async function runWithRetry(
  specialist: Specialist,
  input: SpecialistInput,
  maxRetries = 1
): Promise<Result<unknown, SpecialistError>> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const result = await specialist(input);
    if (result.ok) return result;

    const error = result.error;
    // Only retry on transient LLM errors
    const isTransient =
      error.cause instanceof LLMTransientError ||
      (error instanceof SpecialistError && error.cause instanceof LLMTransientError);

    if (!isTransient || attempt === maxRetries) {
      return err(
        new SpecialistError(error.message, error instanceof SpecialistError ? error.agent : "unknown", attempt + 1, error)
      );
    }
    attempt++;
  }
  return err(new SpecialistError("Max retries exceeded", "unknown", maxRetries + 1));
}

function makeStep(run_id: string, agent: string, status: StepStatus, _counter: number): Step {
  return {
    id: randomUUID(),
    run_id,
    agent,
    status,
    tokens_in: 0,
    tokens_out: 0,
    cost_cents: 0,
  };
}
