import { DagSchema, DEFAULT_DAG, type Dag } from "./dag";
import { PlannerError, ok, err, type Result } from "./errors";
import type { ILLMClient } from "./llm";
import type { Brief } from "./schemas";
import { buildPlannerPrompt } from "./planner.prompt";

function tolerantParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences and retry
    const stripped = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    return JSON.parse(stripped);
  }
}

export async function plan(
  brief: Brief,
  llm: ILLMClient
): Promise<Result<Dag, PlannerError>> {
  const prompt = buildPlannerPrompt(brief);
  const llmResult = await llm.call(prompt, { maxTokens: 1024 });

  if (!llmResult.ok) {
    return err(new PlannerError("LLM call failed during planning", llmResult.error));
  }

  let parsed: unknown;
  try {
    parsed = tolerantParse(llmResult.value.output);
  } catch {
    console.warn("[planner] JSON parse failed — falling back to DEFAULT_DAG");
    return ok(DEFAULT_DAG);
  }

  const validation = DagSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(
      "[planner] DAG schema invalid — falling back to DEFAULT_DAG:",
      validation.error.message
    );
    return ok(DEFAULT_DAG);
  }

  return ok(validation.data);
}
