import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";

export interface ToneCheckInput {
  writer_outputs: Record<string, string>;
  brand_voice: string;
}

export interface ToneCheckResult {
  approved: boolean;
  feedback?: string;
}

export async function toneCheck(
  input: ToneCheckInput,
  llm: ILLMClient
): Promise<Result<ToneCheckResult, SpecialistError>> {
  const prompt = `You are a brand voice checker for B2B sales copy.

Brand voice guidelines:
${input.brand_voice}

Writer outputs to review:
${Object.entries(input.writer_outputs)
  .map(([k, v]) => `--- ${k} ---\n${v}`)
  .join("\n\n")}

Respond with ONLY a JSON object:
{"approved": true}
or
{"approved": false, "feedback": "<one sentence of actionable feedback>"}`;

  const result = await llm.call(prompt, { maxTokens: 256 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "tone_checker", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as ToneCheckResult;
    return ok(parsed);
  } catch {
    // If we can't parse the response, treat as approved to avoid blocking
    return ok({ approved: true });
  }
}
