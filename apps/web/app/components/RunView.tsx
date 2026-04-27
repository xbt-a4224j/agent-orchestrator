"use client";

import RunTree from "./RunTree";
import CostTicker from "./CostTicker";
import EventLog from "./EventLog";
import type { OrchestratorEvent } from "@agent-orchestrator/engine";

interface RunViewProps {
  runId: string;
  events: OrchestratorEvent[];
  status: string;
  totalCostCents: number;
}

export default function RunView({ runId, events, status, totalCostCents }: RunViewProps) {
  const isRunning = status !== "completed" && status !== "failed";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isRunning ? "Agents running…" : status === "failed" ? "Run failed" : "Agents complete"}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">{runId}</p>
        </div>
        <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          status === "completed" ? "bg-emerald-100 text-emerald-700"
          : status === "failed"  ? "bg-red-100 text-red-600"
          : "bg-blue-100 text-blue-600"
        }`}>
          {isRunning ? "In progress" : status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <RunTree events={events} />
        </div>
        <div>
          <CostTicker targetCents={totalCostCents} />
        </div>
      </div>

      <div className="mt-6">
        <EventLog events={events} />
      </div>
    </div>
  );
}
