import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import type { AccountResearch } from "./account_research";
import type { ContactResearch } from "./contact_research";
import { z } from "zod";

export const LinkedinNoteSchema = z.object({
  text: z.string().max(300),
  char_count: z.number().int().nonnegative(),
});
export type LinkedinNote = z.infer<typeof LinkedinNoteSchema>;

export async function runLinkedinWriter(
  brief: Brief,
  accountResearch: AccountResearch,
  contactResearch: ContactResearch,
  llm: ILLMClient,
  feedback?: string
): Promise<Result<LinkedinNote, SpecialistError>> {
  const feedbackSection = feedback
    ? `\nTone feedback (must address): ${feedback}\n`
    : "";

  const playbookNote = brief.playbook === "thought_leadership"
    ? "This is a thought leadership play. Reference a shared professional interest or trend — no product mention at all."
    : brief.playbook === "competitive_displacement"
    ? `Hint at the displacement angle without naming competitors: something like "noticed your stack" or "teams consolidating tools.""`
    : "Lead with genuine curiosity or a shared professional context.";

  const prompt = `You are writing a LinkedIn connection request note.${feedbackSection}

Sender: ${brief.sender.name} from ${brief.sender.company}
Recipient: ${contactResearch.name}, ${contactResearch.role} at ${accountResearch.company_name}
Product: ${brief.offer.product}

Playbook direction: ${playbookNote}

Rules: Under 300 characters. No pitch. One hook — curiosity, shared context, or a compliment on their work.

Respond with ONLY a JSON object:
{
  "text": "<the note, max 300 chars>",
  "char_count": <number>
}`;

  const result = await llm.call(prompt, { maxTokens: 512 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "linkedin_writer", 1, result.error));
  }

  try {
    const raw = JSON.parse(result.value.output) as { text: string; char_count: number };
    const text = raw.text.slice(0, 300);
    return ok(LinkedinNoteSchema.parse({ text, char_count: text.length }));
  } catch {
    const text = result.value.output.slice(0, 300);
    return ok({ text, char_count: text.length });
  }
}
