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
  positive:  { label: "Positive",  ring: "ring-emerald-400", bg: "bg-emerald-50 border-emerald-200",  text: "text-emerald-700" },
  neutral:   { label: "Curious",   ring: "ring-amber-400",   bg: "bg-amber-50 border-amber-200",      text: "text-amber-700" },
  objection: { label: "Objection", ring: "ring-red-400",     bg: "bg-red-50 border-red-200",          text: "text-red-700" },
} as const;

export default function PacketView({ packet, runId, initialHubspotId, onNewCampaign }: PacketViewProps) {
  const [tab, setTab] = useState<Tab>("Email");
  const [hubspotId, setHubspotId] = useState<string | null>(initialHubspotId ?? null);
  const [pushing, setPushing] = useState(false);

  const [battlecard, setBattlecard] = useState<Battlecard | null>(null);
  const [battlecardTool, setBattlecardTool] = useState<string | null>(null);
  const [loadingBattlecard, setLoadingBattlecard] = useState(false);

  const [simSentiment, setSimSentiment] = useState<SimulatedReply["sentiment"] | null>(null);
  const [simResult, setSimResult] = useState<SimulatedReply | null>(null);
  const [simulatingReply, setSimulatingReply] = useState(false);

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
    if (battlecardTool === tool) { setBattlecard(null); setBattlecardTool(null); return; }
    setLoadingBattlecard(true);
    setBattlecardTool(tool);
    setBattlecard(null);
    try {
      const res = await fetch(`/api/runs/${runId}/battlecard`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool }),
      });
      setBattlecard(await res.json() as Battlecard);
    } finally { setLoadingBattlecard(false); }
  }

  async function simulateReply(sentiment: SimulatedReply["sentiment"]) {
    setSimSentiment(sentiment);
    setSimulatingReply(true);
    setSimResult(null);
    try {
      const res = await fetch(`/api/runs/${runId}/simulate-reply`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sentiment }),
      });
      setSimResult(await res.json() as SimulatedReply);
    } finally { setSimulatingReply(false); }
  }

  function markStepSent(i: number) {
    setStepStates((prev) => prev.map((s, idx) => idx === i ? { status: "sent", sentAt: new Date().toLocaleTimeString() } : s));
  }
  function markStepOutcome(i: number, outcome: "replied" | "no_reply") {
    setStepStates((prev) => prev.map((s, idx) => idx === i ? { ...s, status: outcome } : s));
  }

  const playbook = packet.metadata.playbook;
  const ar = packet.account_research;
  const cr = packet.contact_research;
  const currentStep = stepStates.findIndex((s) => s.status === "sent");
  const allSent = stepStates.length > 0 && stepStates.every((s) => s.status !== "pending");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-semibold text-slate-900">Campaign Packet</h2>
            {playbook && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">
                {PLAYBOOK_LABELS[playbook]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {ar.company_name} · {cr.name} · ${(packet.metadata.total_cost_cents / 100).toFixed(4)} · {packet.metadata.duration_ms}ms
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNewCampaign} className="btn-secondary text-xs">
            + New campaign
          </button>
          {hubspotId ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
              <span>✓</span>
              <span className="font-mono">{hubspotId}</span>
            </div>
          ) : (
            <button onClick={pushToHubspot} disabled={pushing} className="btn-primary text-xs">
              {pushing ? "Pushing…" : "Push to HubSpot"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card p-6">

        {/* ── Email ── */}
        {tab === "Email" && (
          <div className="space-y-5">
            <div>
              <div className="label mb-1.5">Subject</div>
              <div className="text-slate-900 font-medium text-sm">{packet.email.subject}</div>
            </div>
            <div>
              <div className="label mb-1.5">Preview text</div>
              <div className="text-slate-500 text-sm italic">{packet.email.preview}</div>
            </div>
            <div>
              <div className="label mb-1.5">Body</div>
              <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-md p-4 border border-slate-200">
                {packet.email.body}
              </div>
            </div>

            {/* Reply simulator */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-700">How does {cr.name} reply?</div>
                <div className="text-xs text-slate-400">AI simulates the contact · generates your follow-up</div>
              </div>
              <div className="flex gap-2 mb-4">
                {(["positive", "neutral", "objection"] as const).map((s) => {
                  const sl = SENTIMENT_LABELS[s];
                  const active = simSentiment === s;
                  return (
                    <button
                      key={s}
                      onClick={() => simulateReply(s)}
                      disabled={simulatingReply}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all disabled:opacity-50 ${
                        active ? `ring-2 ${sl.ring} ${sl.bg} ${sl.text} border-transparent` : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {simulatingReply && active ? "Generating…" : sl.label}
                    </button>
                  );
                })}
              </div>

              {simResult && (
                <div className="space-y-3">
                  <div className={`rounded-md border p-4 ${SENTIMENT_LABELS[simResult.sentiment].bg}`}>
                    <div className={`text-xs font-medium mb-1.5 ${SENTIMENT_LABELS[simResult.sentiment].text}`}>
                      {cr.name}&apos;s reply
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed italic">&ldquo;{simResult.reply}&rdquo;</p>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs font-medium text-blue-600 mb-1.5">Your follow-up</div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{simResult.followup}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LinkedIn ── */}
        {tab === "LinkedIn" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="label">Connection note</div>
              <span className="text-xs text-slate-400">{packet.linkedin_note.char_count} / 300 chars</span>
            </div>
            <div className="text-slate-700 text-sm leading-relaxed bg-slate-50 rounded-md p-4 border border-slate-200">
              {packet.linkedin_note.text}
            </div>
          </div>
        )}

        {/* ── Agenda ── */}
        {tab === "Agenda" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-medium">{packet.discovery_agenda.title}</div>
              <span className="text-xs text-slate-400 font-medium">{packet.discovery_agenda.duration_minutes} min</span>
            </div>
            <ol className="space-y-2">
              {packet.discovery_agenda.talking_points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-slate-300 font-mono w-4 flex-shrink-0">{i + 1}.</span>
                  {point}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Send sequence ── */}
        {tab === "Send sequence" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="label">Campaign runner</div>
              <div className="text-xs text-slate-400">Mark each step sent to advance the cadence</div>
            </div>

            {packet.send_sequence.steps.map((step, i) => {
              const state = stepStates[i] ?? { status: "pending" };
              const isActive = state.status === "pending" && (i === 0 || ["sent","replied","no_reply"].includes(stepStates[i-1]?.status ?? ""));
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  state.status === "replied"  ? "border-emerald-200 bg-emerald-50"
                  : state.status === "no_reply" ? "border-slate-200 bg-slate-50"
                  : state.status === "sent"     ? "border-blue-200 bg-blue-50"
                  : isActive                    ? "border-slate-300 bg-white"
                  : "border-slate-100 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-mono text-xs w-10">D{step.day}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      step.channel === "email"    ? "bg-blue-100 text-blue-700"
                      : step.channel === "linkedin" ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{step.channel}</span>
                    <span className="text-slate-400 text-xs">{step.time}</span>
                    <span className="text-slate-400 text-xs hidden sm:block">{step.note}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.status === "pending" && isActive && (
                      <button onClick={() => markStepSent(i)} className="px-2.5 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                        Mark sent
                      </button>
                    )}
                    {state.status === "sent" && (
                      <>
                        <span className="text-blue-600 text-xs">Sent {state.sentAt}</span>
                        <button onClick={() => markStepOutcome(i, "replied")} className="px-2 py-0.5 text-xs rounded border border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-colors">Got reply</button>
                        <button onClick={() => markStepOutcome(i, "no_reply")} className="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors">No reply</button>
                      </>
                    )}
                    {state.status === "replied"  && <span className="text-emerald-600 text-xs font-medium">✓ Replied</span>}
                    {state.status === "no_reply" && <span className="text-slate-400 text-xs">No reply</span>}
                  </div>
                </div>
              );
            })}

            {currentStep >= 0 && (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="text-xs text-slate-500 mb-2">Simulate how {cr.name} responds</div>
                <div className="flex gap-2">
                  {(["positive", "neutral", "objection"] as const).map((s) => (
                    <button key={s} onClick={() => { setTab("Email"); simulateReply(s); }}
                      className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-600 hover:border-slate-400 transition-colors">
                      {SENTIMENT_LABELS[s].label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Opens Email tab with generated reply + follow-up</p>
              </div>
            )}
            {allSent && <div className="text-center text-xs text-slate-400 pt-2">Sequence complete</div>}
          </div>
        )}

        {/* ── Research ── */}
        {tab === "Research" && (
          <div className="space-y-8">
            {/* Account */}
            <div>
              <div className="label mb-3">Account Intel</div>
              <p className="text-slate-700 text-sm leading-relaxed mb-5">{ar.summary}</p>

              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1.5">Industry</div>
                  <div className="text-slate-700 text-sm">{ar.industry} · {ar.employees.toLocaleString()} employees</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1.5">ICP fit signals</div>
                  <ul className="space-y-1">
                    {ar.icp_fit_signals.map((s, i) => (
                      <li key={i} className="text-emerald-700 text-xs flex gap-1.5 items-center">
                        <span className="text-emerald-400">↑</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-400 font-medium mb-2">
                  Marketing stack
                  <span className="text-slate-300 ml-2 font-normal">— ⚡ click any tool for a live battlecard</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ar.marketing_stack.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => fetchBattlecard(tool)}
                      title={`Generate displacement battlecard for ${tool}`}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        battlecardTool === tool
                          ? "bg-orange-100 border-orange-300 text-orange-700"
                          : "bg-white border-slate-300 text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Battlecard */}
              {battlecardTool && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 mb-4">
                  {loadingBattlecard ? (
                    <div className="text-orange-500 text-xs">Generating battlecard for {battlecardTool}…</div>
                  ) : battlecard ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 text-sm font-semibold">{battlecard.tool}</span>
                        <button onClick={() => { setBattlecard(null); setBattlecardTool(null); }} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-orange-600 mb-1">Quotient replaces</div>
                        <p className="text-slate-700 text-xs leading-relaxed">{battlecard.replaces}</p>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-red-500 mb-1">Expected objection</div>
                        <p className="text-slate-600 text-xs leading-relaxed italic">&ldquo;{battlecard.objection}&rdquo;</p>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-emerald-600 mb-1">Reframe</div>
                        <p className="text-slate-700 text-xs leading-relaxed">{battlecard.reframe}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {ar.competitive_displacement_angle && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-medium text-amber-700 mb-1">Displacement angle</div>
                  <p className="text-slate-700 text-xs leading-relaxed">{ar.competitive_displacement_angle}</p>
                </div>
              )}

              {ar.recent_news.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">Recent news</div>
                  <ul className="space-y-1">
                    {ar.recent_news.map((n, i) => (
                      <li key={i} className="text-slate-500 text-xs flex gap-1.5"><span className="text-slate-300">·</span>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="border-t border-slate-100 pt-6">
              <div className="label mb-3">Contact Intel</div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-slate-900 font-medium text-sm">{cr.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{cr.role}</div>
                </div>
                {cr.linkedin_url && (
                  <a href={cr.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    LinkedIn →
                  </a>
                )}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-5">{cr.summary}</p>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1.5">Pain points</div>
                  <ul className="space-y-1">
                    {cr.pain_points.map((p, i) => (
                      <li key={i} className="text-slate-600 text-xs flex gap-1.5"><span className="text-slate-300">·</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1.5">Communication tips</div>
                  <ul className="space-y-1">
                    {cr.communication_tips.map((t, i) => (
                      <li key={i} className="text-slate-600 text-xs flex gap-1.5"><span className="text-slate-300">·</span>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="text-xs font-medium text-blue-600 mb-1">Champion hypothesis</div>
                  <p className="text-slate-700 text-xs leading-relaxed">{cr.champion_hypothesis}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500 mb-1">Buying trigger</div>
                  <p className="text-slate-700 text-xs leading-relaxed">{cr.buying_trigger}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
