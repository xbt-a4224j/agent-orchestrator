"use client";

import { useState, useEffect } from "react";
import BriefForm from "./components/BriefForm";
import RunView from "./components/RunView";
import PacketView from "./components/PacketView";
import HistoryRail from "./components/HistoryRail";
import { useRunStream } from "./hooks/useRunStream";
import type { Packet } from "@agent-orchestrator/engine";

type PageState = "idle" | "running" | "complete";

interface RunData {
  run: { id: string; status: string; total_cost_cents: number };
  packet?: { content: Packet; hubspot_campaign_id: string | null };
}

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [packetData, setPacketData] = useState<Packet | null>(null);
  const [hubspotId, setHubspotId] = useState<string | null>(null);

  const { events, status, totalCostCents } = useRunStream(
    pageState === "running" ? runId : null
  );

  // Transition to complete when stream says done
  useEffect(() => {
    if (status === "completed" && runId) {
      void fetchAndComplete(runId);
    }
  }, [status, runId]);

  async function fetchAndComplete(id: string) {
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json() as RunData;
      if (data.packet) {
        setPacketData(data.packet.content);
        setHubspotId(data.packet.hubspot_campaign_id ?? null);
        setPageState("complete");
      }
    } catch {
      // stay on running view
    }
  }

  function handleRunStart(id: string) {
    setRunId(id);
    setPacketData(null);
    setHubspotId(null);
    setPageState("running");
  }

  function handleNewCampaign() {
    setPageState("idle");
    setRunId(null);
    setPacketData(null);
    setHubspotId(null);
  }

  async function handleSelectRun(id: string) {
    setRunId(id);
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json() as RunData;
      if (data.packet) {
        setPacketData(data.packet.content);
        setHubspotId(data.packet.hubspot_campaign_id ?? null);
        setPageState("complete");
      } else {
        setHubspotId(null);
        setPageState("running");
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex min-h-screen">
      <HistoryRail currentRunId={runId} onSelect={handleSelectRun} />

      <main className="flex-1 overflow-y-auto">
        {pageState === "idle" && (
          <BriefForm onSubmit={handleRunStart} />
        )}

        {pageState === "running" && runId && (
          <RunView
            runId={runId}
            events={events}
            status={status}
            totalCostCents={totalCostCents}
          />
        )}

        {pageState === "complete" && packetData && runId && (
          <PacketView
            packet={packetData}
            runId={runId}
            initialHubspotId={hubspotId}
            onNewCampaign={handleNewCampaign}
          />
        )}
      </main>
    </div>
  );
}
