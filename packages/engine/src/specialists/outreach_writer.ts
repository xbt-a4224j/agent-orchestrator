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

function playbookHook(brief: Brief, ar: AccountResearch, cr: ContactResearch): string {
  switch (brief.playbook) {
    case "competitive_displacement":
      return `Displacement angle: ${ar.competitive_displacement_angle} Lead with this — not a generic pitch. Show you know their stack.`;
    case "thought_leadership":
      return `This is a thought leadership play. No pitch in the first touch. Peer-to-peer curiosity only. Reference a real trend or challenge in ${ar.industry}. The goal is a reply, not a meeting ask.`;
    case "event_followup":
      return `This is a post-event follow-up. Reference a shared context (conference, webinar, or mutual connection). Make it feel like a warm continuation, not cold outreach.`;
    case "reactivation":
      return `This is an account reactivation. They've gone cold. Acknowledge the gap implicitly with something new — a product update, case study, or insight that's changed since the last touch. Don't re-pitch from scratch.`;
    default:
      return `This is an ABM outbound play. Lead with a specific account insight: ${ar.summary.split(".")[0]}.`;
  }
}

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

  const hook = playbookHook(brief, accountResearch, contactResearch);

  const prompt = `You are a B2B copywriter. Write a cold outreach email that doesn't sound like one.${feedbackSection}

Sender: ${brief.sender.name}, ${brief.sender.role} at ${brief.sender.company}
Recipient: ${contactResearch.name}, ${contactResearch.role} at ${accountResearch.company_name}
Product: ${brief.offer.product}
Value prop: ${brief.offer.value_prop}

Account context: ${accountResearch.summary}
Contact context: ${contactResearch.summary}
Buying trigger: ${contactResearch.buying_trigger}
Top pain points: ${contactResearch.pain_points.slice(0, 2).join(", ")}

Playbook direction: ${hook}

Rules:
- Under 120 words in the body
- No fluff, no "hope this finds you well"
- One specific insight, one question or offer
- Peer-to-peer tone — rep to peer, not vendor to buyer
- End with a soft CTA (open question or "worth 15 minutes?")
${brief.constraints ? `- Constraints: ${brief.constraints}` : ""}

Respond with ONLY a JSON object:
{
  "subject": "<subject line, under 50 chars, no clickbait>",
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
