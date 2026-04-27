"use client";

import { useState } from "react";
import type { Brief, Playbook } from "@agent-orchestrator/engine/client";
import { PLAYBOOK_LABELS } from "@agent-orchestrator/engine/client";
import { SAMPLE_BRIEFS } from "./SampleBriefs";

interface BriefFormProps {
  onSubmit: (runId: string) => void;
}

const PLAYBOOKS: { value: Playbook; label: string; description: string }[] = [
  { value: "abm_outbound",           label: PLAYBOOK_LABELS.abm_outbound,           description: "Research + personalized multi-channel outreach to a target account" },
  { value: "competitive_displacement", label: PLAYBOOK_LABELS.competitive_displacement, description: "Lead with their current stack — position as the consolidation play" },
  { value: "thought_leadership",     label: PLAYBOOK_LABELS.thought_leadership,     description: "Peer-to-peer, no pitch — build a relationship before a pipeline" },
  { value: "event_followup",         label: PLAYBOOK_LABELS.event_followup,         description: "Warm follow-up from a shared event, webinar, or conference" },
  { value: "reactivation",           label: PLAYBOOK_LABELS.reactivation,           description: "Re-engage a cold or churned account with new context" },
];

export default function BriefForm({ onSubmit }: BriefFormProps) {
  const [brief, setBrief] = useState<Brief>(SAMPLE_BRIEFS["figma"]!.brief);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(key: string) {
    const sample = SAMPLE_BRIEFS[key];
    if (sample) setBrief(sample.brief);
  }

  function update(path: string[], value: string) {
    setBrief((prev) => {
      const next = structuredClone(prev) as Record<string, unknown>;
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]!] as Record<string, unknown>;
      }
      cur[path[path.length - 1]!] = value;
      return next as Brief;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error);
      }
      const data = await res.json() as { run_id: string };
      onSubmit(data.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const selectedPlaybook = PLAYBOOKS.find((p) => p.value === brief.playbook);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Outpost</h1>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Give it a target account — it researches, writes, and plans a coordinated outreach campaign in under 60 seconds.
        </p>
      </div>

      {/* Sample presets */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Try a sample:</span>
        {Object.entries(SAMPLE_BRIEFS).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section legend="Campaign">
          <Field label="Playbook">
            <select
              className="input"
              value={brief.playbook ?? "abm_outbound"}
              onChange={(e) => update(["playbook"], e.target.value)}
            >
              {PLAYBOOKS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {selectedPlaybook && (
              <p className="text-xs text-slate-400 mt-1.5">{selectedPlaybook.description}</p>
            )}
          </Field>
          <Field label="ICP signals">
            <input
              className="input"
              value={brief.icp_signals ?? ""}
              onChange={(e) => update(["icp_signals"], e.target.value)}
              placeholder="Recent funding, hiring marketing ops, Marketo customer, Series B…"
            />
          </Field>
          <Field label="Constraints">
            <input
              className="input"
              value={brief.constraints ?? ""}
              onChange={(e) => update(["constraints"], e.target.value)}
              placeholder="Peer-to-peer tone. No hyperbole. Under 100 words."
            />
          </Field>
        </Section>

        <Section legend="Target account">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name" required>
              <input
                className="input"
                value={brief.target_account.name}
                onChange={(e) => update(["target_account", "name"], e.target.value)}
                required
              />
            </Field>
            <Field label="Domain">
              <input
                className="input"
                value={brief.target_account.domain ?? ""}
                onChange={(e) => update(["target_account", "domain"], e.target.value)}
                placeholder="notion.so"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Persona role" required>
              <input
                className="input"
                value={brief.persona.role}
                onChange={(e) => update(["persona", "role"], e.target.value)}
                required
              />
            </Field>
            <Field label="Seniority">
              <input
                className="input"
                value={brief.persona.seniority ?? ""}
                onChange={(e) => update(["persona", "seniority"], e.target.value)}
                placeholder="VP, Director, C-Level…"
              />
            </Field>
          </div>
        </Section>

        <Section legend="Offer">
          <Field label="Product" required>
            <input
              className="input"
              value={brief.offer.product}
              onChange={(e) => update(["offer", "product"], e.target.value)}
              required
            />
          </Field>
          <Field label="Value proposition" required>
            <input
              className="input"
              value={brief.offer.value_prop}
              onChange={(e) => update(["offer", "value_prop"], e.target.value)}
              required
            />
          </Field>
        </Section>

        <Section legend="Sender">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Your name" required>
              <input
                className="input"
                value={brief.sender.name}
                onChange={(e) => update(["sender", "name"], e.target.value)}
                required
              />
            </Field>
            <Field label="Company" required>
              <input
                className="input"
                value={brief.sender.company}
                onChange={(e) => update(["sender", "company"], e.target.value)}
                required
              />
            </Field>
            <Field label="Role" required>
              <input
                className="input"
                value={brief.sender.role}
                onChange={(e) => update(["sender", "role"], e.target.value)}
                required
              />
            </Field>
          </div>
        </Section>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm transition-colors"
        >
          {loading ? "Starting…" : "Generate campaign →"}
        </button>
      </form>
    </div>
  );
}

function Section({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{legend}</div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
