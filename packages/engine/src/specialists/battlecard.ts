import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { AccountResearch } from "./account_research";

export interface Battlecard {
  tool: string;
  replaces: string;
  objection: string;
  reframe: string;
}

export async function runBattlecard(
  tool: string,
  accountResearch: AccountResearch,
  llm: ILLMClient
): Promise<Result<Battlecard, SpecialistError>> {
  const prompt = `You are a competitive intelligence specialist at Quotient, an AI platform that replaces fragmented marketing tool stacks with a single agent that handles the full campaign lifecycle.

A sales rep is about to reach out to ${accountResearch.company_name}, who uses ${accountResearch.marketing_stack.join(", ")}.

Generate a battlecard for displacing specifically: ${tool}

Context:
- Account: ${accountResearch.company_name} (${accountResearch.industry}, ${accountResearch.employees} employees)
- Full stack: ${accountResearch.marketing_stack.join(", ")}
- Displacement angle: ${accountResearch.competitive_displacement_angle}

Respond with ONLY a JSON object:
{
  "tool": "${tool}",
  "replaces": "<1-2 sentences: exactly what workflows in ${tool} Quotient handles — be specific about features, not vague>",
  "objection": "<the most likely objection the contact will raise when you suggest replacing ${tool}>",
  "reframe": "<one crisp sentence: how to reframe that objection without dismissing it>"
}`;

  const result = await llm.call(prompt, { maxTokens: 512 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "battlecard", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as Battlecard;
    return ok(parsed);
  } catch {
    return ok({
      tool,
      replaces: `Quotient handles the campaign sequencing and content generation workflows currently done in ${tool}.`,
      objection: `We've invested heavily in ${tool} and the team knows it well.`,
      reframe: `That's exactly why we start with one workflow — no rip-and-replace, just a faster lane alongside what you have.`,
    });
  }
}
