import { z } from "zod";

export const EngagementEventSchema = z.object({
  contact_email: z.string().email(),
  event_type: z.enum(["email_opened", "email_clicked", "linkedin_connected", "meeting_booked"]),
  run_id: z.string().uuid(),
  occurred_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type EngagementEvent = z.infer<typeof EngagementEventSchema>;

// In-memory engagement score store (per run_id)
const engagementScores = new Map<string, number>();

export function parseEngagementWebhook(payload: unknown): EngagementEvent {
  return EngagementEventSchema.parse(payload);
}

export function processEngagementEvent(event: EngagementEvent): { engagement_score: number } {
  const delta: Record<EngagementEvent["event_type"], number> = {
    email_opened: 1,
    email_clicked: 3,
    linkedin_connected: 5,
    meeting_booked: 10,
  };

  const current = engagementScores.get(event.run_id) ?? 0;
  const next = current + (delta[event.event_type] ?? 0);
  engagementScores.set(event.run_id, next);
  return { engagement_score: next };
}

export function getEngagementScore(runId: string): number {
  return engagementScores.get(runId) ?? 0;
}

export function __resetEngagementScores(): void {
  engagementScores.clear();
}
