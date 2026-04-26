import type { Brief } from "@agent-orchestrator/engine";

export const SAMPLE_BRIEFS: Record<string, { label: string; brief: Brief }> = {
  notion: {
    label: "Notion — VP of Marketing",
    brief: {
      target_account: { name: "Notion", domain: "notion.so" },
      persona: { role: "VP of Marketing", seniority: "VP" },
      offer: {
        product: "Acme CRM",
        value_prop: "Cuts outbound rep time by 60% through AI-drafted, persona-tuned sequences",
      },
      sender: { name: "Alex Johnson", company: "Acme", role: "Account Executive" },
      goal: "book_meeting",
      constraints: "Keep tone peer-to-peer. No hyperbole.",
    },
  },
  linear: {
    label: "Linear — Head of Sales",
    brief: {
      target_account: { name: "Linear", domain: "linear.app" },
      persona: { role: "Head of Sales", seniority: "Director" },
      offer: {
        product: "Acme CRM",
        value_prop: "Gives fast-growing teams a single pane for pipeline + outreach without switching tools",
      },
      sender: { name: "Alex Johnson", company: "Acme", role: "Account Executive" },
      goal: "book_meeting",
    },
  },
  figma: {
    label: "Figma — CTO",
    brief: {
      target_account: { name: "Figma", domain: "figma.com" },
      persona: { role: "CTO", seniority: "C-Level" },
      offer: {
        product: "Acme CRM",
        value_prop: "Surfaces engineering team's deal impact so technical buyers see ROI before they ask",
      },
      sender: { name: "Alex Johnson", company: "Acme", role: "Account Executive" },
      goal: "nurture",
    },
  },
};
