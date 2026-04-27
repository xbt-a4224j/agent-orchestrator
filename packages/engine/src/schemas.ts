import { z } from "zod";

export const PlaybookSchema = z.enum([
  "abm_outbound",
  "competitive_displacement",
  "thought_leadership",
  "event_followup",
  "reactivation",
]);
export type Playbook = z.infer<typeof PlaybookSchema>;

export const PLAYBOOK_LABELS: Record<Playbook, string> = {
  abm_outbound: "ABM Outbound",
  competitive_displacement: "Competitive Displacement",
  thought_leadership: "Thought Leadership",
  event_followup: "Event Follow-up",
  reactivation: "Account Reactivation",
};

export const BriefSchema = z.object({
  target_account: z.object({
    name: z.string().min(1),
    domain: z.string().optional(),
  }),
  persona: z.object({
    role: z.string().min(1),
    seniority: z.string().optional(),
  }),
  offer: z.object({
    product: z.string().min(1),
    value_prop: z.string().min(1),
  }),
  sender: z.object({
    name: z.string().min(1),
    company: z.string().min(1),
    role: z.string().min(1),
  }),
  playbook: PlaybookSchema.optional(),
  icp_signals: z.string().optional(),
  constraints: z.string().optional(),
});

export const StepStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const StepSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  parent_step_id: z.string().uuid().optional(),
  agent: z.string(),
  status: StepStatusSchema,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  tokens_in: z.number().int().nonnegative(),
  tokens_out: z.number().int().nonnegative(),
  cost_cents: z.number().int().nonnegative(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
});

export const RunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const RunSchema = z.object({
  id: z.string().uuid(),
  brief_id: z.string().uuid(),
  status: RunStatusSchema,
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  total_cost_cents: z.number().int().nonnegative(),
});

export const EmailArtifactSchema = z.object({
  subject: z.string(),
  preview: z.string(),
  body: z.string(),
});

export const LinkedinArtifactSchema = z.object({
  text: z.string(),
  char_count: z.number().int().nonnegative(),
});

export const AgendaArtifactSchema = z.object({
  title: z.string(),
  duration_minutes: z.number().int().positive(),
  talking_points: z.array(z.string()),
});

export const SendSequenceSchema = z.object({
  steps: z.array(
    z.object({
      day: z.number().int().nonnegative(),
      channel: z.enum(["email", "linkedin", "call"]),
      time: z.string(),
      note: z.string().optional(),
    })
  ),
});

// Research objects stored in full so the UI can surface structured intel
export const AccountResearchSchema = z.object({
  summary: z.string(),
  company_name: z.string(),
  industry: z.string(),
  employees: z.number(),
  pain_points_hypothesis: z.array(z.string()),
  recent_news: z.array(z.string()),
  marketing_stack: z.array(z.string()),
  icp_fit_signals: z.array(z.string()),
  competitive_displacement_angle: z.string(),
});

export const ContactResearchSchema = z.object({
  summary: z.string(),
  name: z.string(),
  role: z.string(),
  linkedin_url: z.string(),
  pain_points: z.array(z.string()),
  communication_tips: z.array(z.string()),
  champion_hypothesis: z.string(),
  buying_trigger: z.string(),
});

export const PacketSchema = z.object({
  run_id: z.string().uuid(),
  brief: BriefSchema.optional(),
  email: EmailArtifactSchema,
  linkedin_note: LinkedinArtifactSchema,
  discovery_agenda: AgendaArtifactSchema,
  send_sequence: SendSequenceSchema,
  account_research: AccountResearchSchema,
  contact_research: ContactResearchSchema,
  tone_failed: z.boolean().optional(),
  metadata: z.object({
    total_cost_cents: z.number().int().nonnegative(),
    tokens_in: z.number().int().nonnegative(),
    tokens_out: z.number().int().nonnegative(),
    duration_ms: z.number().int().nonnegative(),
    specialists: z.array(z.string()),
    playbook: PlaybookSchema.optional(),
  }),
});

export type Brief = z.infer<typeof BriefSchema>;
export type StepStatus = z.infer<typeof StepStatusSchema>;
export type Step = z.infer<typeof StepSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type Run = z.infer<typeof RunSchema>;
export type Packet = z.infer<typeof PacketSchema>;
export type EmailArtifact = z.infer<typeof EmailArtifactSchema>;
export type LinkedinArtifact = z.infer<typeof LinkedinArtifactSchema>;
export type AgendaArtifact = z.infer<typeof AgendaArtifactSchema>;
export type SendSequence = z.infer<typeof SendSequenceSchema>;
