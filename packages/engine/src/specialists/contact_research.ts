import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import { enrichContact } from "../integrations/enrichment.mock";

export interface ContactResearch {
  summary: string;
  name: string;
  role: string;
  linkedin_url: string;
  pain_points: string[];
  communication_tips: string[];
  champion_hypothesis: string;
  buying_trigger: string;
}

export async function runContactResearch(
  brief: Brief,
  llm: ILLMClient
): Promise<Result<ContactResearch, SpecialistError>> {
  const domain = brief.target_account.domain ?? `${brief.target_account.name.toLowerCase()}.com`;
  const contact = await enrichContact(domain, brief.persona.role);

  const playbookCtx = brief.playbook
    ? `Campaign playbook: ${brief.playbook.replace(/_/g, " ")}`
    : "";

  const prompt = `You are a B2B sales researcher preparing a contact brief for a personalized outreach campaign.

Contact: ${contact.name}, ${contact.role} at ${brief.target_account.name}
LinkedIn: ${contact.linkedin_url}
Bio: ${contact.bio}
Known pain points: ${contact.pain_points.join(", ")}

Campaign context:
- Seller: ${brief.sender.name} at ${brief.sender.company}
- Product: ${brief.offer.product}
- Value prop: ${brief.offer.value_prop}
${playbookCtx}

Respond with ONLY a JSON object:
{
  "summary": "<2 sentences: who they are and why they'd care about this offer>",
  "name": "${contact.name}",
  "role": "${contact.role}",
  "linkedin_url": "${contact.linkedin_url}",
  "pain_points": ["<most relevant pain 1>", "<pain 2>"],
  "communication_tips": ["<tip 1 — e.g. lead with pipeline impact, not features>", "<tip 2>"],
  "champion_hypothesis": "<1-2 sentences: why this person would internally champion Quotient — what's in it for them politically and professionally>",
  "buying_trigger": "<1 sentence: the specific signal or moment that would make them act now>"
}`;

  const result = await llm.call(prompt, { maxTokens: 1024 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "contact_research", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as ContactResearch;
    return ok(parsed);
  } catch {
    return ok({
      summary: `${contact.name} is a ${contact.role} at ${brief.target_account.name}. ${contact.bio}.`,
      name: contact.name,
      role: contact.role,
      linkedin_url: contact.linkedin_url,
      pain_points: contact.pain_points,
      communication_tips: ["Lead with pipeline impact, not features", "Reference their recent news to show you've done homework"],
      champion_hypothesis: `As ${contact.role}, they would champion Quotient to consolidate their stack and demonstrate strategic leverage to leadership.`,
      buying_trigger: "Headcount freeze forcing them to do more with the existing team.",
    });
  }
}
