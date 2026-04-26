import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import type { AccountResearch } from "./account_research";
import type { ContactResearch } from "./contact_research";
import { z } from "zod";

export const OutreachEmailSchema = z.object({
  subject: z.string(),
  preview: z.string(),
  body: z.string(),
});
export type OutreachEmail = z.infer<typeof OutreachEmailSchema>;

export async function runOutreachWriter(
  brief: Brief,
  accountResearch: AccountResearch,
  contactResearch: ContactResearch,
  llm: ILLMClient,
  feedback?: string
): Promise<Result<OutreachEmail, SpecialistError>> {
  const feedbackSection = feedback
    ? `\nTone feedback from previous review (must address): ${feedback}\n`
    : "";

  const prompt = `You are a B2B copywriter writing a cold outreach email.${feedbackSection}

Sender: ${brief.sender.name}, ${brief.sender.role} at ${brief.sender.company}
Recipient: ${contactResearch.name}, ${contactResearch.role} at ${accountResearch.company_name}
Product: ${brief.offer.product}
Value prop: ${brief.offer.value_prop}
Goal: ${brief.goal ?? "book_meeting"}

Account context: ${accountResearch.summary}
Contact context: ${contactResearch.summary}
Pain points to address: ${contactResearch.pain_points.slice(0, 2).join(", ")}

Write a concise cold email (under 150 words). No fluff. Peer-to-peer tone. Lead with insight, not pitch.

Respond with ONLY a JSON object:
{
  "subject": "<subject line, under 50 chars>",
  "preview": "<preview text, under 80 chars>",
  "body": "<full email body>"
}`;

  const result = await llm.call(prompt, { maxTokens: 1024 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "outreach_writer", 1, result.error));
  }

  try {
    const parsed = OutreachEmailSchema.parse(JSON.parse(result.value.output));
    return ok(parsed);
  } catch {
    return ok({
      subject: `Quick question for ${contactResearch.name}`,
      preview: `${accountResearch.company_name} + ${brief.sender.company}`,
      body: result.value.output,
    });
  }
}
