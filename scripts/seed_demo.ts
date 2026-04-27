#!/usr/bin/env tsx
/**
 * Reset DB and seed 3 Quotient-flavored demo runs via the live API.
 * Usage: pnpm exec tsx scripts/seed_demo.ts
 */
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const DATABASE_URL = process.env["DATABASE_URL"];
const API_BASE = process.env["API_BASE"] ?? "https://agent-orchestrator.vercel.app";
const BASIC_USER = process.env["BASIC_AUTH_USER"] ?? "admin";
const BASIC_PASS = process.env["BASIC_AUTH_PASS"] ?? "outreach2026";

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const db = postgres(DATABASE_URL);

const BRIEFS = [
  {
    target_account: { name: "Figma", domain: "figma.com" },
    persona: { role: "Head of Marketing", seniority: "Director" },
    offer: { product: "Quotient", value_prop: "Replace 10 marketing tools with one AI agent that coordinates strategy, content, and execution" },
    sender: { name: "Alex", company: "Quotient", role: "AE" },
    playbook: "competitive_displacement" as const,
    icp_signals: "Marketo + Pardot customer, expanding enterprise GTM, recent marketing leadership hire",
  },
  {
    target_account: { name: "Linear", domain: "linear.app" },
    persona: { role: "Director of Demand Generation", seniority: "Director" },
    offer: { product: "Quotient", value_prop: "Cut campaign launch time from weeks to hours — one AI agent owns the full ABM workflow" },
    sender: { name: "Alex", company: "Quotient", role: "AE" },
    playbook: "abm_outbound" as const,
    icp_signals: "HubSpot + Apollo stack, Series B, small marketing team scaling fast",
  },
  {
    target_account: { name: "Notion", domain: "notion.so" },
    persona: { role: "CMO", seniority: "C-Level" },
    offer: { product: "Quotient", value_prop: "One AI agent for the entire campaign lifecycle — from ICP research to multi-channel execution" },
    sender: { name: "Alex", company: "Quotient", role: "AE" },
    playbook: "thought_leadership" as const,
    constraints: "Peer-to-peer only. CMO level — no feature list, no pitch in first touch.",
  },
];

async function reset() {
  console.log("Truncating run data…");
  await db`TRUNCATE TABLE packets, llm_calls, run_steps, runs, briefs RESTART IDENTITY CASCADE`;
  console.log("✓ DB cleared");
}

async function fireRun(brief: (typeof BRIEFS)[number], label: string) {
  const auth = "Basic " + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(brief),
  });
  if (!res.ok) throw new Error(`POST /api/runs failed: ${res.status} ${await res.text()}`);
  const { run_id } = await res.json() as { run_id: string };
  console.log(`  ▶ ${label} — run ${run_id}`);
  return { run_id, auth };
}

async function waitForRun(run_id: string, auth: string, label: string) {
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${API_BASE}/api/runs/${run_id}`, { headers: { Authorization: auth } });
    const data = await res.json() as { run: { status: string; total_cost_cents: number } };
    if (data.run.status === "succeeded") {
      console.log(`  ✓ ${label} — $${(data.run.total_cost_cents / 100).toFixed(4)}`);
      return;
    }
    if (data.run.status === "failed") {
      console.log(`  ✗ ${label} — failed`);
      return;
    }
    process.stdout.write(".");
  }
  console.log(`  ✗ ${label} — timed out`);
}

async function main() {
  await reset();

  console.log("\nFiring demo runs (this takes ~30s each)…\n");

  // Fire sequentially so the history rail shows them in a clean order
  for (const [i, brief] of BRIEFS.entries()) {
    const label = `${brief.target_account.name} / ${brief.persona.role}`;
    const { run_id, auth } = await fireRun(brief, label);
    await waitForRun(run_id, auth, label);
    if (i < BRIEFS.length - 1) {
      // Small gap so started_at timestamps differ visibly
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n✅  Demo DB seeded. Reload agent-orchestrator.vercel.app to see the history rail.\n");
  await db.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
