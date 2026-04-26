import type { Brief, Packet, Run } from "./schemas";
import type { AccountResearch } from "./specialists/account_research";
import type { ContactResearch } from "./specialists/contact_research";
import type { OutreachEmail } from "./specialists/outreach_writer";
import type { LinkedinNote } from "./specialists/linkedin_writer";
import type { DiscoveryAgenda } from "./specialists/agenda_writer";

export interface SpecialistOutputs {
  account_research: AccountResearch;
  contact_research: ContactResearch;
  outreach_writer: OutreachEmail;
  linkedin_writer: LinkedinNote;
  agenda_writer: DiscoveryAgenda;
}

// Rules-based send sequence — VP+ gets Tue 9am, manager gets Wed 11am
function buildSendSequence(goal: string | undefined, role: string): Packet["send_sequence"] {
  const isVP = /vp|chief|cto|ceo|coo|cmo|director/i.test(role);
  const day1Time = isVP ? "09:00" : "11:00";
  const day1 = isVP ? "Tuesday" : "Wednesday";

  const baseSteps: Packet["send_sequence"]["steps"] = [
    { day: 0, channel: "email", time: day1Time, note: `Send initial email (${day1})` },
    { day: 2, channel: "linkedin", time: "10:00", note: "Connect on LinkedIn" },
    { day: 5, channel: "email", time: "09:00", note: "Follow-up email if no reply" },
  ];

  if (goal === "book_meeting") {
    baseSteps.push({ day: 7, channel: "call", time: "11:00", note: "Optional call if LinkedIn accepted" });
  }

  return { steps: baseSteps };
}

export function assemblePacket(
  outputs: SpecialistOutputs,
  run: Run,
  brief: Brief,
  startedAt: number
): Packet {
  const specialists = [
    "account_research",
    "contact_research",
    "outreach_writer",
    "linkedin_writer",
    "agenda_writer",
  ];

  return {
    run_id: run.id,
    email: outputs.outreach_writer,
    linkedin_note: outputs.linkedin_writer,
    discovery_agenda: outputs.agenda_writer,
    send_sequence: buildSendSequence(brief.goal, brief.persona.role),
    account_research: outputs.account_research.summary,
    contact_research: outputs.contact_research.summary,
    metadata: {
      total_cost_cents: run.total_cost_cents,
      tokens_in: 0,
      tokens_out: 0,
      duration_ms: Date.now() - startedAt,
      specialists,
    },
  };
}
