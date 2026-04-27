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

// Seniority-aware sequencing — VP+ gets Tue 9am LinkedIn-first, Director gets Wed email-first
function buildSendSequence(brief: Brief): Packet["send_sequence"] {
  const role = brief.persona.role;
  const playbook = brief.playbook ?? "abm_outbound";
  const isVP = /vp|chief|cto|ceo|coo|cmo/i.test(role);
  const isDirector = /director/i.test(role);

  if (playbook === "thought_leadership") {
    return {
      steps: [
        { day: 0, channel: "linkedin", time: "09:00", note: "Connect — lead with industry insight, no pitch" },
        { day: 4, channel: "email", time: "09:00", note: "Follow-up once connected — share a relevant POV" },
        { day: 10, channel: "linkedin", time: "10:00", note: "Engage with their content, then message" },
      ],
    };
  }

  if (playbook === "event_followup") {
    return {
      steps: [
        { day: 0, channel: "email", time: "09:00", note: "Send within 24h of event — warm, reference the context" },
        { day: 1, channel: "linkedin", time: "10:00", note: "Connect on LinkedIn — reference the event" },
        { day: 5, channel: "email", time: "09:00", note: "Follow-up with a relevant resource or insight" },
      ],
    };
  }

  if (isVP) {
    return {
      steps: [
        { day: 0, channel: "email", time: "09:00", note: "Initial email (Tuesday recommended for VP+)" },
        { day: 3, channel: "linkedin", time: "09:00", note: "LinkedIn connect — reinforce the thread" },
        { day: 7, channel: "email", time: "08:30", note: "Follow-up — new angle, not a bump" },
        { day: 10, channel: "call", time: "10:00", note: "Call if LinkedIn connected" },
      ],
    };
  }

  if (isDirector) {
    return {
      steps: [
        { day: 0, channel: "email", time: "10:00", note: "Initial email (Wednesday morning for Directors)" },
        { day: 2, channel: "linkedin", time: "10:00", note: "Connect on LinkedIn" },
        { day: 6, channel: "email", time: "09:00", note: "Follow-up — reference their pain point" },
      ],
    };
  }

  return {
    steps: [
      { day: 0, channel: "email", time: "10:00", note: "Initial outreach" },
      { day: 3, channel: "linkedin", time: "10:00", note: "LinkedIn connect" },
      { day: 7, channel: "email", time: "09:00", note: "Follow-up" },
    ],
  };
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
    send_sequence: buildSendSequence(brief),
    account_research: outputs.account_research,
    contact_research: outputs.contact_research,
    metadata: {
      total_cost_cents: run.total_cost_cents,
      tokens_in: 0,
      tokens_out: 0,
      duration_ms: Date.now() - startedAt,
      specialists,
      playbook: brief.playbook,
    },
  };
}
