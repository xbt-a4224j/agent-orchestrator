"use client";

import { useEffect, useRef } from "react";
import type { OrchestratorEvent } from "@agent-orchestrator/engine";

function formatEvent(event: OrchestratorEvent): { text: string; style: string } {
  switch (event.type) {
    case "run.started":    return { text: "Run started", style: "text-blue-600" };
    case "run.completed":  return { text: "Run completed", style: "text-emerald-600 font-medium" };
    case "run.failed":     return { text: "Run failed", style: "text-red-500 font-medium" };
    case "step.started":   return { text: `${event.step.agent} — started`, style: "text-slate-500" };
    case "step.succeeded": return { text: `${event.step.agent} — done`, style: "text-emerald-600" };
    case "step.failed":    return { text: `${event.step.agent} — failed`, style: "text-red-500" };
    default:               return { text: JSON.stringify(event), style: "text-slate-400" };
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
    <div className="card h-40 overflow-y-auto p-3 text-xs">
      {events.length === 0 && (
        <span className="text-slate-300">Waiting for agent events…</span>
      )}
      {events.map((event, i) => {
        const { text, style } = formatEvent(event);
        return (
          <div key={i} className={`leading-5 ${style}`}>
            {text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
