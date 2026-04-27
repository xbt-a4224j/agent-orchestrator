"use client";

import type { OrchestratorEvent } from "@agent-orchestrator/engine";

interface RunCompleteViewProps {
  runId: string;
  events: OrchestratorEvent[];
  totalCostCents: number;
  durationMs: number;
  onViewPacket: () => void;
}

const DELIVERABLE_AGENTS = [
  { agent: "account_research", label: "Account Intel",    detail: "Company profile, marketing stack, ICP signals" },
  { agent: "contact_research", label: "Contact Intel",    detail: "Pain points, champion hypothesis, buying trigger" },
  { agent: "outreach_writer",  label: "Email Draft",      detail: "Personalised subject, preview, body" },
  { agent: "linkedin_writer",  label: "LinkedIn Note",    detail: "300-char connection message" },
  { agent: "agenda_writer",    label: "Discovery Agenda", detail: "Talking points calibrated to persona" },
];

export default function RunCompleteView({ runId, events, totalCostCents, durationMs, onViewPacket }: RunCompleteViewProps) {
  const succeeded = new Set<string>();
  for (const e of events) {
    if (e.type === "step.succeeded") succeeded.add(e.step.agent);
  }

  const deliverables = DELIVERABLE_AGENTS.filter((d) => succeeded.has(d.agent));
  const allGood = deliverables.length === DELIVERABLE_AGENTS.length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
          <span className="text-2xl text-emerald-600">✓</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Campaign ready</h2>
        <p className="text-slate-500 text-sm">
          {deliverables.length} of {DELIVERABLE_AGENTS.length} deliverables generated
          {" · "}${(totalCostCents / 100).toFixed(4)}
          {" · "}{(durationMs / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Deliverable checklist */}
      <div className="card divide-y divide-slate-100 mb-8">
        {DELIVERABLE_AGENTS.map((d) => {
          const done = succeeded.has(d.agent);
          return (
            <div key={d.agent} className="flex items-start gap-4 px-5 py-4">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}>
                {done ? "✓" : "—"}
              </div>
              <div>
                <div className={`text-sm font-medium ${done ? "text-slate-800" : "text-slate-400"}`}>
                  {d.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{d.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Run ID for reference */}
      <p className="text-center text-xs text-slate-300 font-mono mb-8">{runId}</p>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={onViewPacket}
          className="btn-primary px-8 py-3 text-base"
        >
          {allGood ? "View campaign packet →" : "View partial results →"}
        </button>
        {!allGood && (
          <p className="text-xs text-slate-400 mt-3">Some agents did not complete — the packet contains what was generated.</p>
        )}
      </div>
    </div>
  );
}
