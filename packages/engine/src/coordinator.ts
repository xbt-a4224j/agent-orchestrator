import { runOrchestrator, type SpecialistRegistry, type OrchestratorResult } from "./orchestrator";
import { toneCheck } from "./specialists/tone_checker";
import type { Dag } from "./dag";
import type { Brief } from "./schemas";
import type { ILLMClient } from "./llm";
import type { OrchestratorEmitter } from "./events";

const BRAND_VOICE = `
- Concise and direct — no fluff, no filler words
- Peer-to-peer tone — write as a thoughtful practitioner, not a vendor
- Outcome-focused — lead with business impact, not product features
- No hyperbole — avoid "revolutionary", "game-changing", "best-in-class"
- Professional warmth — friendly but not casual
`.trim();

const WRITER_AGENTS = ["outreach_writer", "linkedin_writer", "agenda_writer"];

export interface CoordinatorResult extends OrchestratorResult {
  tone_failed: boolean;
}

export async function runWithToneCheck(
  brief: Brief,
  dag: Dag,
  registry: SpecialistRegistry,
  emitter: OrchestratorEmitter,
  llm: ILLMClient,
  maxRetries = 1
): Promise<CoordinatorResult> {
  let lastResult = await runOrchestrator(brief, dag, registry, emitter);
  let toneFailed = false;
  let feedbackContext = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const writerOutputs: Record<string, string> = {};
    for (const agent of WRITER_AGENTS) {
      const output = lastResult.outputs[agent];
      if (output !== undefined) {
        writerOutputs[agent] = JSON.stringify(output);
      }
    }

    if (Object.keys(writerOutputs).length === 0) break;

    const checkResult = await toneCheck({ writer_outputs: writerOutputs, brand_voice: BRAND_VOICE }, llm);

    if (!checkResult.ok || checkResult.value.approved) break;

    feedbackContext = checkResult.value.feedback ?? "";

    // Rebuild registry with feedback injected into writer prompts
    const registryWithFeedback: SpecialistRegistry = { ...registry };
    for (const agent of WRITER_AGENTS) {
      const original = registry[agent];
      if (original) {
        registryWithFeedback[agent] = async (input) =>
          original({ ...input, deps: { ...input.deps, tone_feedback: feedbackContext } });
      }
    }

    // Only re-run the writer agents and tone_checker
    const writerDag: Dag = {
      nodes: dag.nodes.filter(
        (n) => WRITER_AGENTS.includes(n.agent) || n.agent === "tone_checker"
      ).map((n) => ({
        ...n,
        depends_on: n.depends_on.filter(
          (d) => dag.nodes.find((node) => node.id === d && (WRITER_AGENTS.includes(node.agent) || node.agent === "tone_checker"))
        ),
      })),
    };

    if (writerDag.nodes.length === 0) break;

    lastResult = await runOrchestrator(brief, writerDag, registryWithFeedback, emitter);

    if (attempt === maxRetries - 1) {
      toneFailed = true;
    }
  }

  return { ...lastResult, tone_failed: toneFailed };
}
