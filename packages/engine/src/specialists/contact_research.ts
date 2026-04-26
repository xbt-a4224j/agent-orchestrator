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
}

export async function runContactResearch(
  brief: Brief,
  llm: ILLMClient
): Promise<Result<ContactResearch, SpecialistError>> {
  const domain = brief.target_account.domain ?? `${brief.target_account.name.toLowerCase()}.com`;
  const contact = await enrichContact(domain, brief.persona.role);

  const prompt = `You are a B2B sales researcher preparing a contact brief for outreach.

Contact: ${contact.name}, ${contact.role} at ${brief.target_account.name}
LinkedIn: ${contact.linkedin_url}
Bio: ${contact.bio}
Known pain points: ${contact.pain_points.join(", ")}

Sales context:
- Seller: ${brief.sender.name} from ${brief.sender.company}
- Product: ${brief.offer.product}
- Value prop: ${brief.offer.value_prop}
- Goal: ${brief.goal ?? "book_meeting"}

Respond with ONLY a JSON object:
{
  "summary": "<2 sentence bio + why this person cares>",
  "name": "${contact.name}",
  "role": "${contact.role}",
  "linkedin_url": "${contact.linkedin_url}",
  "pain_points": ["<point 1>", "<point 2>"],
  "communication_tips": ["<tip 1: e.g. lead with data>", "<tip 2>"]
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
      communication_tips: ["Be concise", "Lead with outcome"],
    });
  }
}
