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

  const prompt = `You are preparing a discovery call agenda.${feedbackSection}

Meeting: ${brief.sender.name} (${brief.sender.company}) <> ${contactResearch.name} (${accountResearch.company_name})
Product: ${brief.offer.product}
Goal: ${brief.goal ?? "book_meeting"}
Their pain points: ${contactResearch.pain_points.join(", ")}
Company context: ${accountResearch.summary}

Create a 25-minute discovery agenda with 3-5 talking points that feel collaborative, not pitchy.

Respond with ONLY a JSON object:
{
  "title": "<agenda title>",
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
        `What's driving ${accountResearch.company_name}'s current priorities?`,
        `Where does ${contactResearch.pain_points[0] ?? "efficiency"} show up most?`,
        "What does success look like in 6 months?",
      ],
    });
  }
}
