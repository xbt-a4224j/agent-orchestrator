import type { Brief } from "@agent-orchestrator/engine";

export const SAMPLE_BRIEFS: Record<string, { label: string; brief: Brief }> = {
  figma: {
    label: "Figma — Head of Marketing",
    brief: {
      target_account: { name: "Figma", domain: "figma.com" },
      persona: { role: "Head of Marketing", seniority: "Director" },
      offer: {
        product: "Prism",
        value_prop: "See which campaigns actually drive pipeline — full multi-touch attribution from first click to closed-won",
      },
      sender: { name: "Alex", company: "Prism", role: "AE" },
      playbook: "abm_outbound",
      icp_signals: "Marketo + Pardot customer, expanding enterprise GTM, recent marketing leadership hire",
    },
  },
  linear: {
    label: "Linear — Director of Demand Gen",
    brief: {
      target_account: { name: "Linear", domain: "linear.app" },
      persona: { role: "Director of Demand Generation", seniority: "Director" },
      offer: {
        product: "Prism",
        value_prop: "Stop guessing which channels work — Prism maps every touch to revenue so you can kill what doesn't convert",
      },
      sender: { name: "Alex", company: "Prism", role: "AE" },
      playbook: "competitive_displacement",
      icp_signals: "HubSpot + Apollo stack, Series B, small marketing team scaling fast",
    },
  },
  notion: {
    label: "Notion — CMO",
    brief: {
      target_account: { name: "Notion", domain: "notion.so" },
      persona: { role: "CMO", seniority: "C-Level" },
      offer: {
        product: "Prism",
        value_prop: "Finally know which of your campaigns earn the budget they get — unified attribution built for modern GTM teams",
      },
      sender: { name: "Alex", company: "Prism", role: "AE" },
      playbook: "thought_leadership",
      constraints: "Peer-to-peer only. CMO level — no feature list, no pitch in first touch.",
    },
  },
};
