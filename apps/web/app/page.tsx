"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BriefForm from "./components/BriefForm";
import RunView from "./components/RunView";
import RunCompleteView from "./components/RunCompleteView";
import PacketView from "./components/PacketView";
import HistoryRail from "./components/HistoryRail";
import { useRunStream } from "./hooks/useRunStream";
import type { Packet } from "@agent-orchestrator/engine";

type PageState = "idle" | "running" | "done" | "complete";

interface RunData {
  run: { id: string; status: string; total_cost_cents: number };
  packet?: { content: Packet; hubspot_campaign_id: string | null };
}

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [packetData, setPacketData] = useState<Packet | null>(null);
  const [hubspotId, setHubspotId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number>(Date.now());

  const { events, status, totalCostCents } = useRunStream(
    pageState === "running" ? runId : null
  );

  // When stream says done, move to "done" intermediate view and quietly prefetch the packet
  useEffect(() => {
    if (status === "completed" && runId && pageState === "running") {
      setPageState("done");
      void prefetchPacket(runId);
    }
  }, [status, runId, pageState]);

  async function prefetchPacket(id: string) {
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json() as RunData;
      if (data.packet) {
        setPacketData(data.packet.content);
        setHubspotId(data.packet.hubspot_campaign_id ?? null);
      }
    } catch {
      // packet will be fetched again on CTA click
    }
  }

  async function handleViewPacket() {
    if (packetData) {
      setPageState("complete");
      return;
    }
    // Fallback: fetch if prefetch missed
    if (runId) {
      const res = await fetch(`/api/runs/${runId}`);
      const data = await res.json() as RunData;
      if (data.packet) {
        setPacketData(data.packet.content);
        setHubspotId(data.packet.hubspot_campaign_id ?? null);
      }
      setPageState("complete");
    }
  }

  function handleRunStart(id: string) {
    setRunId(id);
    setPacketData(null);
    setHubspotId(null);
    setRunStartedAt(Date.now());
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

  const durationMs = Date.now() - runStartedAt;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <HistoryRail currentRunId={runId} onSelect={handleSelectRun} />

      <main className="flex-1 overflow-y-auto relative">
        <Link
          href="/admin"
          className="absolute top-4 right-6 text-xs text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          Admin →
        </Link>
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

        {pageState === "done" && runId && (
          <RunCompleteView
            runId={runId}
            events={events}
            totalCostCents={totalCostCents}
            durationMs={durationMs}
            onViewPacket={handleViewPacket}
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
