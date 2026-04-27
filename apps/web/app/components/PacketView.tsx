"use client";

import { useState, useEffect } from "react";
import type { Packet } from "@agent-orchestrator/engine/client";
import { PLAYBOOK_LABELS } from "@agent-orchestrator/engine/client";

interface PacketViewProps {
  packet: Packet;
  runId: string;
  initialHubspotId?: string | null;
  onNewCampaign: () => void;
}

interface Battlecard {
  tool: string;
  replaces: string;
  objection: string;
  reframe: string;
}

interface SimulatedReply {
  sentiment: "positive" | "neutral" | "objection";
  reply: string;
  followup: string;
}

interface SequenceStepState {
  status: "pending" | "sent" | "replied" | "no_reply";
  sentAt?: string;
}

const TABS = ["Email", "LinkedIn", "Agenda", "Send sequence", "Research"] as const;
type Tab = (typeof TABS)[number];

const SENTIMENT_LABELS = {
  positive: { label: "Positive reply", color: "text-green-400", bg: "bg-green-900/30 border-green-700/40" },
  neutral: { label: "Neutral / curious", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700/40" },
  objection: { label: "Objection", color: "text-red-400", bg: "bg-red-900/30 border-red-700/40" },
} as const;

export default function PacketView({ packet, runId, initialHubspotId, onNewCampaign }: PacketViewProps) {
  const [tab, setTab] = useState<Tab>("Email");
  const [hubspotId, setHubspotId] = useState<string | null>(initialHubspotId ?? null);
  const [pushing, setPushing] = useState(false);

  // Battlecard state
  const [battlecard, setBattlecard] = useState<Battlecard | null>(null);
  const [battlecardTool, setBattlecardTool] = useState<string | null>(null);
  const [loadingBattlecard, setLoadingBattlecard] = useState(false);

  // Reply simulator state
  const [simSentiment, setSimSentiment] = useState<SimulatedReply["sentiment"] | null>(null);
  const [simResult, setSimResult] = useState<SimulatedReply | null>(null);
  const [simulatingReply, setSimulatingReply] = useState(false);

  // Campaign runner state — one entry per send_sequence step
  const [stepStates, setStepStates] = useState<SequenceStepState[]>([]);

  useEffect(() => {
    setHubspotId(initialHubspotId ?? null);
    setBattlecard(null);
    setBattlecardTool(null);
    setSimResult(null);
    setSimSentiment(null);
    setStepStates(packet.send_sequence.steps.map(() => ({ status: "pending" as const })));
  }, [runId, initialHubspotId, packet.send_sequence.steps.length]);

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

  async function fetchBattlecard(tool: string) {
    if (battlecardTool === tool) {
      setBattlecard(null);
      setBattlecardTool(null);
      return;
    }
    setLoadingBattlecard(true);
    setBattlecardTool(tool);
    setBattlecard(null);
    try {
      const res = await fetch(`/api/runs/${runId}/battlecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool }),
      });
      const data = await res.json() as Battlecard;
      setBattlecard(data);
    } finally {
      setLoadingBattlecard(false);
    }
  }

  async function simulateReply(sentiment: SimulatedReply["sentiment"]) {
    setSimSentiment(sentiment);
    setSimulatingReply(true);
    setSimResult(null);
    try {
      const res = await fetch(`/api/runs/${runId}/simulate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment }),
      });
      const data = await res.json() as SimulatedReply;
      setSimResult(data);
    } finally {
      setSimulatingReply(false);
    }
  }

  function markStepSent(i: number) {
    setStepStates((prev) =>
      prev.map((s, idx) => idx === i ? { status: "sent", sentAt: new Date().toLocaleTimeString() } : s)
    );
  }

  function markStepOutcome(i: number, outcome: "replied" | "no_reply") {
    setStepStates((prev) =>
      prev.map((s, idx) => idx === i ? { ...s, status: outcome } : s)
    );
  }

  const playbook = packet.metadata.playbook;
  const ar = packet.account_research;
  const cr = packet.contact_research;

  const currentStep = stepStates.findIndex((s) => s.status === "sent");
  const allSent = stepStates.every((s) => s.status !== "pending");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Campaign Packet</h2>
            {playbook && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700/50 text-indigo-300">
                {PLAYBOOK_LABELS[playbook]}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
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
              <span className="font-mono text-xs">{hubspotId}</span>
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
              tab === t ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">

        {/* ── Email tab + reply simulator ── */}
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

            {/* Reply simulator */}
            <div className="border-t border-gray-800 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-400 font-medium">How does {cr.name} reply?</div>
                <div className="text-xs text-gray-600">AI simulates the contact + generates your follow-up</div>
              </div>
              <div className="flex gap-2 mb-4">
                {(["positive", "neutral", "objection"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => simulateReply(s)}
                    disabled={simulatingReply}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors disabled:opacity-50 ${
                      simSentiment === s
                        ? `${SENTIMENT_LABELS[s].bg} ${SENTIMENT_LABELS[s].color} border-current`
                        : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
                    }`}
                  >
                    {simulatingReply && simSentiment === s ? "Generating…" : SENTIMENT_LABELS[s].label}
                  </button>
                ))}
              </div>

              {simResult && (
                <div className="space-y-3">
                  <div className={`rounded border p-3 ${SENTIMENT_LABELS[simResult.sentiment].bg}`}>
                    <div className={`text-xs mb-1 ${SENTIMENT_LABELS[simResult.sentiment].color}`}>
                      {cr.name}&apos;s reply
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed italic">&ldquo;{simResult.reply}&rdquo;</p>
                  </div>
                  <div className="rounded border border-blue-800/40 bg-blue-950/20 p-3">
                    <div className="text-xs text-blue-400 mb-1">Suggested follow-up</div>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{simResult.followup}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LinkedIn tab ── */}
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

        {/* ── Agenda tab ── */}
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

        {/* ── Send sequence tab — campaign runner ── */}
        {tab === "Send sequence" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Campaign runner</div>
              <div className="text-xs text-gray-600">Mark each step sent to advance the cadence</div>
            </div>
            {packet.send_sequence.steps.map((step, i) => {
              const state = stepStates[i] ?? { status: "pending" };
              const isActive = state.status === "pending" && (i === 0 || stepStates[i - 1]?.status === "sent" || stepStates[i - 1]?.status === "replied" || stepStates[i - 1]?.status === "no_reply");
              return (
                <div key={i} className={`rounded border p-3 transition-colors ${
                  state.status === "replied" ? "border-green-800/50 bg-green-950/20"
                  : state.status === "no_reply" ? "border-gray-700/50 bg-gray-800/30"
                  : state.status === "sent" ? "border-blue-800/50 bg-blue-950/20"
                  : isActive ? "border-gray-700 bg-gray-800/50"
                  : "border-gray-800/50 bg-gray-900/50 opacity-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-xs w-12">Day {step.day}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        step.channel === "email" ? "bg-blue-900/50 text-blue-300"
                        : step.channel === "linkedin" ? "bg-indigo-900/50 text-indigo-300"
                        : "bg-gray-800 text-gray-300"
                      }`}>
                        {step.channel}
                      </span>
                      <span className="text-gray-400 text-xs">{step.time}</span>
                      <span className="text-gray-600 text-xs">{step.note}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {state.status === "pending" && isActive && (
                        <button
                          onClick={() => markStepSent(i)}
                          className="px-2.5 py-1 text-xs rounded bg-blue-800 hover:bg-blue-700 text-white transition-colors"
                        >
                          Mark sent
                        </button>
                      )}
                      {state.status === "sent" && (
                        <>
                          <span className="text-blue-400 text-xs">Sent {state.sentAt}</span>
                          <button
                            onClick={() => markStepOutcome(i, "replied")}
                            className="px-2 py-0.5 text-xs rounded border border-green-700/50 text-green-400 hover:bg-green-900/30 transition-colors"
                          >
                            Got reply
                          </button>
                          <button
                            onClick={() => markStepOutcome(i, "no_reply")}
                            className="px-2 py-0.5 text-xs rounded border border-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            No reply
                          </button>
                        </>
                      )}
                      {state.status === "replied" && <span className="text-green-400 text-xs">✓ Replied</span>}
                      {state.status === "no_reply" && <span className="text-gray-500 text-xs">No reply</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Simulate a reply from the campaign runner */}
            {currentStep >= 0 && (
              <div className="border-t border-gray-800 pt-4 mt-2">
                <div className="text-xs text-gray-500 mb-3">
                  Simulate how {cr.name} responds to step {currentStep + 1}
                </div>
                <div className="flex gap-2">
                  {(["positive", "neutral", "objection"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setTab("Email"); simulateReply(s); }}
                      className="px-3 py-1.5 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                    >
                      {SENTIMENT_LABELS[s].label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">Opens Email tab with generated reply + follow-up</p>
              </div>
            )}

            {allSent && (
              <div className="text-center text-xs text-gray-600 pt-2">Sequence complete</div>
            )}
          </div>
        )}

        {/* ── Research tab + battlecard ── */}
        {tab === "Research" && (
          <div className="space-y-8">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Account Intel</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{ar.summary}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Industry</div>
                  <div className="text-gray-400 text-sm">{ar.industry} · {ar.employees.toLocaleString()} employees</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">ICP fit signals</div>
                  <ul className="space-y-0.5">
                    {ar.icp_fit_signals.map((s, i) => (
                      <li key={i} className="text-green-400 text-xs flex gap-1"><span>↑</span>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-2">
                <div className="text-xs text-gray-400 font-medium mb-1.5">
                  Current marketing stack
                  <span className="text-gray-600 ml-2 font-normal">— ⚡ click any tool for a live battlecard</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ar.marketing_stack.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => fetchBattlecard(tool)}
                      title={`Generate displacement battlecard for ${tool}`}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors cursor-pointer ${
                        battlecardTool === tool
                          ? "bg-orange-900/40 border-orange-700/60 text-orange-300"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-orange-700/50 hover:text-orange-300 hover:bg-orange-950/20"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Battlecard panel */}
              {battlecardTool && (
                <div className="mt-3 rounded border border-orange-800/40 bg-orange-950/20 p-4">
                  {loadingBattlecard ? (
                    <div className="text-orange-400 text-xs animate-pulse">Generating battlecard for {battlecardTool}…</div>
                  ) : battlecard ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-300 text-sm font-medium">{battlecard.tool} battlecard</span>
                        <button onClick={() => { setBattlecard(null); setBattlecardTool(null); }} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
                      </div>
                      <div>
                        <div className="text-xs text-orange-500 mb-1">Quotient replaces</div>
                        <p className="text-orange-100 text-xs leading-relaxed">{battlecard.replaces}</p>
                      </div>
                      <div>
                        <div className="text-xs text-red-500 mb-1">Expected objection</div>
                        <p className="text-gray-300 text-xs leading-relaxed italic">&ldquo;{battlecard.objection}&rdquo;</p>
                      </div>
                      <div>
                        <div className="text-xs text-green-500 mb-1">Reframe</div>
                        <p className="text-green-200 text-xs leading-relaxed">{battlecard.reframe}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {ar.competitive_displacement_angle && (
                <div className="bg-orange-950/30 border border-orange-800/40 rounded p-3 mt-4">
                  <div className="text-xs text-orange-400 mb-1">Displacement angle</div>
                  <p className="text-orange-200 text-xs leading-relaxed">{ar.competitive_displacement_angle}</p>
                </div>
              )}

              {ar.recent_news.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-600 mb-1">Recent news</div>
                  <ul className="space-y-1">
                    {ar.recent_news.map((n, i) => (
                      <li key={i} className="text-gray-500 text-xs">· {n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Contact intel */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Contact Intel</div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white text-sm font-medium">{cr.name}</div>
                  <div className="text-gray-500 text-xs">{cr.role}</div>
                </div>
                {cr.linkedin_url && (
                  <a href={cr.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    LinkedIn →
                  </a>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{cr.summary}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Pain points</div>
                  <ul className="space-y-1">
                    {cr.pain_points.map((p, i) => (
                      <li key={i} className="text-gray-400 text-xs">· {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Communication tips</div>
                  <ul className="space-y-1">
                    {cr.communication_tips.map((t, i) => (
                      <li key={i} className="text-gray-400 text-xs">· {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded p-3">
                  <div className="text-xs text-indigo-400 mb-1">Champion hypothesis</div>
                  <p className="text-indigo-200 text-xs leading-relaxed">{cr.champion_hypothesis}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">Buying trigger</div>
                  <p className="text-gray-300 text-xs leading-relaxed">{cr.buying_trigger}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
