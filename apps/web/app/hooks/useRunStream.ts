"use client";

import { useEffect, useReducer, useRef } from "react";
import type { OrchestratorEvent } from "@agent-orchestrator/engine";

export interface RunStreamState {
  events: OrchestratorEvent[];
  status: "connecting" | "running" | "completed" | "failed";
  totalCostCents: number;
}

type Action =
  | { type: "event"; event: OrchestratorEvent }
  | { type: "connected" }
  | { type: "error" };

function reducer(state: RunStreamState, action: Action): RunStreamState {
  switch (action.type) {
    case "connected":
      return { ...state, status: "running" };
    case "event": {
      const e = action.event;
      let status = state.status;
      if (e.type === "run.completed") status = "completed";
      if (e.type === "run.failed") status = "failed";
      // Extract cost from any event that carries it
      const raw = e as unknown as Record<string, unknown>;
      const costCents = typeof raw["total_cost_cents"] === "number"
        ? raw["total_cost_cents"]
        : e.type === "run.completed" || e.type === "run.failed"
          ? (e.run as unknown as Record<string, unknown>)["total_cost_cents"] as number ?? state.totalCostCents
          : state.totalCostCents;
      return {
        ...state,
        status,
        totalCostCents: Math.max(state.totalCostCents, costCents),
        events: [...state.events, e],
      };
    }
    case "error":
      return { ...state, status: "failed" };
    default:
      return state;
  }
}

export function useRunStream(runId: string | null) {
  const [state, dispatch] = useReducer(reducer, {
    events: [],
    status: "connecting",
    totalCostCents: 0,
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) return;

    const es = new EventSource(`/api/runs/${runId}/stream`);
    esRef.current = es;

    es.onopen = () => dispatch({ type: "connected" });
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as OrchestratorEvent;
        dispatch({ type: "event", event });
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => dispatch({ type: "error" });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [runId]);

  return state;
}
