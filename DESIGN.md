# Design Notes

Architecture decisions, trade-offs, and deliberate cuts.

---

## Core claims

This repo is built around three primitives that are absent from most off-the-shelf orchestration libraries:

**Typed orchestration with dependency-aware fan-out.** The planner emits a validated DAG (`DagSchema` with cycle detection). The executor walks it in topological waves using `Promise.all` for parallel siblings. Typed step states (`pending | running | succeeded | failed | skipped`) and a typed error taxonomy (`PlannerError`, `SpecialistError`, `LLMTransientError`, `LLMPermanentError`) make failure modes explicit at the type level — no stringly-typed error handling.

**Fixture-based replay.** LLM non-determinism is the primary enemy of regression tests. The replay harness keys every LLM response by `sha256(prompt)`. A `CapturingLLMClient` wraps the live client and records all calls into a `RecordedRun`. A `FixtureLLMClient` replays them deterministically. A fast-check property test runs 25 random briefs and asserts that `JSON.stringify(replay.outputs) === JSON.stringify(live.outputs)` — so any refactor that breaks determinism fails the property test immediately.

**Per-step cost accounting.** Every step records `tokens_in`, `tokens_out`, `cost_cents`. The `MODEL_PRICING` table maps model IDs to per-million-token rates. `costCents()` throws `LLMPermanentError` for unknown model IDs — forcing explicit handling when a new model is used rather than silently under-counting. The UI shows a real-time cost ticker.

---

## Key decisions

### Result<T,E> instead of thrown exceptions

All engine functions return `Result<T, E extends EngineError>`. Callers are forced to handle both the `ok` and `error` branches. This makes partial runs legible: the orchestrator collects results from all parallel branches without try/catch races, then decides what to skip vs fail based on which `ok: false` results arrived.

### DAG, not runtime routing

The planner emits a DAG once before any specialists run. Specialists don't decide what runs next. This makes the execution trace fully predictable from the plan — useful for the run tree-view (you know the full shape of the tree before any steps complete) and for replay (the DAG is deterministic given the brief, so replaying with fixtures produces the same execution graph).

### Tolerant planner parsing

The planner LLM can return malformed JSON (trailing commas, markdown fences). `tolerantParse()` tries `JSON.parse` first, then strips fences and retries. If neither works, it returns the `DEFAULT_DAG` with a warning rather than failing the run — the planner's job is to customize the DAG, not gate the entire run. If the LLM call itself errors, that's a `PlannerError` which fails the run and skips all dependents.

### Bounded tone-check retry (max 1)

The tone-checker runs after all writers succeed. If it rejects, the coordinator calls the outreach writer once more with the feedback. A second rejection sets `tone_failed: true` on the packet rather than retrying indefinitely. This is a hard-coded policy, not a configurable one — unbounded retry would require the orchestrator to hold state about re-runs across the DAG, which would significantly complicate the executor.

### Lamport counter for step ordering

Step events include a monotonic `_seq` counter in addition to a timestamp. If two specialists complete in the same millisecond (common in tests), the counter provides stable ordering for replay. The replay harness sorts by counter before processing events.

### SSE from Next.js App Router, not edge runtime

The SSE route uses `export const runtime = "nodejs"`. Vercel's edge runtime has a 25-second response timeout that fires before a full orchestrator run completes. The Node.js runtime allows long-running responses at the cost of slightly longer cold starts.

### Mocked third-party integrations

HubSpot, Resend, and the engagement webhook are typed mocks. The interfaces match the real APIs exactly — `pushCampaign` returns `{ hubspot_campaign_id: string; status: "created" }`, matching HubSpot's campaign endpoint shape. Swapping in a real client is a one-line import change. The mock exists because (a) the demo doesn't need real sends, and (b) real integrations would require secrets in CI.

---

## What was cut

### Prompt versioning and A/B routing

Each run would pin a prompt hash. The replay harness would hold the prompt version constant. This is the natural third primitive (join it with typed orchestration + cost accounting for the full production substrate). Cut because it requires an additional `prompt_versions` table and a routing layer in the LLM client. Mentioned in the LLM wrapper interface as a `prompt_version` field placeholder.

### Multi-tenancy

Single tenant, hardcoded brand context. Adding multi-tenancy is mechanical: `tenant_id` UUID on `runs`, `briefs`, `packets`; Postgres row-level security policies; brand context joins on tenant. The schema intentionally leaves room (no `DEFAULT 'acme'` literals in the data layer — brand context comes from the brief, not the schema).

### Real third-party integrations

HubSpot, Resend, and the engagement webhook use typed mocks. The mock interfaces mirror the real API shapes precisely so the swap is mechanical when needed.

### Streaming token output to UI

The SSE pipe streams *step* events, not token-level output. Streaming individual tokens from the writer to the UI would require a different SSE architecture (token events from the specialist, forwarded through the orchestrator emitter). Left out because it adds significant plumbing for modest UX gain in a demo context.

### Smart retry and circuit breaker

The orchestrator retries once on `LLMTransientError`. There's no circuit breaker. A circuit breaker needs state that lives across requests — either in a shared store or a long-lived worker process. The current architecture (Next.js route handler → in-process orchestrator run) has nowhere for per-model breaker state to live. The correct fix is moving to a queue-based worker, which is noted in the "Distributed orchestration" cut below.

### Distributed orchestration

The entire run executes in a single Node.js process using `Promise.all` for parallelism. Moving to a Redis-queue worker pool would allow runs to survive process restarts and scale specialists independently. The dispatch seam is the `SpecialistRegistry` interface — each specialist is a function `(input) => Promise<Result>`. A queue-based worker would replace the in-process function call with a task enqueue + result poll, but the interface above that seam would remain identical.

### OTel / Langfuse observability

No distributed tracing. The trace IS the `run_steps` table rendered as a tree in the UI. This is defensible for a demo because the whole point is showing how you'd build the trace primitive in-house rather than delegating it to an external tool. The structured JSON log from `log.ts` is the hook point for shipping events to an external collector.

---

## Data model

Five tables:

```
briefs         — the structured input brief
runs           — one per orchestration run; tracks status + total_cost_cents
run_steps      — one per specialist execution; tracks tokens, cost, output JSONB
llm_calls      — one per LLM API call; UNIQUE(step_id, request_hash) for replay
packets        — the assembled output; linked to runs 1:1
```

The `llm_calls` table is the replay source. `request_hash = sha256(prompt)`. On replay, `FixtureLLMClient` looks up by hash rather than calling the API. The `UNIQUE` constraint prevents duplicate recording if a specialist retries with the same prompt.

---

## Error taxonomy

```
EngineError (base)
  ├── PlannerError         — planner LLM failed or emitted invalid DAG
  ├── SpecialistError      — specialist returned error; wraps root cause
  ├── ToneCheckExhausted   — tone_checker rejected twice
  ├── ReplayMismatch       — fixture not found for prompt hash
  ├── LLMTransientError    — 408, 429, 5xx (retryable)
  └── LLMPermanentError    — 4xx, unknown model, bad input (not retryable)
```

Retry policy: one retry on `LLMTransientError`. All others fail immediately. The orchestrator inspects `error.cause instanceof LLMTransientError` to decide whether to retry a specialist step.
