import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import type { AccountResearch } from "./account_research";
import type { ContactResearch } from "./contact_research";
import { z } from "zod";

export const DiscoveryAgendaSchema = z.object({
  title: z.string(),
  duration_minutes: z.number().int().positive(),
  talking_points: z.array(z.string()).min(2).max(6),
});
export type DiscoveryAgenda = z.infer<typeof DiscoveryAgendaSchema>;

export async function runAgendaWriter(
  brief: Brief,
  accountResearch: AccountResearch,
  contactResearch: ContactResearch,
  llm: ILLMClient,
  feedback?: string
): Promise<Result<DiscoveryAgenda, SpecialistError>> {
  const feedbackSection = feedback
    ? `\nTone feedback (must address): ${feedback}\n`
    : "";

  const playbookCtx = brief.playbook === "competitive_displacement"
    ? `Open with current-state discovery on their marketing stack before introducing how Quotient fits. Don't lead with displacement — earn the right to it.`
    : brief.playbook === "thought_leadership"
    ? `Frame the agenda around industry trends first. Position the seller as a peer with expertise, not a vendor with a product.`
    : `Standard discovery agenda — focused on their goals and pain points before any product discussion.`;

  const prompt = `You are preparing a discovery call agenda.${feedbackSection}

Meeting: ${brief.sender.name} (${brief.sender.company}) <> ${contactResearch.name} (${accountResearch.company_name})
Product: ${brief.offer.product}
Champion hypothesis: ${contactResearch.champion_hypothesis}
Their pain points: ${contactResearch.pain_points.join(", ")}
Company context: ${accountResearch.summary}
Playbook direction: ${playbookCtx}

Create a 25-minute agenda with 3-5 talking points. Feel collaborative and peer-driven, not pitchy. End with a clear next step.

Respond with ONLY a JSON object:
{
  "title": "<agenda title — professional, specific to their company>",
  "duration_minutes": 25,
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"]
}`;

  const result = await llm.call(prompt, { maxTokens: 512 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "agenda_writer", 1, result.error));
  }

  try {
    const parsed = DiscoveryAgendaSchema.parse(JSON.parse(result.value.output));
    return ok(parsed);
  } catch {
    return ok({
      title: `Discovery: ${brief.sender.company} × ${accountResearch.company_name}`,
      duration_minutes: 25,
      talking_points: [
        `What's driving ${accountResearch.company_name}'s marketing priorities this half?`,
        contactResearch.champion_hypothesis,
        `Where does ${contactResearch.pain_points[0] ?? "campaign coordination"} show up most?`,
        "What would success look like in 90 days?",
      ],
    });
  }
}
