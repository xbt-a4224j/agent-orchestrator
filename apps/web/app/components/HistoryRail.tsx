"use client";

import { useEffect, useState } from "react";

interface RunSummary {
  id: string;
  status: string;
  started_at: string;
  total_cost_cents: number;
}

interface HistoryRailProps {
  currentRunId: string | null;
  onSelect: (runId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  succeeded: "bg-green-500",
  failed: "bg-red-500",
  running: "bg-yellow-500 animate-pulse",
  pending: "bg-gray-500",
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
    <div className="w-56 border-r border-gray-800 h-full overflow-y-auto py-4 px-3">
      <div className="text-xs text-gray-600 uppercase tracking-wider mb-3">Past runs</div>
      <div className="space-y-1">
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => onSelect(run.id)}
            className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
              run.id === currentRunId
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[run.status] ?? "bg-gray-500"}`} />
              <span className="font-mono truncate">{run.id.slice(0, 8)}…</span>
            </div>
            <div className="text-gray-600 mt-0.5 ml-4">
              ${(run.total_cost_cents / 100).toFixed(4)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
