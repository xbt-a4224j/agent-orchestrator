"use client";

import type { OrchestratorEvent } from "@agent-orchestrator/engine";

interface StepNode {
  agent: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
}

const STATUS_STYLES: Record<string, { row: string; icon: string; label: string }> = {
  pending:   { row: "border-slate-200 bg-white text-slate-400",          icon: "○", label: "Pending" },
  running:   { row: "border-blue-300 bg-blue-50 text-blue-700",          icon: "◎", label: "Running" },
  succeeded: { row: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: "✓", label: "Done" },
  failed:    { row: "border-red-200 bg-red-50 text-red-600",             icon: "✗", label: "Failed" },
  skipped:   { row: "border-slate-100 bg-slate-50 text-slate-300",       icon: "—", label: "Skipped" },
};

const AGENT_LABELS: Record<string, string> = {
  planner:          "Planner",
  account_research: "Account Research",
  contact_research: "Contact Research",
  outreach_writer:  "Outreach Writer",
  linkedin_writer:  "LinkedIn Writer",
  agenda_writer:    "Agenda Writer",
  tone_checker:     "Tone Checker",
};

const AGENT_ORDER = [
  "planner",
  "account_research",
  "contact_research",
  "outreach_writer",
  "linkedin_writer",
  "agenda_writer",
  "tone_checker",
];

interface RunTreeProps {
  events: OrchestratorEvent[];
}

export default function RunTree({ events }: RunTreeProps) {
  const nodes = new Map<string, StepNode>();

  for (const event of events) {
    if (event.type === "step.started" || event.type === "step.succeeded" || event.type === "step.failed") {
      const status =
        event.type === "step.started" ? "running"
        : event.type === "step.succeeded" ? "succeeded"
        : event.step.status === "skipped" ? "skipped"
        : "failed";
      nodes.set(event.step.agent, { agent: event.step.agent, status });
    }
  }

  const orderedNodes = AGENT_ORDER
    .filter((a) => nodes.has(a))
    .map((a) => nodes.get(a)!);

  if (orderedNodes.length === 0) {
    return (
      <div className="text-slate-400 text-sm text-center py-10">
        Initialising agents…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedNodes.map((node) => {
        const s = STATUS_STYLES[node.status] ?? STATUS_STYLES["pending"]!;
        return (
          <div
            key={node.agent}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${s.row} ${node.status === "running" ? "animate-pulse" : ""}`}
          >
            <span className="text-base w-5 text-center font-medium">{s.icon}</span>
            <span className="text-sm font-medium flex-1">{AGENT_LABELS[node.agent] ?? node.agent}</span>
            <span className="text-xs text-current opacity-60 uppercase tracking-wide">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
