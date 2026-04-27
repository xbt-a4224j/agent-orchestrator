"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PLAYBOOK_LABELS: Record<string, string> = {
  abm_outbound: "ABM Outbound",
  competitive_displacement: "Competitive Displacement",
  thought_leadership: "Thought Leadership",
  event_followup: "Event Follow-up",
  reactivation: "Reactivation",
  unknown: "Unknown",
};

interface AdminData {
  campaigns: {
    total: number;
    succeeded: number;
    failed: number;
    running: number;
    success_rate: number | null;
  };
  cost: {
    avg_cents: number;
    total_cents: number;
    p95_cents: number;
  };
  playbook_mix: { playbook: string; count: number }[];
  recent_runs: {
    id: string;
    status: string;
    total_cost_cents: number;
    started_at: string;
    account: string | null;
    playbook: string | null;
  }[];
  db: {
    host: string;
    name: string;
    version: string;
    size: string;
    healthy: boolean;
  };
  integrations: {
    langfuse: boolean;
    anthropic: boolean;
  };
  reply_sentiments: { sentiment: string; count: number }[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(4)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => setData(d as AdminData))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading…</div>
    </div>
  );

  const maxPlaybook = Math.max(...data.playbook_mix.map((p) => p.count), 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Outpost Admin</h1>
              <p className="text-xs text-slate-400">Campaign pipeline health</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">
            ← Back to campaigns
          </Link>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Campaigns run"
            value={data.campaigns.total.toString()}
            sub={`${data.campaigns.running > 0 ? `${data.campaigns.running} running` : "none running"}`}
          />
          <StatCard
            label="Success rate"
            value={data.campaigns.success_rate !== null ? `${data.campaigns.success_rate}%` : "—"}
            sub={`${data.campaigns.succeeded} succeeded · ${data.campaigns.failed} failed`}
            highlight={data.campaigns.success_rate !== null && data.campaigns.success_rate >= 90}
          />
          <StatCard
            label="Avg. campaign cost"
            value={data.cost.avg_cents > 0 ? fmt(data.cost.avg_cents) : "—"}
            sub={`p95 ${data.cost.p95_cents > 0 ? fmt(data.cost.p95_cents) : "—"}`}
          />
          <StatCard
            label="Total API spend"
            value={data.cost.total_cents > 0 ? `$${(data.cost.total_cents / 100).toFixed(2)}` : "—"}
            sub="across all campaigns"
          />
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Reply sentiment */}
          <div className="card p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Reply sentiment</div>
            {data.reply_sentiments.length === 0 ? (
              <p className="text-slate-400 text-sm">No simulations run yet</p>
            ) : (() => {
              const total = data.reply_sentiments.reduce((s, r) => s + r.count, 0);
              const colors: Record<string, string> = {
                positive: "bg-emerald-500",
                neutral: "bg-slate-300",
                objection: "bg-red-400",
              };
              const labels: Record<string, string> = {
                positive: "Positive",
                neutral: "Neutral",
                objection: "Objection",
              };
              return (
                <div className="space-y-3">
                  {data.reply_sentiments.map((r) => (
                    <div key={r.sentiment}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">{labels[r.sentiment] ?? r.sentiment}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round((r.count / total) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors[r.sentiment] ?? "bg-slate-400"}`}
                          style={{ width: `${(r.count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-300 pt-1">{total} simulation{total !== 1 ? "s" : ""} total</p>
                </div>
              );
            })()}
          </div>

          {/* Playbook mix */}
          <div className="card p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Playbook mix</div>
            {data.playbook_mix.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.playbook_mix.map((p) => (
                  <div key={p.playbook}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">{PLAYBOOK_LABELS[p.playbook] ?? p.playbook}</span>
                      <span className="text-xs font-medium text-slate-500">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(p.count / maxPlaybook) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent runs */}
          <div className="card p-5 col-span-2 col-start-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Recent campaigns</div>
            {data.recent_runs.length === 0 ? (
              <p className="text-slate-400 text-sm">No runs yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_runs.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 py-2.5">
                    <StatusDot status={run.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {run.account ?? "Unknown account"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {PLAYBOOK_LABELS[run.playbook ?? ""] ?? run.playbook ?? "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400 font-mono">
                        {run.total_cost_cents > 0 ? fmt(run.total_cost_cents) : "—"}
                      </div>
                      <div className="text-xs text-slate-300">{timeAgo(run.started_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DB + integrations footer */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Database</div>
            <div className="space-y-2">
              <InfoRow label="Host" value={data.db.host} mono />
              <InfoRow label="Database" value={data.db.name} mono />
              <InfoRow label="Postgres" value={data.db.version} />
              <InfoRow label="Size" value={data.db.size} />
              <InfoRow
                label="Status"
                value={data.db.healthy ? "Healthy" : "Unhealthy"}
                valueClass={data.db.healthy ? "text-emerald-600" : "text-red-500"}
              />
            </div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Integrations</div>
            <div className="space-y-2">
              <InfoRow
                label="Anthropic API"
                value={data.integrations.anthropic ? "Connected" : "Missing key"}
                valueClass={data.integrations.anthropic ? "text-emerald-600" : "text-red-500"}
              />
              <InfoRow
                label="Langfuse"
                value={data.integrations.langfuse ? "Connected" : "Not configured"}
                valueClass={data.integrations.langfuse ? "text-emerald-600" : "text-slate-400"}
              />
              <InfoRow label="HubSpot" value="Mocked" valueClass="text-amber-500" />
              <InfoRow label="Resend" value="Mocked" valueClass="text-amber-500" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${highlight ? "text-emerald-600" : "text-slate-800"}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "succeeded" ? "bg-emerald-400"
    : status === "failed" ? "bg-red-400"
    : status === "running" ? "bg-blue-400 animate-pulse"
    : "bg-slate-300";
  return <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function InfoRow({ label, value, mono, valueClass }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""} ${valueClass ?? "text-slate-600"} truncate max-w-[160px]`}>
        {value}
      </span>
    </div>
  );
}
