"use client";

import type { OrchestratorEvent } from "@agent-orchestrator/engine";

interface StepNode {
  agent: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-500 border-gray-700",
  running: "text-yellow-400 border-yellow-700 animate-pulse",
  succeeded: "text-green-400 border-green-700",
  failed: "text-red-400 border-red-700",
  skipped: "text-gray-600 border-gray-800",
};

const STATUS_ICON: Record<string, string> = {
  pending: "○",
  running: "◎",
  succeeded: "✓",
  failed: "✗",
  skipped: "—",
};

const AGENT_LABELS: Record<string, string> = {
  planner: "Planner",
  account_research: "Account Research",
  contact_research: "Contact Research",
  outreach_writer: "Outreach Writer",
  linkedin_writer: "LinkedIn Writer",
  agenda_writer: "Agenda Writer",
  tone_checker: "Tone Checker",
};

interface RunTreeProps {
  events: OrchestratorEvent[];
}

export default function RunTree({ events }: RunTreeProps) {
  const nodes = new Map<string, StepNode>();

  for (const event of events) {
    if (event.type === "step.started" || event.type === "step.succeeded" || event.type === "step.failed") {
      const status =
        event.type === "step.started"
          ? "running"
          : event.type === "step.succeeded"
            ? "succeeded"
            : event.step.status === "skipped"
              ? "skipped"
              : "failed";
      nodes.set(event.step.agent, { agent: event.step.agent, status });
    }
  }

  const AGENT_ORDER = [
    "planner",
    "account_research",
    "contact_research",
    "outreach_writer",
    "linkedin_writer",
    "agenda_writer",
    "tone_checker",
  ];

  const orderedNodes = AGENT_ORDER
    .filter((a) => nodes.has(a))
    .map((a) => nodes.get(a)!);

  if (orderedNodes.length === 0) {
    return (
      <div className="text-gray-600 text-sm text-center py-8">
        Waiting for first step…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedNodes.map((node) => {
        const colors = STATUS_COLORS[node.status] ?? STATUS_COLORS["pending"]!;
        const icon = STATUS_ICON[node.status] ?? "○";
        const label = AGENT_LABELS[node.agent] ?? node.agent;

        return (
          <div
            key={node.agent}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${colors} bg-gray-900/50`}
          >
            <span className="font-mono text-lg w-6 text-center">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
            <span className={`ml-auto text-xs uppercase tracking-wider ${node.status === "running" ? "text-yellow-500" : "opacity-50"}`}>
              {node.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
