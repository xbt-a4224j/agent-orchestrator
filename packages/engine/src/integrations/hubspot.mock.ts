// Mirrors POST /crm/v3/objects/marketing_emails

import { randomBytes } from "node:crypto";

interface PushCampaignInput {
  subject: string;
  body: string;
  recipient_email?: string;
  run_id: string;
}

interface PushCampaignResult {
  hubspot_campaign_id: string;
  status: "created";
}

let _seededFailure: (() => boolean) | null = null;

export function __seedHubspot(behavior: () => boolean): void {
  _seededFailure = behavior;
}

export async function pushCampaign(input: PushCampaignInput): Promise<PushCampaignResult> {
  if (_seededFailure?.()) {
    _seededFailure = null;
    throw new Error("HubSpot: seeded failure");
  }

  const id = `hs_camp_${randomBytes(4).toString("hex")}`;
  return { hubspot_campaign_id: id, status: "created" };
}
