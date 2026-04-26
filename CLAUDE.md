# agent-orchestrator

A typed multi-agent orchestrator for B2B outreach campaigns. The planner decomposes a structured brief into specialist tasks; specialists execute in parallel; a coordinator merges results into a coordinated multi-channel packet. Every step persists with cost accounting; any past run is bit-for-bit replayable from its event log.

This file is the working dev-notes doc for building the project. Use it as the single source of truth when coding the tickets in `tickets.md`.

---

## Why this exists

A B2B sales rep wants to reach out to a target account (say, "Notion / VP of Marketing") with a coordinated touch across email, LinkedIn, and a discovery agenda. Doing it manually is slow and inconsistent across reps. Doing it with a single LLM prompt produces hallucinated company facts, generic copy, and no audit trail. Doing it with multiple uncoordinated LLM calls produces drift between artifacts (the email mentions one pain point, the LinkedIn note picks a different one) and is impossible to reason about when something goes wrong.

The right shape: small typed input → planner decomposes → specialist agents run in parallel against shared research → coordinator validates and merges → coordinated packet out. Every LLM call recorded as an event so any run can be replayed deterministically.

---

## Thesis

> A typed multi-agent orchestrator for marketing-brief execution. A planner decomposes the brief, specialists run, a coordinator merges, every step persists with cost accounting, and any run is bit-for-bit replayable from its event log.

The substrate claim: production LLM agent systems need three primitives that aren't in any single off-the-shelf library — typed orchestration with dependency-aware fan-out, fixture-based replay so non-determinism doesn't poison your regression tests, and per-step cost accounting so you can answer "where did the $1000 in API spend go?" This repo builds those three primitives in their minimum-viable form against a concrete domain (B2B outreach) so the trade-offs are real.

---

## Layers

### Layer 1 — Engine (`packages/engine`)

Plain TypeScript. No framework. Defines the data shapes (Brief, Step, Run, Packet), the planner, the specialist agents, the orchestrator (DAG executor), the LLM client wrapper, the cost accounting math, the event log, and the replay routine. Tested in isolation with vitest and one fast-check property test.

The engine is the thing a senior reviewer reads first. Everything else is a wrapper around it.

### Layer 2 — Persistence + API (`packages/db` + `apps/web/app/api`)

Raw SQL migrations against Postgres. Five tables: `runs`, `run_steps`, `llm_calls`, `briefs`, `packets`. Thin client wrapper — no ORM. Next.js route handlers expose a small REST surface (`POST /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/stream` for SSE, `POST /api/runs/:id/replay`) and wrap calls into the engine.

This is also where the mocked third-party integrations live: `pushToHubspot`, `sendViaResend`, and the `/api/webhooks/engagement` receiver.

### Layer 3 — Web app (`apps/web`)

Next.js + React + Tailwind. Three views in one page, state-machine driven (`idle` → `running` → `complete`):

- **Idle:** the brief form (10 fields).
- **Running:** the run tree-view that builds out as steps complete, plus a cost ticker, plus a scrolling event log.
- **Complete:** the packet view — a card with tabs across the top (`Email` | `LinkedIn` | `Agenda` | `Send sequence` | `Research`).

A left rail lists past runs; clicking one replays through views 2 and 3 using stored events (no LLM calls).

---

## Scope caps

These are hard caps. Going over any of them means cutting scope, not stretching the budget.

- **6 specialists max:** `planner`, `account_research`, `contact_research`, `outreach_writer`, `linkedin_writer`, `agenda_writer`, plus a `tone_checker` coordinator. (Yes, that's 7 logical roles — the cap is what runs as an LLM specialist.)
- **5 Postgres tables:** `runs`, `run_steps`, `llm_calls`, `briefs`, `packets`. No more.
- **3 mocked integrations:** HubSpot push, Resend send, engagement webhook receiver. No real network calls.
- **9-row scenario matrix:** every (input × expected outcome) cell asserted end-to-end in CI.
- **3 views in the web app:** idle / running / complete. No settings, no auth, no admin.
- **Single tenant:** no `tenant_id` columns, no row-level security, single hardcoded brand.

Always cut the second history-rail feature before cutting a property test.

---

## Scenario matrix

Every row is asserted end-to-end by `scripts/verify_matrix.ts` in CI.

| # | Scenario | Input shape | Expected |
|---|---|---|---|
| 1 | Happy path — all specialists succeed | Notion / VP Marketing / book_meeting | Packet has 5 artifacts, 6 steps logged, cost recorded |
| 2 | Planner emits invalid DAG JSON | (mock LLM returns malformed JSON) | Run fails with `PlannerError`, no specialists run |
| 3 | Specialist 5xx → retry → succeeds | (mock LLM 5xxs once on `outreach_writer`) | One retry, run succeeds, two `llm_calls` rows for that step |
| 4 | Specialist 4xx → no retry → fail fast | (mock LLM 4xxs on `linkedin_writer`) | Run partially complete, `linkedin_writer` step status = `failed` |
| 5 | Tone-checker rejects → writer retries with feedback | (tone_checker emits "rejected, too pushy") | One extra writer call, packet still produced |
| 6 | Tone-checker rejects twice → bounded retry exhausted | (tone_checker emits "rejected" twice) | Run completes with `tone_failed` flag on packet, no infinite loop |
| 7 | Replay round-trip — happy run | run #1's event log | Replay produces byte-identical packet, identical cost, identical step IDs |
| 8 | HubSpot push succeeds | completed packet | mocked endpoint returns `hs_camp_<id>`, packet row updated |
| 9 | Engagement webhook updates contact | POST `/api/webhooks/engagement` | `contacts.engagement_score` increments |

Rows 1, 5, 7 are the "happy" demo arcs. Rows 2, 4, 6 prove the failure handling. Rows 3, 8, 9 prove integration plumbing.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Turbo + npm workspaces | Standard TS monorepo; matches industry convention |
| Language | TypeScript 5.5 strict | One language across server + client |
| Web framework | Next.js 15 (app router) | Route handlers + SSE + React in one place |
| UI | React 18 + Tailwind 3 | Boring, fast |
| LLM client | Vercel AI SDK + `@anthropic-ai/sdk` | Tool-calling helpers, streaming, cost helpers |
| Schema validation | Zod | Runtime validation, derive types |
| DB | Postgres 16 (Neon-compatible) via `postgres` driver | Raw SQL, no ORM |
| Migrations | Numbered `.sql` files, runner in `scripts/migrate.ts` | Boring, auditable |
| Tests | Vitest + fast-check + testcontainers | Real DB in CI |
| CI | GitHub Actions | Lint + typecheck + test + matrix |
| Deploy | Vercel (free tier) | Matches one-button Next.js deploy |
| Release | semantic-release on push to main | Auto CHANGELOG |

---

## Repo layout

```
agent-orchestrator/
  apps/web/
    app/
      page.tsx                     # the three-state page (idle/running/complete)
      api/
        runs/route.ts              # POST /api/runs
        runs/[id]/route.ts         # GET /api/runs/:id
        runs/[id]/stream/route.ts  # SSE
        runs/[id]/replay/route.ts  # POST /api/runs/:id/replay
        webhooks/engagement/route.ts
      components/
        BriefForm.tsx
        RunTree.tsx
        PacketView.tsx
        HistoryRail.tsx
    package.json
  packages/engine/
    src/
      schemas.ts                   # Brief, Step, Run, Packet, errors
      planner.ts                   # decompose brief into DAG
      orchestrator.ts              # DAG executor with parallel fan-out
      specialists/                 # account_research, contact_research, writers, tone_checker
      llm.ts                       # Anthropic wrapper + cost calc
      replay.ts                    # fixture-based replay
      events.ts                    # event log helpers
    tests/
    package.json
  packages/db/
    migrations/
      0001_init.sql
      0002_packets.sql
    src/client.ts
    src/migrate.ts
    package.json
  scripts/
    dev.sh
    demo_reset.sh
    verify_matrix.ts               # 9-row integration test
  docs/
    architecture/
      01-component-topology.svg
      02-data-model.svg
      03-run-sequence.svg
      04-integration-boundary.svg
  tests/
    fixtures/llm/                  # recorded LLM responses for replay
  .github/workflows/
    ci.yml
    release.yml
    commitlint.yml
  .commitlintrc.json
  .pre-commit-config.yaml
  .releaserc.json
  .env.example
  CHANGELOG.md
  CLAUDE.md
  DESIGN.md
  DEMO.md
  README.md
  LICENSE
  package.json
  pnpm-workspace.yaml or workspaces in package.json
  turbo.json
  tsconfig.base.json
```

---

## Build order — 8 blocks, ~6–7 hours total

CI and tests are first-class. Tests ship inside the same ticket as the code they cover. Specialists are batched by similarity; integrations are mocked from the start.

- **Block 0 (scaffold + CI):** tickets #1–#4. Goal: CI green on empty Turbo monorepo.
- **Block 1 (primitives):** #5–#6. Schemas + error taxonomy. Interfaces before implementations.
- **Block 2 (core engine):** #7–#11. LLM wrapper, planner, orchestrator, tone-check loop, replay invariant + property test.
- **Block 3 (specialists):** #12–#14. Research, writers, packet assembler.
- **Block 4 (persistence + API):** #15–#18. Postgres schema, mocks, REST + SSE, replay endpoint.
- **Block 5 (UI):** #19–#21. Brief form, live run view, packet view + history rail.
- **Block 6 (matrix + observability):** #22–#23. Scenario matrix verifier wired into CI; structured run logs.
- **Block 7 (polish + docs):** #24–#25. README + DESIGN + DEMO + 4 architecture SVGs + Vercel deploy.

---

## What's deliberately cut

- **Prompt versioning + A/B routing.** Would be a clean third primitive (each run pins a prompt version, replay holds the version constant) but adds a table and a router. Mentioned in DESIGN.md trade-offs.
- **Multi-tenancy.** Single tenant, hardcoded brand context. The shape for adding it: `tenant_id` on every row, scope queries via Postgres row-level security, brand context joins on tenant.
- **Real third-party integrations.** HubSpot/Resend/engagement are typed mocks. The interfaces match the real APIs so swap is mechanical.
- **Streaming token output to UI.** The SSE pipe streams *step* events, not LLM tokens. Streaming the writer's tokens character-by-character would be nice but is out of scope.
- **Smart retry / circuit breaker.** Bounded retry (max 1) only, no breaker. Per-request orchestrator state has nowhere for breaker memory to live.
- **Distributed orchestration.** Single Node process, in-memory promise-fanout. The interface is positioned so swapping to a Redis-queue worker pool is a 30-line change at the dispatch seam.
- **Observability beyond Postgres.** No OTel, no Langfuse. The trace IS the `run_steps` table rendered as a tree. Defensible because the demo's whole point is showing you'd build the trace primitive in-house.

---

## Senior signals to hit

- Typed step states (`pending | running | succeeded | failed | skipped`) as a string-literal union, not strings
- Typed error taxonomy: `PlannerError`, `SpecialistError`, `ToneCheckExhausted`, `ReplayMismatch`
- Interfaces before implementations: `schemas.ts` ships in #5 before `orchestrator.ts` in #9
- One fast-check property test on the replay invariant (replay produces identical state)
- Cost accounting math unit-tested with edge cases (zero tokens, unknown model, negative input → throws)
- Scenario matrix runs as final CI step; matrix failure fails the build
- Real Postgres in integration tests via testcontainers; no mocked persistence
- DESIGN.md has a "What was cut" section with reasons
- 4 architecture SVGs with consistent visual conventions (mono font for component names, color families per concept layer, white-bg rect for GitHub dark mode)
- Conventional commits + semantic-release; `chore(release): X.Y.Z [skip ci]` commits in the log

---

## Landmines (learned the hard way — likely to bite during build)

- **Vercel AI SDK + tool-calling JSON parsing.** The model occasionally emits trailing commas or markdown-fenced JSON. Always wrap in a tolerant parser (`JSON.parse` first, fallback to a stripped-fence retry, then fail with `PlannerError`).
- **SSE on Vercel (App Router).** Use `Response` with `ReadableStream` not `EventSource` server-side; ensure `text/event-stream` content-type and explicit `\n\n` separators. Vercel's edge runtime has timeouts — pin to `runtime: "nodejs"` for streaming routes.
- **Postgres connection pooling on Neon.** Use the pooled connection string for serverless; non-pooled for migrations.
- **Lamport ordering of step events for replay.** If two specialists complete in the same millisecond, replay must use a monotonic step counter, not `Date.now()`.
- **fast-check property tests + LLM calls.** Property tests must use fixtures, not live LLMs, or they'll hammer your API budget. The replay harness ships in #11 specifically because everything after depends on it.
- **Turbo + Next.js dev caching.** `turbo dev` caches package builds aggressively; if you change `packages/engine` and don't see it reflected, restart with `turbo dev --force`.
- **`tone_checker` infinite loops.** If the writer keeps rephrasing into rejection, you need a hard retry cap (max 1) AND a `tone_failed` flag on the packet, not unbounded recursion.

---

## Execution mode (read this if you're Claude Code working through `tickets.md`)

This section is the operating manual for the agent (you, probably) shipping the tickets one by one. The user expects narration as you go — they're not just looking for code in main, they're looking for the *thinking* behind it. Slow down enough to surface decisions.

### The loop, per ticket

1. **Load context.** Read this file (`CLAUDE.md`) if you haven't. If `INTERVIEW_NOTES.md` exists locally (it's gitignored — present only on the user's machine), read it too. That file maps tickets to the talking points the user will use in interview, and you should reference it when narrating.
2. **Pick the next ticket.** Run `gh issue list --state open --json number,title,labels,body --limit 50`. Filter to issues whose `Blocked by` lines (in the body) reference only closed issues. Among those, pick the lowest-numbered. Don't skip ahead — block ordering exists for a reason.
3. **Claim it.** Create a todo for the ticket using `TaskCreate`, status `in_progress`. Comment on the issue: `gh issue comment <N> --body "Starting"`.
4. **Branch.** `git checkout -b <type>/<N>-<short-slug>`. Type matches the ticket's conventional-commit type. Slug is 2–4 words from the title.
5. **Implement.** Read the ticket body in full. Implement against the acceptance criteria — every checkbox must be satisfiable on commit. Tests ship in the same commit as the code they cover.
6. **Narrate as you go.** This is the part that matters. See "Narration discipline" below.
7. **Verify locally.** Run `npm run lint && npm run typecheck && npm test -- --run`. If anything is red, fix it before commit. Never commit red.
8. **Commit.** One commit per ticket. Use the ticket title verbatim as the commit subject — it was authored as commit-subject-ready.
9. **PR + auto-merge.**
   ```bash
   gh pr create --fill --body "Closes #<N>"
   gh pr merge --auto --squash
   ```
   Wait for CI green. If CI fails, fix in the same branch and push again — don't open a new PR.
10. **Close out.** Update the todo to `completed`. Tick the ticket's acceptance checkboxes via the GitHub UI or `gh issue edit`.
11. **Pause.** Confirm with the user before claiming the next ticket. Don't auto-chain.

### Narration discipline (don't skip)

Every time you make a non-trivial decision while implementing a ticket, surface it in chat. Format:

> *"In `packages/engine/src/orchestrator.ts:47` I'm using `Promise.allSettled` instead of `Promise.all` because a single specialist failure shouldn't poison the parallel siblings — the orchestrator marks the failed step and continues. Trade-off: every caller has to handle the partial-success case explicitly. This is the substrate move under JD line 'building tools, improving orchestration, and making our agents smarter' — the failure mode IS the orchestration design."*

The shape:
- **Where** — `<path>:<line>` or `<path>:<symbol>`. Same form Claude Code uses internally; copies cleanly into IDE go-to-definition.
- **What** — the choice you made.
- **Why** — the trade-off, or what you ruled out.
- **JD callback when applicable** — name the JD bullet (from `INTERVIEW_NOTES.md`) the choice maps to.

You don't need to narrate every line. Narrate at decision boundaries: choosing between two valid approaches, picking a library, naming a type, deciding what to test, deciding what *not* to test, structuring a file. Skip narration for obvious work (writing imports, pasting boilerplate).

### After each ticket merges — talking-point hand-back

Every merge ends with a one-paragraph summary back to the user, structured as:

```
Shipped #N: <title>

Code: <key path>:<line> — <one-line of what changed>
Test: <key test path> — <one-line of what's covered>
JD line covered: "<verbatim quote from JD>" (per INTERVIEW_NOTES.md)
Talking point this earns: "<one-sentence interview soundbite>"
DESIGN.md note (if applicable): <trade-off worth defending>
```

This is the JD-mapping you'll surface in interview, generated as a side effect of the work. By the time all 25 tickets ship, every JD bullet has at least one concrete example tied to a real commit on main.

### Block-level pauses

After each block completes (B0 done, B1 done, etc.), do a longer hand-back:

```
Block <N> complete. Tickets <#a–#b> shipped on main.

What this block proves: <1–2 sentence framing>
JD lines this block hit: <list, with quotes>
Senior signals planted: <list>
Carry-forward risk: <anything that might bite future blocks>

Want to continue to Block <N+1>, or step away?
```

Block-level pauses are when the user makes the natural call to ship for the day, take a break, or push through. Don't decide for them.

### When to escalate to the user mid-ticket

Stop and ask if:
- A ticket's acceptance criteria are ambiguous on second read.
- An implementation choice would change a public interface another ticket depends on.
- An LLM call would cost more than ~$1 in a single ticket (sanity-check budget).
- A test you'd write to satisfy the acceptance criteria would take longer than the rest of the ticket combined.
- You'd need to add a new dependency not listed in the ticket's `What.` section.

In all five cases, narrate the situation, propose 2–3 options, ask the user to pick. Don't pick for them.

### Conventional-commit reminder

Every commit on this repo is conventional. The commit subject is the ticket title — that's why ticket titles read like commit messages. Subject ≤72 chars, lowercase-ish, imperative mood, no trailing period. Body explains why; footer carries `Closes #N`. Semantic-release picks up `feat:` and `fix:` and cuts versions automatically.

