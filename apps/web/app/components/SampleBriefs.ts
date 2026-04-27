import type { Brief } from "@agent-orchestrator/engine";

export const SAMPLE_BRIEFS: Record<string, { label: string; brief: Brief }> = {
  figma: {
    label: "Figma — Head of Marketing",
    brief: {
      target_account: { name: "Figma", domain: "figma.com" },
      persona: { role: "Head of Marketing", seniority: "Director" },
      offer: {
        product: "Quotient",
        value_prop: "Replace 10 marketing tools with one AI agent that coordinates strategy, content, and execution",
      },
      sender: { name: "Alex", company: "Quotient", role: "AE" },
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
        product: "Quotient",
        value_prop: "Cut campaign launch time from weeks to hours — one AI agent owns the full ABM workflow",
      },
      sender: { name: "Alex", company: "Quotient", role: "AE" },
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
        product: "Quotient",
        value_prop: "One AI agent for the entire campaign lifecycle — from ICP research to multi-channel execution",
      },
      sender: { name: "Alex", company: "Quotient", role: "AE" },
      playbook: "thought_leadership",
      constraints: "Peer-to-peer only. CMO level — no feature list, no pitch in first touch.",
    },
  },
};
