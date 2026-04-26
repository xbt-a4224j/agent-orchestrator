# agent-orchestrator — Study Guide

This guide walks through what was built, why each decision was made, and how to talk about it in an interview. Read it after stepping through the code, not before.

---

## Block 0 — Scaffold + CI

**What you built:** Turbo monorepo with pnpm workspaces, three packages (`engine`, `db`, `web`), GitHub Actions CI with lint + typecheck + test + scenario matrix, commitlint, semantic-release.

**Why it matters:** CI is load-bearing from day one. If you build the engine without a green CI pipeline, you end up with technical debt in the most annoying place — the thing that should be a forcing function for code quality becomes an afterthought. Starting here means every subsequent ticket is "does CI stay green."

**Landmines you hit:**
- Turbo needs `"packageManager": "pnpm@9.15.9"` in root `package.json` to resolve workspaces — undocumented but required
- `tsx` must be in root devDependencies for `pnpm exec tsx` to work in CI

**Interview questions:**

*Q: Why Turbo over just pnpm scripts?*
A: Turbo gives you task-level caching and parallelism across packages. `pnpm test` runs all test suites sequentially; `turbo test` runs them in parallel and skips packages whose inputs haven't changed. For a monorepo with three packages, the speedup is modest — but the caching semantics are the real win when you add more packages or run on CI.

*Q: Why pnpm over npm?*
A: Strict dependency isolation (phantom deps are a build-time error, not a runtime surprise), disk efficiency via content-addressable store, and first-class workspace support. Also compatible with Turbo's pipeline model out of the box.

---

## Block 1 — Schemas + Error Taxonomy

**What you built:** `schemas.ts` (Zod → TypeScript types), `errors.ts` (typed error hierarchy + `Result<T,E>`).

**Why it matters:** Every bug in an LLM-backed system either shows up as "something returned null" or "something threw a string." Zod catches the first at runtime with a readable error message. The typed error taxonomy catches the second at compile time — `SpecialistError`, `LLMTransientError`, `LLMPermanentError` are types, not strings, so a caller that doesn't handle the transient case gets a TypeScript error.

**The `Result<T,E>` pattern:**
```typescript
type Result<T, E extends EngineError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```
No exceptions flowing through orchestration. Every branch is explicit. The orchestrator collects results from parallel specialists and decides what to skip vs fail based on which `ok: false` results arrived — you can't do this cleanly with try/catch across `Promise.all`.

**Interview questions:**

*Q: Why not just throw exceptions?*
A: Exceptions work well for synchronous, single-path code. In an async fan-out — six specialists running in parallel — a thrown exception from one specialist terminates the entire `Promise.all` and drops results from all other specialists. With `Result<T,E>`, each specialist returns its result independently. The orchestrator collects them all, then decides which steps to mark failed and which dependents to skip. That's the difference between a partially-succeeded run and a hard crash.

*Q: When would you prefer exceptions?*
A: At system boundaries where you genuinely can't recover — unhandled promise rejections, uncaught errors in route handlers. Inside the engine, Result is cleaner. At the Express/Next.js layer, a try/catch wrapper that converts to HTTP status codes is the right boundary.

*Q: Explain the error taxonomy.*
A: `LLMTransientError` is 408/429/5xx — retryable. `LLMPermanentError` is 4xx / unknown model / bad input — not retryable. `SpecialistError` wraps whichever LLM error the specialist encountered, plus the agent name and attempt count. `PlannerError` fires when the planner's LLM call fails (not when it returns a bad DAG — that falls back to `DEFAULT_DAG`). `ToneCheckExhausted` fires after the second rejection. `ReplayMismatch` fires when a fixture isn't found for a prompt hash.

---

## Block 2 — Core Engine

**What you built:** `llm.ts`, `dag.ts`, `planner.ts`, `orchestrator.ts`, `events.ts`, `coordinator.ts`, `replay.ts`.

**Why it matters:** This is the heart of the project. Everything else is wrapper.

### LLM Client (`llm.ts`)

```typescript
interface ILLMClient {
  model: string;
  call(prompt: string): Promise<Result<LLMCallResult, LLMTransientError | LLMPermanentError>>;
}
```

The interface is the seam. The `LLMClient` implementation wraps `@anthropic-ai/sdk`. The `CapturingLLMClient` wraps any `ILLMClient` and records calls. The `FixtureLLMClient` plays them back. All three satisfy the same interface — the orchestrator never knows which one it's talking to.

**Anthropic SDK error classes:** `APIConnectionError` (network failure → transient), `APIError` with `.status` (check status code to classify). Not `APIStatusError` — that class doesn't exist in the SDK.

### DAG + Planner

The DAG schema has two `.refine()` validators: one for missing `depends_on` references, one for cycle detection via DFS. If either fires, Zod throws a parse error.

`tolerantParse()` tries `JSON.parse` first, then strips markdown fences and retries. If the model returns `{ "nodes": [...] }` wrapped in triple backticks, the second try catches it. If both fail, return `DEFAULT_DAG` — the planner failing to customize the DAG doesn't mean the run should fail.

### Orchestrator — topological wave execution

```typescript
while (completed.size + failed.size < dag.nodes.length) {
  const ready = dag.nodes.filter(
    n => stepStatus[n.id] === "pending" &&
         n.depends_on.every(d => completed.has(d) || failed.has(d))
  );
  // ...
  await Promise.all(toRun.map(async node => { ... }));
}
```

"Ready" = all dependencies are done (succeeded or failed). "Skipped" = at least one dependency failed. The loop terminates when all nodes are accounted for or no progress is being made (deadlock guard).

**Interview questions:**

*Q: How does retry work?*
A: `runWithRetry()` wraps the specialist call. On `LLMTransientError` (detected via `error.cause instanceof LLMTransientError`), it retries once. On any other error — or after the first retry — it fails. Max 1 retry is hardcoded. A circuit breaker would need per-model state that survives between calls, which requires either a long-lived worker process or a shared store.

*Q: How does the replay invariant hold?*
A: The `CapturingLLMClient` records every successful LLM call as `{ promptHash: sha256(prompt), response }`. `recordRun()` builds a `Map<promptHash, response>`. `FixtureLLMClient` looks up by hash. As long as the specialist builds the same prompt for the same inputs, replay produces the same response. The fast-check property test generates 25 random briefs and asserts `JSON.stringify(replay.outputs) === JSON.stringify(live.outputs)`. Any refactor that changes prompt construction without updating fixtures fails the property test immediately.

*Q: Why sha256 of the prompt as the key?*
A: Determinism. Two prompts with identical content should return the same cached response. Using the run ID + step ID as the key would break replay if step IDs change between runs (they're UUIDs). The hash gives you content-addressable lookup — the same question always points to the same answer, regardless of when it was asked or in which run.

*Q: What does the tone-check loop look like?*
A: `coordinator.ts` wraps the outreach writer + tone checker. It calls the writer, calls the tone checker, and if rejected, calls the writer once more with the feedback as a `deps["tone_feedback"]` injection. A second rejection sets `tone_failed: true` on the packet. The hard retry cap (1) means the coordinator never loops more than twice — no unbounded recursion.

---

## Block 3 — Specialists + Packet

**What you built:** Six specialists plus `assemblePacket()` and `buildSendSequence()`.

**Why it matters:** Specialists are where the actual value is produced. The engine is correct by construction; specialists are where domain knowledge goes.

**Key design:** All specialists accept `feedback?: string` in their input schema. This is the tone-checker injection point. When the coordinator retries the outreach writer, it passes `deps["tone_feedback"]` — the specialist includes it in the prompt.

**Packet assembly:** `assemblePacket()` takes all specialist outputs + the run + the brief. `buildSendSequence()` is rules-based — VP+ titles get Tue 9am email, Wed LinkedIn, no follow-up before Friday. Manager-level gets Wed 11am. This is a policy, not an LLM call — deliberate.

**Interview questions:**

*Q: Why rules-based send sequencing instead of an LLM?*
A: Two reasons. First, it's a policy — "VP gets Tuesday morning" is a business rule, not something that should vary based on model output. Second, rules are testable. You can assert `send_sequence[0].scheduled_for.getDay() === 2` (Tuesday) and it either passes or fails. An LLM-generated sequence would require a semantic assertion, which is harder to pin down.

*Q: The enrichment mock — what would replacing it look like?*
A: `enrichment.mock.ts` returns fixture data keyed by domain. The real version would hit Apollo.io or LinkedIn Sales Navigator. The interface is `getEnrichmentData(domain: string): EnrichmentData`. Swap the import, add the API key — nothing upstream changes because the return type is the same.

---

## Block 4 — Persistence + API

**What you built:** `packages/db` (5 tables, raw SQL migrations, typed query helpers), Next.js route handlers for REST + SSE, `executeRun()` pipeline.

**Why it matters:** Persistence is where "it works in a test" becomes "it works in production." The `llm_calls` table with `UNIQUE(step_id, request_hash)` is the replay source — that constraint prevents double-recording if a specialist retries with the same prompt.

**The 5 tables:** `briefs`, `runs`, `run_steps`, `llm_calls`, `packets`. No `tenant_id` columns — single tenant by design. The shape is obvious extension points if needed.

**SSE streaming:**
```typescript
export const runtime = "nodejs";
```
This is load-bearing. Vercel's edge runtime has a 25-second response timeout. A full orchestrator run with 7 specialists can take longer than that. Pinning to Node.js runtime allows long-running SSE connections.

**Interview questions:**

*Q: Why no ORM?*
A: Raw SQL is auditable, predictable, and has no magic. The query layer is thin typed functions: `insertRun(db, run)`, `appendStep(db, step)`. You can read the exact SQL in `client.ts`. No ORM magic means no surprise N+1 queries, no mystery columns, no migration framework to learn.

*Q: How does the SSE work?*
A: The route handler creates a `ReadableStream` with a `start(controller)` callback. It subscribes to the `OrchestratorEmitter` for the run — which is stored in a `Map<run_id, OrchestratorEmitter>` in process memory. Each step event is encoded as `data: <JSON>\n\n` and enqueued. The stream closes when it receives `run.completed` or `run.failed`. On the client, `EventSource` connects to the stream URL and dispatches incoming messages to a `useReducer`.

*Q: What happens if the server restarts mid-run?*
A: The in-memory emitter is gone — the SSE stream closes, the client stops receiving events. The run row in Postgres still has `status: 'running'`. A production fix: move orchestration to a queue-based worker (e.g., BullMQ) that can resume. For this demo, the user can refresh the history rail and click the run to see the stored steps — the run tree still renders from DB state.

---

## Block 5 — Web UI

**What you built:** Three-view state machine (idle → running → complete), BriefForm with preset loadouts, RunTree with live DAG visualization, CostTicker with rAF tween, EventLog with auto-scroll, PacketView with 5 tabs, HistoryRail.

**Why it matters:** The UI is the demo. A hiring manager who doesn't read code will judge the project by whether the UI makes the primitives legible — can they watch specialists fan out in parallel? Can they see cost tick up in real time?

**Key components:**

`RunTree.tsx` — ordered by `AGENT_ORDER` array, not by event arrival time. Each agent slot renders with a status color before it starts (gray) so the full DAG shape is visible from the beginning.

`CostTicker.tsx` — `requestAnimationFrame` tween: `current += (target - current) * 0.15` per frame. Target is the live `totalCostCents` from the SSE stream. The ticker smoothly approaches the target rather than jumping.

`PacketView.tsx` — five tabs: Email, LinkedIn, Agenda, Send sequence, Research. Each tab renders the relevant slice of the packet. "Push to HubSpot" calls `POST /api/runs/:id/hubspot` and shows the returned campaign ID.

**Interview questions:**

*Q: Why a state machine for the page (idle/running/complete)?*
A: Three views share the same URL. A state machine makes transitions explicit and prevents impossible states — you can't be simultaneously idle and showing a packet. React `useState` with a string literal union (`"idle" | "running" | "complete"`) is the minimal implementation.

*Q: Why poll the history rail every 5 seconds instead of SSE?*
A: The history rail shows all past runs, not just the current one. An SSE connection would need to push events for every run in the system, or you'd need a separate SSE channel per run. Polling at 5s is simple and correct — the data isn't that latency-sensitive.

*Q: How does `useRunStream` work?*
A: It wraps `EventSource`. On mount (when `runId` is non-null), it opens an `EventSource` to `/api/runs/:id/stream`. Each `message` event dispatches to a `useReducer` that appends to the `events` array and tracks `status` and `totalCostCents`. On unmount, it closes the `EventSource` and removes the listener.

---

## Block 6 — Scenario Matrix + Observability

**What you built:** `scripts/verify_matrix.ts` (9 rows, all stubs, ~1s), `log.ts` (JSON structured logging), matrix wired as final CI step.

**Why it matters:** The matrix is the contract. Every claim in the CLAUDE.md scenario table is enforced by code. If the orchestrator starts retrying on permanent errors, row 4 fails. If the tone-checker loops infinitely, row 6 fails.

**Structured logging:**
```typescript
log({ level: "info", event: "step.started", run_id, step_id, agent });
```
JSON one-liners to stdout. In production, you'd ship these to Datadog or Grafana Loki via a log drain. The schema is stable enough to build dashboards on — `event` is the dimension, `run_id` groups by run, `agent` groups by specialist.

**Interview questions:**

*Q: Why run the matrix in CI as the final step, not as part of the test suite?*
A: The matrix is end-to-end — it imports the full engine, runs multiple orchestrator calls, and checks cross-cutting invariants. Unit tests run per-package; the matrix runs across the entire system. Making it a separate CI step that runs after all unit tests fail-fast on package test failures before reaching the expensive E2E checks.

*Q: How did you make the matrix fast (no LLM calls, ~1s)?*
A: `stubLLM()` returns a fixed string immediately. `happyRegistry()` returns stub functions for all specialists. The orchestrator doesn't know it's talking to stubs — it just calls `specialist(input)` and gets a `Result`. The only thing being tested is the orchestration logic, retry behavior, error handling, and integration contract — not LLM output quality.

---

## The Three Interview Pitches

### Pitch 1: "Tell me about a project you're proud of"

> "I built a typed multi-agent orchestrator for B2B outreach. You give it a brief — account, persona, goal — and it runs specialists in parallel against shared research, validates the output through a tone checker, and emits a coordinated packet: email, LinkedIn, agenda, send sequence. Three technical primitives I'm proud of: dependency-aware fan-out with typed error handling so partial failures don't hide each other; fixture-based replay so you can regression-test an LLM system deterministically; and per-step cost accounting so you can trace exactly where API spend is going. The whole thing is backed by Postgres with raw SQL, nine end-to-end scenarios that run in under two seconds in CI, and a live demo."

### Pitch 2: "How would you design an LLM agent system for production?"

Key points to hit:
1. **Typed contracts at every seam.** Result<T,E> instead of exceptions. Zod for runtime validation. Typed error taxonomy so retry logic is deterministic.
2. **Non-determinism is the enemy of tests.** Fixture-based replay keyed by prompt hash. Property tests across many inputs. Zero live LLM calls in CI.
3. **Partial failure is the default.** Fan-out with skip propagation. A failed specialist shouldn't crash the run — it should mark its dependents skipped and return a partial result.
4. **Cost accounting from day one.** Per-call and per-step. Makes the tradeoff between model quality and cost visible.
5. **Observability as the trace.** The `run_steps` table IS the trace. Structured JSON logs are the hook for external observability.

### Pitch 3: "What would you cut if you had to ship in 2 days?"

1. **Replay.** The orchestrator still works without it. Replay is a testing primitive — valuable for regression tests, not for the first demo.
2. **Tone-check loop.** Accept whatever the writer produces on first attempt. The loop is 30 lines but adds complexity to coordinator.ts.
3. **History rail.** Single run per session, no persistence UI. Saves the entire persistence + API + run-from-history flow.
4. **Cost ticker.** Useful signal but not core to the demo value.

What you'd keep: the typed error taxonomy (cheap), the DAG executor (the whole point), the three specialist outputs (email + LinkedIn + agenda), and the packet view.

---

## Cheat Sheet: 10 Questions, 10 Answers

| Q | A |
|---|---|
| Why Result<T,E> instead of exceptions? | Parallel fans-out → can't catch exceptions across Promise.all without losing results from other branches |
| How does retry work? | runWithRetry(): once on LLMTransientError (408/429/5xx), never on LLMPermanentError (4xx). Hard max = 1 |
| How does replay work? | sha256(prompt) → fixture. CapturingLLMClient records; FixtureLLMClient plays back. Same prompt = same response |
| Why sha256(prompt) as the key? | Content-addressable. Same question → same answer regardless of run ID or step ID |
| What does tone-check failure do? | tone_failed: true on packet. Max 1 retry. No infinite loop |
| How does the DAG executor terminate? | Loop exits when completed + failed == total nodes, or when no ready nodes remain (deadlock guard) |
| Why raw SQL, no ORM? | Readable, auditable, no N+1 surprises, no migration framework to configure |
| Why nodejs runtime for SSE? | Edge runtime times out at 25s. Long orchestrator runs exceed that |
| What's the fast-check property test? | 25 random briefs. Assert replay.outputs byte-identical to live.outputs. Any prompt change without fixture update fails |
| What would you add next? | Prompt versioning (each run pins a prompt hash, replay holds it constant) and a distributed queue worker for resilience |
