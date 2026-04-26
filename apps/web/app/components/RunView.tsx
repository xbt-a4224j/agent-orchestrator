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
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Run in progress</h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{runId}</p>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${
          status === "completed"
            ? "bg-green-900/50 text-green-300"
            : status === "failed"
              ? "bg-red-900/50 text-red-300"
              : "bg-yellow-900/50 text-yellow-300"
        }`}>
          {status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <RunTree events={events} />
        </div>
        <div className="space-y-4">
          <CostTicker targetCents={totalCostCents} />
        </div>
      </div>

      <div className="mt-6">
        <EventLog events={events} />
      </div>
    </div>
  );
}
