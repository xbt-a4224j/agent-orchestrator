"use client";

import { useEffect, useState } from "react";

interface RunSummary {
  id: string;
  status: string;
  started_at: string;
  total_cost_cents: number;
  target_account?: string;
  playbook?: string;
}

interface HistoryRailProps {
  currentRunId: string | null;
  onSelect: (runId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  succeeded: "bg-emerald-500",
  failed: "bg-red-400",
  running: "bg-amber-400 animate-pulse",
  pending: "bg-slate-300",
};

const PLAYBOOK_SHORT: Record<string, string> = {
  abm_outbound: "ABM",
  competitive_displacement: "Displacement",
  thought_leadership: "Thought Leadership",
  event_followup: "Event",
  reactivation: "Reactivation",
};

export default function HistoryRail({ currentRunId, onSelect }: HistoryRailProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/runs");
        const data = await res.json() as { runs: RunSummary[] };
        setRuns(data.runs ?? []);
      } catch {
        // ignore
      }
    }
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (runs.length === 0) return null;

  return (
    <div className="w-56 border-r border-slate-200 bg-white h-full overflow-y-auto py-4 px-3 flex-shrink-0">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
        Recent campaigns
      </div>
      <div className="space-y-0.5">
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => onSelect(run.id)}
            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
              run.id === currentRunId
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-slate-50 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[run.status] ?? "bg-slate-300"}`} />
              <span className={`text-xs font-medium truncate ${run.id === currentRunId ? "text-blue-700" : "text-slate-700"}`}>
                {run.target_account ?? run.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center justify-between ml-3.5">
              {run.playbook ? (
                <span className="text-xs text-slate-400 truncate">
                  {PLAYBOOK_SHORT[run.playbook] ?? run.playbook}
                </span>
              ) : (
                <span className="text-xs text-slate-300 font-mono">{run.id.slice(0, 6)}</span>
              )}
              <span className="text-xs text-slate-400 ml-1 flex-shrink-0">
                ${(run.total_cost_cents / 100).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
