"use client";

import { useState, useEffect } from "react";
import type { Packet } from "@agent-orchestrator/engine";

interface PacketViewProps {
  packet: Packet;
  runId: string;
  initialHubspotId?: string | null;
  onNewCampaign: () => void;
}

const TABS = ["Email", "LinkedIn", "Agenda", "Send sequence", "Research"] as const;
type Tab = (typeof TABS)[number];

export default function PacketView({ packet, runId, initialHubspotId, onNewCampaign }: PacketViewProps) {
  const [tab, setTab] = useState<Tab>("Email");
  const [hubspotId, setHubspotId] = useState<string | null>(initialHubspotId ?? null);
  const [pushing, setPushing] = useState(false);

  // Reset hubspot state when switching to a different run
  useEffect(() => {
    setHubspotId(initialHubspotId ?? null);
  }, [runId, initialHubspotId]);

  async function pushToHubspot() {
    setPushing(true);
    try {
      const res = await fetch(`/api/runs/${runId}/push-to-hubspot`, { method: "POST" });
      const data = await res.json() as { hubspot_campaign_id: string };
      setHubspotId(data.hubspot_campaign_id);
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Outreach Packet</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cost: ${(packet.metadata.total_cost_cents / 100).toFixed(4)} ·{" "}
            {packet.metadata.duration_ms}ms
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewCampaign}
            className="px-3 py-1.5 text-sm rounded border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            + New campaign
          </button>
          {hubspotId ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-green-900/50 border border-green-700/50 text-green-400">
              <span>✓</span>
              <span>In HubSpot</span>
            </div>
          ) : (
            <button
              onClick={pushToHubspot}
              disabled={pushing}
              className="px-3 py-1.5 text-sm rounded bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white transition-colors"
            >
              {pushing ? "Pushing…" : "Push to HubSpot"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-800 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              tab === t
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {tab === "Email" && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Subject</div>
              <div className="text-white font-medium">{packet.email.subject}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Preview</div>
              <div className="text-gray-400 text-sm italic">{packet.email.preview}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Body</div>
              <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                {packet.email.body}
              </div>
            </div>
          </div>
        )}

        {tab === "LinkedIn" && (
          <div>
            <div className="text-xs text-gray-500 mb-2">
              Connection note · {packet.linkedin_note.char_count} chars
            </div>
            <div className="text-gray-200 text-sm leading-relaxed">
              {packet.linkedin_note.text}
            </div>
          </div>
        )}

        {tab === "Agenda" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-medium">{packet.discovery_agenda.title}</div>
              <div className="text-xs text-gray-500">{packet.discovery_agenda.duration_minutes} min</div>
            </div>
            <ol className="space-y-2">
              {packet.discovery_agenda.talking_points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-gray-600 font-mono">{i + 1}.</span>
                  {point}
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === "Send sequence" && (
          <div className="space-y-2">
            {packet.send_sequence.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 w-16 font-mono">Day {step.day}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  step.channel === "email"
                    ? "bg-blue-900/50 text-blue-300"
                    : step.channel === "linkedin"
                      ? "bg-indigo-900/50 text-indigo-300"
                      : "bg-gray-800 text-gray-300"
                }`}>
                  {step.channel}
                </span>
                <span className="text-gray-400">{step.time}</span>
                <span className="text-gray-500 text-xs">{step.note}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Research" && (
          <div className="space-y-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Account</div>
              <p className="text-gray-300 text-sm leading-relaxed">{packet.account_research}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact</div>
              <p className="text-gray-300 text-sm leading-relaxed">{packet.contact_research}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
