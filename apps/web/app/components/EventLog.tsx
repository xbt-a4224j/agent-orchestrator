"use client";

import { useEffect, useRef } from "react";
import type { OrchestratorEvent } from "@agent-orchestrator/engine";

function formatEvent(event: OrchestratorEvent): string {
  switch (event.type) {
    case "run.started": return `▶ run started`;
    case "run.completed": return `✓ run completed`;
    case "run.failed": return `✗ run failed`;
    case "step.started": return `  → ${event.step.agent}: started`;
    case "step.succeeded": return `  ✓ ${event.step.agent}: done`;
    case "step.failed": return `  ✗ ${event.step.agent}: failed`;
    default: return JSON.stringify(event);
  }
}

interface EventLogProps {
  events: OrchestratorEvent[];
}

export default function EventLog({ events }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="h-48 overflow-y-auto bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs">
      {events.length === 0 && (
        <span className="text-gray-600">Waiting for events…</span>
      )}
      {events.map((event, i) => (
        <div key={i} className="text-gray-400 leading-5">
          {formatEvent(event)}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
