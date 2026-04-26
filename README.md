# agent-orchestrator

[![CI](https://github.com/xbt-a4224j/agent-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/xbt-a4224j/agent-orchestrator/actions/workflows/ci.yml)

A typed multi-agent orchestrator for B2B outreach campaigns.

A planner decomposes a structured brief into specialist tasks. Specialists execute in parallel against shared research. A coordinator validates and merges results into a coordinated multi-channel outreach packet. Every LLM call is recorded so any run is bit-for-bit replayable from its event log.

**[Live demo →](https://agent-orchestrator.vercel.app)**

---

## What it produces

Give it a brief:

```json
{
  "target_account": { "name": "Notion", "domain": "notion.so" },
  "persona": { "role": "VP of Marketing", "seniority": "VP" },
  "offer": { "product": "Acme CRM", "value_prop": "Cuts outreach time by 60%" },
  "sender": { "name": "Alex", "company": "Acme", "role": "AE" },
  "goal": "book_meeting"
}
```

Get back a coordinated packet: personalized **email**, **LinkedIn note** (≤300 chars), **discovery agenda**, **send sequence** with seniority-aware timing, and the **research summary** used to generate each artifact.

---

## Three primitives this repo demonstrates

**1. Typed orchestration with dependency-aware fan-out.** The planner emits a DAG. The orchestrator walks it in topological waves, running parallel siblings with `Promise.all`. Failed steps mark their transitive dependents as `skipped` — no exception propagation, no silent data loss.

```
planner → account_research ──┐
        → contact_research ──┴→ outreach_writer ──┐
                                 linkedin_writer ──┤→ tone_checker
                                 agenda_writer  ──┘
```

**2. Fixture-based replay.** Every LLM call is keyed by `sha256(prompt)`. A `CapturingLLMClient` records calls during a live run; a `FixtureLLMClient` plays them back. Any past run re-executes with zero API spend and byte-identical outputs. A fast-check property test enforces the replay invariant across 25 randomly seeded runs.

**3. Per-step cost accounting.** Every step records `tokens_in`, `tokens_out`, `cost_cents`. The `MODEL_PRICING` table maps model IDs to per-million-token rates. The live run view shows a real-time cost ticker. A full run costs a few cents.

---

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turbo + pnpm workspaces |
| Engine | TypeScript 5.5 strict, no framework |
| Web | Next.js 15 App Router + Tailwind 3 |
| LLM | `@anthropic-ai/sdk` (claude-sonnet-4-6) |
| Schema | Zod — runtime validation, derived types |
| DB | Postgres 16, raw SQL migrations, `postgres` driver |
| Tests | Vitest + fast-check property tests |
| CI | GitHub Actions → lint, typecheck, test, 9-row matrix |
| Deploy | Vercel |

---

## Quickstart (local)

**Prerequisites:** Node ≥ 20, pnpm ≥ 9, Docker, Anthropic API key, Postgres (Neon or local)

```bash
git clone https://github.com/xbt-a4224j/agent-orchestrator.git
cd agent-orchestrator
cp .env.example .env.local
# edit .env.local: ANTHROPIC_API_KEY + DATABASE_URL
bash scripts/dev.sh
```

`dev.sh` starts a local Postgres container on port 5434, runs migrations, installs deps, and launches the dev server. App opens at http://localhost:3000 (or 3001/3002 if those ports are taken).

**Run the scenario matrix (no LLM calls, ~1s):**

```bash
pnpm exec tsx scripts/verify_matrix.ts
```

---

## Repo layout

```
packages/engine/src/
  schemas.ts          # Zod → Brief, Step, Run, Packet types
  errors.ts           # PlannerError, SpecialistError, + Result<T,E>
  cost.ts             # MODEL_PRICING + costCents()
  llm.ts              # Anthropic SDK wrapper, error classification
  dag.ts              # DAG schema with cycle detection
  planner.ts          # Tolerant JSON parser → DAG
  orchestrator.ts     # Topological wave executor with retry
  replay.ts           # CapturingLLMClient + FixtureLLMClient
  coordinator.ts      # Tone-check loop (max 1 retry, tone_failed flag)
  packet.ts           # assemblePacket() + buildSendSequence()
  specialists/        # account_research, contact_research, writers
  integrations/       # Mocked HubSpot, Resend, engagement webhook

packages/db/
  migrations/         # 0001_init.sql, 0002_packets.sql (5 tables)
  src/client.ts       # Typed query helpers, no ORM

apps/web/app/
  page.tsx            # State machine: idle → running → complete
  api/                # REST + SSE route handlers
  components/         # BriefForm, RunTree, CostTicker, PacketView, HistoryRail

scripts/
  dev.sh              # One-shot dev startup
  verify_matrix.ts    # 9-row E2E scenario matrix (final CI step)
  demo_reset.sh       # Truncate DB + reseed for clean demo
```

---

## Scenario matrix (9 rows, all asserted in CI)

| # | Scenario | Expected |
|---|---|---|
| 1 | Happy path | Packet with 5 artifacts, ≥6 succeeded steps |
| 2 | Planner emits invalid JSON | `PlannerError`, dependents skipped |
| 3 | Specialist 5xx → retry | 2 calls, run succeeds |
| 4 | Specialist 4xx → fail fast | Step `failed`, no retry |
| 5 | Tone rejects once | Writer called again with feedback |
| 6 | Tone rejects twice | `tone_failed` flag, no infinite loop |
| 7 | Replay round-trip | Byte-identical outputs from fixture |
| 8 | HubSpot push | Returns `hs_camp_<id>`, status `created` |
| 9 | Engagement webhook | `engagement_score` increments to 1 |

---

## Design decisions and trade-offs

See [DESIGN.md](DESIGN.md) — includes a "What was cut" section with reasoning for every scoping decision.

## License

MIT
