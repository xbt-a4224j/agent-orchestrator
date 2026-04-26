// Mirrors POST /emails/batch (Resend API)

import { randomUUID } from "node:crypto";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

interface SendResult {
  message_id: string;
  status: "queued";
}

let _seededFailure: (() => boolean) | null = null;

export function __seedResend(behavior: () => boolean): void {
  _seededFailure = behavior;
}

export async function sendBatch(emails: EmailPayload[]): Promise<SendResult[]> {
  if (_seededFailure?.()) {
    _seededFailure = null;
    throw new Error("Resend: seeded failure");
  }

  return emails.map(() => ({
    message_id: `rsd_${randomUUID()}`,
    status: "queued" as const,
  }));
}
