import { ok, err, SpecialistError, type Result } from "../errors";
import type { ILLMClient } from "../llm";
import type { Brief } from "../schemas";
import type { AccountResearch } from "./account_research";
import type { ContactResearch } from "./contact_research";
import type { OutreachEmail } from "./outreach_writer";

export type ReplySentiment = "positive" | "neutral" | "objection";

export interface SimulatedReply {
  sentiment: ReplySentiment;
  reply: string;
  followup: string;
}

const SENTIMENT_DIRECTION: Record<ReplySentiment, string> = {
  positive: "They're interested — express curiosity, ask a clarifying question, or propose a time. Keep it brief, like a real exec reply (2-3 sentences max).",
  neutral: "They're not dismissing but not committing — acknowledge the email, say they're stretched right now, or say they'll flag it to their team. Non-committal but not a no.",
  objection: "They're pushing back — common objections: 'we already have a solution', 'not the right time', 'too much change right now', or 'send me more info' (the polite brush-off).",
};

export async function runReplySimulator(
  sentiment: ReplySentiment,
  brief: Brief,
  email: OutreachEmail,
  accountResearch: AccountResearch,
  contactResearch: ContactResearch,
  llm: ILLMClient
): Promise<Result<SimulatedReply, SpecialistError>> {
  const prompt = `You are simulating a realistic reply from a busy B2B executive, then generating the optimal follow-up from the seller.

## The outreach email that was sent
Subject: ${email.subject}
Body:
${email.body}

## The contact
Name: ${contactResearch.name}, ${contactResearch.role} at ${accountResearch.company_name}
Pain points: ${contactResearch.pain_points.join(", ")}
Communication style: ${contactResearch.communication_tips.join("; ")}

## Reply direction
Sentiment: ${sentiment}
${SENTIMENT_DIRECTION[sentiment]}

## Seller context
${brief.sender.name} at ${brief.sender.company} — ${brief.offer.value_prop}

Respond with ONLY a JSON object:
{
  "sentiment": "${sentiment}",
  "reply": "<${contactResearch.name}'s realistic reply — 1-4 sentences, written in first person as them, no subject line>",
  "followup": "<${brief.sender.name}'s follow-up response to that reply — calibrated to the sentiment: advance if positive, stay warm if neutral, handle objection if objection. 3-6 sentences, no subject line.>"
}`;

  const result = await llm.call(prompt, { maxTokens: 768 });
  if (!result.ok) {
    return err(new SpecialistError(result.error.message, "reply_simulator", 1, result.error));
  }

  try {
    const parsed = JSON.parse(result.value.output) as SimulatedReply;
    return ok({ ...parsed, sentiment });
  } catch {
    return ok({
      sentiment,
      reply: sentiment === "positive"
        ? "Thanks for reaching out — this is actually timely. We've been looking at our campaign tooling. Can you tell me more about how the agent handles multi-channel sequencing?"
        : sentiment === "neutral"
        ? "Appreciate the note. Things are a bit hectic right now — can you send something brief I can share with my ops lead?"
        : "We're pretty locked into our current stack and don't have bandwidth to evaluate new tools right now.",
      followup: `Hi ${contactResearch.name}, thanks for getting back to me. ${sentiment === "objection" ? `Completely understand — happy to keep this light. One quick question: what would have to change for this to be worth 20 minutes of your time in Q3?` : `Happy to put together a quick one-pager tailored to ${accountResearch.company_name}'s setup. Does Thursday work for a 20-minute call?`}`,
    });
  }
}
