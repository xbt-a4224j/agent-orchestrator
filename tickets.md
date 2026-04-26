# tickets

Ordered ticket list for `agent-orchestrator`. Create these as GitHub issues in order — later tickets reference earlier issue numbers as `Blocked by`.

## How to create these as GitHub issues

```bash
# from the repo root, after `gh repo create`:
#
# split this file on `### #N` boundaries
awk '/^### #[0-9]+/ {n=$2; sub("#","",n); file="/tmp/issue-"n".md"; next} {print > file}' tickets.md

# create them in order (so Blocked-by references resolve):
for n in $(seq 1 25); do
  title=$(awk -v n="#$n " '$0 ~ "^### "n {sub("^### #[0-9]+ ", ""); print; exit}' tickets.md)
  gh issue create --title "$title" --body-file "/tmp/issue-$n.md" --label "block-$(awk -v n="#$n " '$0 ~ "^### "n,/^---$/ {if (/^\*\*Block:/) {gsub(/[^0-9]/,""); print; exit}}' tickets.md)"
done
```

Or paste each `### #N` section into the GitHub UI manually — every section is one issue body.

## Summary

| # | Title | Block | Blocked by | Est. |
|---|---|---|---|---|
| 1 | chore: monorepo scaffold + .gitignore + LICENSE + README outline | 0 | — | 10m |
| 2 | ci: lint + typecheck + test workflow skeleton | 0 | #1 | 12m |
| 3 | chore: conventional commits + semantic-release + pre-commit | 0 | #2 | 15m |
| 4 | build: Turbo + workspace deps + .env.example | 0 | #3 | 12m |
| 5 | feat(engine): typed schemas — Brief, Step, Run, Packet | 1 | #4 | 12m |
| 6 | feat(engine): error taxonomy + Result helper | 1 | #5 | 10m |
| 7 | feat(engine): Anthropic LLM wrapper + cost accounting | 2 | #5, #6 | 30m |
| 8 | feat(engine): planner — emits typed DAG from a brief | 2 | #7 | 35m |
| 9 | feat(engine): orchestrator — DAG executor with parallel fan-out | 2 | #8 | 40m |
| 10 | feat(engine): tone-checker coordinator with bounded retry | 2 | #9 | 25m |
| 11 | feat(engine): fixture-based replay + property test | 2 | #9 | 35m |
| 12 | feat(engine): research specialists (account + contact) | 3 | #9 | 22m |
| 13 | feat(engine): writer specialists (outreach + linkedin + agenda) | 3 | #12 | 22m |
| 14 | feat(engine): packet assembler | 3 | #10, #13 | 18m |
| 15 | feat(db): Postgres schema + migrations + client | 4 | #5 | 22m |
| 16 | feat(integrations): mocked HubSpot push + Resend + engagement webhook | 4 | #15 | 22m |
| 17 | feat(api): POST /runs + GET /runs/:id + SSE stream | 4 | #14, #15 | 25m |
| 18 | feat(api): replay endpoint + push-to-hubspot endpoint | 4 | #16, #17, #11 | 18m |
| 19 | feat(web): brief form (idle view) | 5 | #17 | 22m |
| 20 | feat(web): live run view — tree + cost ticker + event log | 5 | #19 | 30m |
| 21 | feat(web): packet view + history rail | 5 | #20, #18 | 22m |
| 22 | test: 9-row scenario matrix verifier wired into CI | 6 | #18 | 25m |
| 23 | feat(observability): structured run logs + trace screenshots | 6 | #20 | 15m |
| 24 | docs: README + DESIGN + DEMO + 3 architecture SVGs | 7 | #22, #23 | 25m |
| 25 | chore: Vercel deploy config + scripts/dev.sh + scripts/demo_reset.sh | 7 | #24 | 18m |

Estimated total: **~480m (~8h)** with pacing realistic for a TypeScript-leaning generalist. Tighten to ~6h by collapsing #20–#21 into a single UI ticket and skipping #25's deploy config (run locally instead).

## Tickets

### #1 chore: monorepo scaffold + .gitignore + LICENSE + README outline

**Block:** 0
**Type:** chore
**Estimate:** 10m
**Blocked by:** none
**Labels:** block-0, infra

**Why.** The first commit on the repo. Establishes the Turbo monorepo skeleton (`apps/web`, `packages/engine`, `packages/db`), a `.gitignore` covering Node + Next.js + Turbo + IDE artifacts, an MIT `LICENSE`, and a README stub. Every future ticket modifies files inside this layout.

**What.**
- Files to create:
  - `apps/web/.gitkeep`
  - `packages/engine/.gitkeep`
  - `packages/db/.gitkeep`
  - `scripts/.gitkeep`
  - `docs/architecture/.gitkeep`
  - `tests/fixtures/llm/.gitkeep`
  - `.gitignore` (full Node + Next.js + Turbo coverage)
  - `LICENSE` (MIT)
  - `README.md` (project name + one-line tagline + "see CLAUDE.md")

**Acceptance criteria.**
- [ ] `git status` clean after `git add -A && git commit`
- [ ] `tree -L 2` shows the four top-level package dirs
- [ ] `.gitignore` ignores `node_modules`, `.turbo`, `.next`, `dist`, `.env`

**Out of scope.**
- Any actual code in `apps/web` or `packages/*` (lands in #4 onward)
- `package.json` / Turbo config (lands in #4)

---

### #2 ci: lint + typecheck + test workflow skeleton

**Block:** 0
**Type:** ci
**Estimate:** 12m
**Blocked by:** #1
**Labels:** block-0, ci

**Why.** CI green from the second commit. Senior signal: tests aren't an afterthought; the workflow exists before there's anything to test. Keeps every later commit honest.

**What.**
- Files to create: `.github/workflows/ci.yml`
- Jobs: a single `lint-and-test` job on `ubuntu-latest`
  - Checks out
  - Installs Node 20 with npm cache
  - `npm ci`
  - `npm run lint` (no-op on this commit, will be wired in #4)
  - `npm run typecheck`
  - `npm test -- --run`
- Triggers: `push` to `main`, `pull_request`
- Use `actions/setup-node@v4` with `cache: npm`

**Acceptance criteria.**
- [ ] Workflow file passes `actionlint` (or just visually clean)
- [ ] Pushing this commit triggers a green build on GitHub
- [ ] `lint-and-test` job is named exactly that (referenced in branch protection later)

**Out of scope.**
- Actual lint / typecheck / test scripts (added in #4 with deps)
- Postgres service (added in #15 when DB is wired)
- Matrix verifier step (added in #22)

---

### #3 chore: conventional commits + semantic-release + pre-commit

**Block:** 0
**Type:** chore
**Estimate:** 15m
**Blocked by:** #2
**Labels:** block-0, infra

**Why.** Every commit from here on is conventional-commit-formatted. Semantic-release auto-cuts versions on push to main. Pre-commit catches trailing whitespace and bad YAML before they hit CI.

**What.**
- Files to create:
  - `.commitlintrc.json` — extends `@commitlint/config-conventional`
  - `.pre-commit-config.yaml` — `pre-commit-hooks` for trailing whitespace + EOL + yaml + large files
  - `.releaserc.json` — semantic-release with `commit-analyzer`, `release-notes-generator`, `changelog`, `exec` (bumps `package.json` version), `git`, `github`
  - `.github/workflows/release.yml` — runs semantic-release on push to `main` with `contents: write` permissions
  - `.github/workflows/commitlint.yml` — runs commitlint on PR titles

**Acceptance criteria.**
- [ ] All four files validate locally (`pre-commit run --all-files` works after `pre-commit install`)
- [ ] Release workflow file passes `actionlint`
- [ ] commitlint workflow runs on PR (visible in Actions tab)
- [ ] First push triggers semantic-release; produces version `1.0.0` (or next patch)

**Out of scope.**
- Husky for client-side commit-msg hook (skip; commitlint workflow on PR is enough)
- Actual `CHANGELOG.md` content (semantic-release writes it)

**Notes.** semantic-release needs the `GITHUB_TOKEN` to have `contents: write` AND `issues: write` AND `pull-requests: write`. The release workflow yaml must declare these explicitly.

---

### #4 build: Turbo + workspace deps + .env.example

**Block:** 0
**Type:** build
**Estimate:** 12m
**Blocked by:** #3
**Labels:** block-0, infra

**Why.** The actual scaffolding for the monorepo: root `package.json` with workspaces, `turbo.json` with task pipeline, TS configs, and a documented `.env.example`. After this ticket the empty monorepo lints, typechecks, and tests cleanly (no-op tests).

**What.**
- Files to create:
  - `package.json` at root with `workspaces: ["apps/*", "packages/*"]`, scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate` (each runs `turbo run <name>`)
  - `turbo.json` with task definitions (`build`, `lint`, `typecheck`, `test`, `dev`)
  - `tsconfig.base.json` (strict mode, target ES2022, moduleResolution `bundler`)
  - `apps/web/package.json` — Next.js 15 + React 18 + Tailwind 3 + Vercel AI SDK + `@anthropic-ai/sdk` + `zod`
  - `packages/engine/package.json` — depends on `zod`, `@anthropic-ai/sdk`
  - `packages/db/package.json` — depends on `postgres`
  - Each package has a `tsconfig.json` extending base
  - `.env.example` with: `ANTHROPIC_API_KEY=`, `DATABASE_URL=postgresql://localhost:5432/agent_orchestrator`, `LLM_MODEL=claude-3-5-sonnet-20241022`
  - Root `.eslintrc.json` (extends `next/core-web-vitals`, no-warnings)
- Modify: `.github/workflows/ci.yml` → `npm ci` step now actually installs

**Acceptance criteria.**
- [ ] `npm ci && npm run typecheck && npm run lint && npm test -- --run` all green locally
- [ ] CI green on push
- [ ] `npm run dev` boots Next.js on `:3000` (renders the default Next.js page; no custom code yet)
- [ ] `turbo run build` succeeds across all 3 packages

**Out of scope.**
- Tailwind config refinement (default works; tweaks in #19)
- Custom Next.js layout / page (#19)
- Postgres connection (#15)

---

### #5 feat(engine): typed schemas — Brief, Step, Run, Packet

**Block:** 1
**Type:** feat
**Scope:** engine
**Estimate:** 12m
**Blocked by:** #4
**Labels:** block-1, engine

**Why.** Types/schemas before implementations. Establishes the canonical data shapes the entire engine and API consume. One Zod source of truth → derived TS types via `z.infer`.

**What.**
- Files to create: `packages/engine/src/schemas.ts`, `packages/engine/tests/schemas.test.ts`
- Schemas:
  - `BriefSchema`: `target_account: { name, domain? }`, `persona: { role, seniority? }`, `offer: { product, value_prop }`, `sender: { name, company, role }`, `goal?`, `constraints?`
  - `StepStatusSchema`: `'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'`
  - `StepSchema`: `id`, `run_id`, `parent_step_id?`, `agent`, `status`, `input?`, `output?`, `error?`, `tokens_in`, `tokens_out`, `cost_cents`, `started_at?`, `completed_at?`
  - `RunSchema`: `id`, `brief_id`, `status`, `started_at`, `completed_at?`, `total_cost_cents`
  - `PacketSchema`: `run_id`, `email`, `linkedin_note`, `discovery_agenda`, `send_sequence`, `account_research`, `contact_research`, `tone_failed?`
  - Inferred types: `Brief`, `StepStatus`, `Step`, `Run`, `Packet`
- Tests: parse a sample of each, assert `safeParse` round-trips; assert one bad sample fails with the expected ZodError path

**Acceptance criteria.**
- [ ] 8 vitest tests green
- [ ] `npm run typecheck` green
- [ ] All types exported from `packages/engine/src/index.ts`

**Out of scope.**
- Database row types (those map onto these in #15)
- LLM-specific types (those go in #7)

---

### #6 feat(engine): error taxonomy + Result helper

**Block:** 1
**Type:** feat
**Scope:** engine
**Estimate:** 10m
**Blocked by:** #5
**Labels:** block-1, engine

**Why.** Typed errors, not strings. Every failure mode in the engine maps to one of these classes; the API serializes them with stable `code` strings; the UI renders badges. No `throw new Error("something broke")` anywhere downstream.

**What.**
- Files to create: `packages/engine/src/errors.ts`, `packages/engine/tests/errors.test.ts`
- Classes (each extends a base `EngineError` with `.code` and `.cause`):
  - `PlannerError` — code `planner_invalid_dag`
  - `SpecialistError` — code `specialist_failed`, `.agent: string`, `.attempt: number`
  - `ToneCheckExhausted` — code `tone_exhausted`, `.attempts: number`
  - `ReplayMismatch` — code `replay_mismatch`, `.expected`, `.actual`
  - `LLMTransientError` — code `llm_5xx`, retryable
  - `LLMPermanentError` — code `llm_4xx`, not retryable
- A `Result<T, E>` discriminated union: `{ ok: true; value: T } | { ok: false; error: E }` with `ok()` and `err()` constructors
- Tests: instanceof checks; `.code` matches expected string per class; `Result.ok` and `Result.err` narrowable

**Acceptance criteria.**
- [ ] 6 vitest tests green
- [ ] All errors exported from `packages/engine/src/index.ts`

**Out of scope.**
- Mapping errors to HTTP status codes (in #17)
- Error rendering in UI (in #20)

---

### #7 feat(engine): Anthropic LLM wrapper + cost accounting

**Block:** 2
**Type:** feat
**Scope:** engine
**Estimate:** 30m
**Blocked by:** #5, #6
**Labels:** block-2, engine

**Why.** Every LLM call goes through one wrapper. The wrapper records request + response, computes per-call cost, classifies HTTP errors as `LLMTransientError` or `LLMPermanentError`, and returns a `Result`. This is the single point where cost math lives — unit-testable in isolation.

**What.**
- Files to create: `packages/engine/src/llm.ts`, `packages/engine/src/cost.ts`, `packages/engine/tests/cost.test.ts`, `packages/engine/tests/llm.test.ts`
- `cost.ts`:
  - `MODEL_PRICING: Record<string, { in_per_mtok_cents: number; out_per_mtok_cents: number }>` — Claude Sonnet, Haiku, Opus
  - `function costCents(model: string, tokens_in: number, tokens_out: number): number` — returns rounded cents
  - Throws `LLMPermanentError` if model not in table, if tokens negative
- `llm.ts`:
  - `class LLMClient { constructor(opts: { apiKey, model }); async call(prompt, opts?) → Result<{ output, tokens_in, tokens_out, cost_cents, raw_response }, LLMTransientError | LLMPermanentError> }`
  - 5xx, 408, 429 → `LLMTransientError`
  - 4xx (except above) → `LLMPermanentError`
  - Uses `@anthropic-ai/sdk`
- Tests:
  - 6 cost tests (happy path, zero tokens, unknown model throws, negative tokens throw, large numbers, rounding edge)
  - 4 llm tests with `vi.mock('@anthropic-ai/sdk')` — happy, 5xx, 4xx, network error

**Acceptance criteria.**
- [ ] 10 vitest tests green
- [ ] No real API calls in tests (all mocked)
- [ ] `LLMClient` exported from `packages/engine/src/index.ts`

**Out of scope.**
- Streaming output (cut)
- Tool-calling support (each specialist constructs its own JSON-mode prompt; no formal tool registry in this demo)

**Notes.** Pricing table can lag the official Anthropic table by a few months — that's fine for a demo. Add a comment with the source date.

---

### #8 feat(engine): planner — emits typed DAG from a brief

**Block:** 2
**Type:** feat
**Scope:** engine
**Estimate:** 35m
**Blocked by:** #7
**Labels:** block-2, engine

**Why.** The planner is what makes this multi-agent rather than a sequential pipeline. Reads a `Brief`, calls the LLM with a strict JSON-mode prompt, parses + validates the response into a `DagSchema`, falls back to a default DAG on parse failure (with logged warning).

**What.**
- Files to create: `packages/engine/src/planner.ts`, `packages/engine/src/planner.prompt.ts`, `packages/engine/tests/planner.test.ts`, `packages/engine/src/dag.ts`
- `dag.ts`:
  - `DagNodeSchema`: `{ id, agent, depends_on: string[] }`
  - `DagSchema`: `{ nodes: DagNodeSchema[] }` with validation: every `depends_on` references an existing `id`, no cycles
  - `DEFAULT_DAG: Dag` — the fallback (planner → research_account, research_contact in parallel → outreach_writer, linkedin_writer, agenda_writer in parallel → tone_checker fans-in)
- `planner.ts`:
  - `async function plan(brief: Brief, llm: LLMClient): Promise<Result<Dag, PlannerError>>`
  - Constructs a strict-JSON prompt asking the LLM to emit a DAG
  - Tolerant JSON parser: `JSON.parse` first, fallback to strip-fences-then-parse
  - On parse failure or schema validation failure, returns `Result.ok(DEFAULT_DAG)` with a logged warning (NOT an error — this is a graceful degrade)
  - On LLM error, returns `Result.err(PlannerError)`
- Tests (use mocked LLMClient):
  - happy: LLM returns valid DAG → returned as-is
  - malformed JSON → falls back to DEFAULT_DAG
  - schema-invalid (cycle) → falls back to DEFAULT_DAG
  - LLM 4xx → returns PlannerError
  - DEFAULT_DAG passes its own validation

**Acceptance criteria.**
- [ ] 8 vitest tests green
- [ ] `npm run typecheck` green
- [ ] DEFAULT_DAG visualized in a comment in `dag.ts` (ascii art is fine)

**Out of scope.**
- Per-tenant DAG customization (cut)
- DAG editing UI (cut)

---

### #9 feat(engine): orchestrator — DAG executor with parallel fan-out

**Block:** 2
**Type:** feat
**Scope:** engine
**Estimate:** 40m
**Blocked by:** #8
**Labels:** block-2, engine

**Why.** The core primitive. Takes a Dag + a registry of specialist functions + a Brief, executes nodes in dependency order, fans out parallel siblings via `Promise.all`, aggregates Step records as it goes. Emits step events to a passed-in `EventEmitter` so the API layer can stream them.

**What.**
- Files to create: `packages/engine/src/orchestrator.ts`, `packages/engine/src/events.ts`, `packages/engine/tests/orchestrator.test.ts`
- `events.ts`:
  - `type StepEvent = { type: 'step.started' | 'step.succeeded' | 'step.failed', step: Step }`
  - `type RunEvent = { type: 'run.started' | 'run.completed' | 'run.failed', run: Run }`
  - Type `OrchestratorEvents = StepEvent | RunEvent`
  - A simple typed `EventEmitter` wrapper
- `orchestrator.ts`:
  - `type Specialist = (input: { brief: Brief; deps: Record<string, unknown> }) => Promise<Result<unknown, SpecialistError>>`
  - `type SpecialistRegistry = Record<string, Specialist>`
  - `async function run(brief: Brief, dag: Dag, registry: SpecialistRegistry, emitter: EventEmitter<OrchestratorEvents>): Promise<{ run: Run; steps: Step[]; outputs: Record<string, unknown> }>`
  - Walks DAG in topo order; dispatches independent nodes via `Promise.all`; passes completed-dep outputs to dependents in `deps` map
  - On specialist failure: marks step failed, propagates failure to dependents (skips them with status `skipped`)
  - One retry on `LLMTransientError` from the specialist
- Tests (with stub specialist registry):
  - happy 3-node DAG
  - parallel siblings actually run in parallel (assert wall-clock < sequential)
  - failed specialist marks dependents skipped
  - one retry on LLMTransientError → succeeds
  - emitter fires all events in order

**Acceptance criteria.**
- [ ] 12 vitest tests green
- [ ] No `LLMClient` dependency in the orchestrator itself — specialists use their own LLMClient instance

**Out of scope.**
- Distributed execution (cut)
- Per-step custom retry policies (one retry, that's it)
- Cost aggregation (lives in #14 packet assembler)

**Notes.** This is the ticket where TS gets non-trivial. Use `keyof T` on the registry type to make `dispatch(node.agent)` typecheck. Honestly fine to use `as Specialist` in one place if the generics get hairy.

---

### #10 feat(engine): tone-checker coordinator with bounded retry

**Block:** 2
**Type:** feat
**Scope:** engine
**Estimate:** 25m
**Blocked by:** #9
**Labels:** block-2, engine

**Why.** The tone-checker is the only coordinator step that can request a retry. It reads writer outputs, scores them against a brand voice rubric (mocked one-pager loaded from `fixtures/brand_voice.md`), and either approves or returns `{ rejected: true, feedback }`. On reject, the orchestrator reruns the writers ONCE with the feedback added to their prompt. After two reject rounds, set `tone_failed: true` on the packet and continue.

**What.**
- Files to create: `packages/engine/src/specialists/tone_checker.ts`, `packages/engine/tests/tone_checker.test.ts`, `packages/engine/src/coordinator.ts`, `tests/fixtures/brand_voice.md`
- `tone_checker.ts`:
  - `async function toneCheck(input: { writer_outputs: Record<string, string>; brand_voice: string }, llm: LLMClient): Promise<Result<{ approved: boolean; feedback?: string }, SpecialistError>>`
- `coordinator.ts`:
  - Wraps the orchestrator run loop with the bounded-retry behavior
  - `async function runWithToneCheck(brief, dag, registry, emitter, maxRetries: 1): Promise<{ run, steps, outputs, tone_failed }>`
- Tests:
  - approved on first pass
  - rejected once, retried, approved
  - rejected twice → `tone_failed: true`, no infinite loop
  - tone-checker LLM error propagates correctly

**Acceptance criteria.**
- [ ] 6 vitest tests green
- [ ] `tone_failed` is a boolean flag on the packet, not an exception

**Out of scope.**
- Brand voice editing UI (single hardcoded file)
- Per-writer feedback granularity (one feedback string covers all writers in a retry round)

---

### #11 feat(engine): fixture-based replay + property test

**Block:** 2
**Type:** feat
**Scope:** engine
**Estimate:** 35m
**Blocked by:** #9
**Labels:** block-2, engine

**Why.** The replay invariant is the most defensible senior signal in the project. Definition: given a recorded sequence of LLM responses for a run, replaying the orchestrator with those fixtures produces a byte-identical packet, identical step records (modulo timestamps), identical cost. Enforced as a fast-check property test. Doubles as a free dev-cost optimization — once you have fixtures, dev runs are zero-cost.

**What.**
- Files to create: `packages/engine/src/replay.ts`, `packages/engine/tests/replay.property.test.ts`
- `replay.ts`:
  - `class FixtureLLMClient implements LLMClient { call(prompt, opts) → returns recorded response keyed by sha256(prompt) }`
  - `function recordRun(run, steps): RecordedRun` — pulls all `llm_calls` for the run, indexes by request hash
  - `async function replayRun(brief: Brief, recorded: RecordedRun, dag: Dag, registry: SpecialistRegistry): Promise<{ run, steps, outputs }>`
- Property test:
  - `fc.assert(fc.asyncProperty(briefArbitrary, async (brief) => { ... }))` with maxRuns: 25
  - Steps: live run (with mocked LLMClient producing varied responses) → record fixtures → replay → assert deep-equal of packet output, identical step IDs, identical cost
- Add a `*.property.test.ts` glob so vitest picks it up

**Acceptance criteria.**
- [ ] 1 fast-check property test green at 25 runs
- [ ] 4 unit tests for `recordRun` / `FixtureLLMClient` happy path + edge cases (missing fixture, fixture corruption)
- [ ] `npm test` includes the property test by default
- [ ] Property test runs in <30 seconds

**Out of scope.**
- Replay across schema versions (fixtures break if you change schemas — that's the whole point, the test catches it)
- UI replay button (in #21)

**Notes.** sha256 of the prompt is a content-addressed key. If two specialists ever construct the same prompt, they share a fixture — that's fine, it's idempotent. Use Node's built-in `crypto.createHash('sha256')`.

---

### #12 feat(engine): research specialists (account + contact)

**Block:** 3
**Type:** feat
**Scope:** engine
**Estimate:** 22m
**Blocked by:** #9
**Labels:** block-3, engine

**Why.** Two specialists that produce structured research blocks. Each calls a mocked enrichment function (no real Clearbit/Apollo) AND an LLM call to summarize. The split (mock + LLM) shows you understand that not all "agent" steps are pure LLM calls — some are tool calls that hand off to LLMs.

**What.**
- Files to create:
  - `packages/engine/src/specialists/account_research.ts`
  - `packages/engine/src/specialists/contact_research.ts`
  - `packages/engine/src/integrations/enrichment.mock.ts`
  - `packages/engine/tests/specialists.research.test.ts`
- `enrichment.mock.ts`:
  - `async function enrichAccount(domain: string): Promise<MockAccount>` — returns canned data keyed by domain (fixtures for `notion.so`, `linear.app`, `figma.com`; default fallback)
  - `async function enrichContact(domain: string, role: string): Promise<MockContact>`
- Each specialist:
  - Calls enrichment first
  - Calls LLM with the enrichment data + brief to produce a structured summary
  - Returns `Result<AccountResearch | ContactResearch, SpecialistError>`
- Tests: happy path each, enrichment-empty fallback, LLM 4xx propagates

**Acceptance criteria.**
- [ ] 6 vitest tests green
- [ ] Mock enrichment data for at least 3 real B2B SaaS domains in fixtures (Notion, Linear, Figma — these get used in the demo brief)

**Out of scope.**
- Real enrichment integration (the mock interface mirrors Clearbit's `/v2/companies/find` shape)

---

### #13 feat(engine): writer specialists (outreach + linkedin + agenda)

**Block:** 3
**Type:** feat
**Scope:** engine
**Estimate:** 22m
**Blocked by:** #12
**Labels:** block-3, engine

**Why.** Three writer specialists run in parallel after research completes. Each takes the brief + both research blocks as input, produces a typed output via LLM call. Same shape, different prompts.

**What.**
- Files to create:
  - `packages/engine/src/specialists/outreach_writer.ts`
  - `packages/engine/src/specialists/linkedin_writer.ts`
  - `packages/engine/src/specialists/agenda_writer.ts`
  - `packages/engine/tests/specialists.writers.test.ts`
- Each writer returns a structured object:
  - `outreach_writer` → `{ subject, preview, body }`
  - `linkedin_writer` → `{ text, char_count }`
  - `agenda_writer` → `{ title, duration_minutes, talking_points: string[] }`
- Each writer accepts an optional `feedback?: string` from the tone-checker's previous reject
- Tests: happy path each, feedback prompt includes the feedback string, LLM transient → handled by orchestrator (specialists themselves don't retry)

**Acceptance criteria.**
- [ ] 9 vitest tests green
- [ ] Output schemas validate via Zod

**Out of scope.**
- Image / asset generation for LinkedIn (cut)
- Multi-language outputs (English only)

---

### #14 feat(engine): packet assembler

**Block:** 3
**Type:** feat
**Scope:** engine
**Estimate:** 18m
**Blocked by:** #10, #13
**Labels:** block-3, engine

**Why.** Final step in the orchestration. Takes all specialist outputs + the run record, computes total cost (sum of all `llm_calls`), assembles a `send_sequence` based on `goal` and persona timezone (heuristic — this one is deterministic, not LLM), packages everything into a `Packet`.

**What.**
- Files to create: `packages/engine/src/packet.ts`, `packages/engine/tests/packet.test.ts`
- `function assemblePacket(outputs: SpecialistOutputs, run: Run, brief: Brief): Packet`
  - Pulls `account_research`, `contact_research`, `outreach_email`, `linkedin_note`, `discovery_agenda` from outputs
  - Computes `send_sequence` from `goal` and persona role (rules-based: VP+ → Tue 9am their TZ; manager → Wed 11am; etc. Simple.)
  - Includes `metadata` with run_id, total_cost_cents, tokens_in/out, duration_ms, specialist list
- Tests: assembly with all outputs present, missing output throws, send_sequence varies by goal, metadata math correct

**Acceptance criteria.**
- [ ] 5 vitest tests green
- [ ] `Packet` validates via `PacketSchema`

**Out of scope.**
- A/B subject lines (the writer returns a single subject for now)
- Send-time optimization via engagement history (cut)

---

### #15 feat(db): Postgres schema + migrations + client

**Block:** 4
**Type:** feat
**Scope:** db
**Estimate:** 22m
**Blocked by:** #5
**Labels:** block-4, db

**Why.** Five tables, raw SQL migrations, thin client wrapper. No ORM. `runs`, `run_steps`, `llm_calls`, `briefs`, `packets`. testcontainers spins up real Postgres in CI — no mocked DB.

**What.**
- Files to create:
  - `packages/db/migrations/0001_init.sql` — `briefs`, `runs`, `run_steps`, `llm_calls`
  - `packages/db/migrations/0002_packets.sql` — `packets`, plus index `idx_run_steps_run_id`
  - `packages/db/src/client.ts` — `postgres`-driver-backed client wrapper with typed query helpers (`getRun(id)`, `insertRun(...)`, `appendStep(...)`, `appendLLMCall(...)`, `getPacket(...)`)
  - `packages/db/src/migrate.ts` — runs migrations in order; idempotent (tracks applied via a `_migrations` table)
  - `packages/db/tests/migrate.test.ts` and `packages/db/tests/client.test.ts` — using testcontainers
- Schemas:
  - `runs(id uuid pk, brief_id uuid, status text, started_at timestamptz, completed_at timestamptz, total_cost_cents int)`
  - `run_steps(id uuid pk, run_id uuid fk, parent_step_id uuid, agent text, status text, input jsonb, output jsonb, error jsonb, tokens_in int, tokens_out int, cost_cents int, started_at timestamptz, completed_at timestamptz)`
  - `llm_calls(id uuid pk, step_id uuid fk, request_hash text, request jsonb, response jsonb, tokens_in int, tokens_out int, cost_cents int, recorded_at timestamptz)` + `unique(step_id, request_hash)`
  - `briefs(id uuid pk, payload jsonb, created_at timestamptz)`
  - `packets(run_id uuid pk, content jsonb, hubspot_campaign_id text null, created_at timestamptz)`
- Modify: `.github/workflows/ci.yml` → add `postgres:16-alpine` service, env `DATABASE_URL`
- Modify: root `package.json` → add `db:migrate` script

**Acceptance criteria.**
- [ ] Migrations apply cleanly against a fresh Postgres
- [ ] 6 client tests green via testcontainers
- [ ] CI green with the Postgres service

**Out of scope.**
- Indexes beyond `run_steps(run_id)` (add later if needed)
- Database-level constraints beyond FK (no CHECK constraints on enum-shaped strings; that's TS's job)

---

### #16 feat(integrations): mocked HubSpot push + Resend + engagement webhook

**Block:** 4
**Type:** feat
**Scope:** integrations
**Estimate:** 22m
**Blocked by:** #15
**Labels:** block-4, integrations

**Why.** Three mocked integrations, each with an interface that mirrors the real API's request shape. The shape choice means swapping a mock for the real client is a small mechanical change — no calling-code changes downstream. The mocks log to Postgres so the audit trail is real.

**What.**
- Files to create:
  - `packages/engine/src/integrations/hubspot.mock.ts` — `pushCampaign(packet) → Promise<{ hubspot_campaign_id }>` matching shape of HubSpot CRM v3 `POST /crm/v3/objects/marketing_emails`
  - `packages/engine/src/integrations/resend.mock.ts` — `sendBatch(emails) → Promise<{ message_id, status }>` matching Resend's `/emails/batch`
  - `packages/engine/src/integrations/engagement.mock.ts` — pure function that takes a webhook payload and emits a typed `EngagementEvent`
  - `packages/engine/tests/integrations.test.ts`
- Each mock:
  - Records the call to a `mocked_calls` table (or a JSONL log file at `/tmp/mocked_calls.jsonl`) for audit
  - Returns realistic-looking IDs (`hs_camp_<8 hex chars>`, `rsd_<uuid>`)
  - Has a `__seed(behavior)` helper for tests to make them fail deterministically
- Tests: happy push, happy send, engagement parse round-trip, seeded-failure path

**Acceptance criteria.**
- [ ] 6 vitest tests green
- [ ] Each mock has a doc comment quoting the real API path (e.g. `// Mirrors POST /crm/v3/objects/marketing_emails`)

**Out of scope.**
- Real HubSpot/Resend SDKs (deps not added)
- LinkedIn API mock (cut from final triangle — would be a 4th mock; comment in the agenda_writer notes that LinkedIn posting is out of scope for the demo)

---

### #17 feat(api): POST /runs + GET /runs/:id + SSE stream

**Block:** 4
**Type:** feat
**Scope:** api
**Estimate:** 25m
**Blocked by:** #14, #15
**Labels:** block-4, api

**Why.** The HTTP surface that the web app consumes. Three Next.js Route Handlers. POST creates a run, kicks off the orchestrator in a background promise, returns immediately with `run_id`. GET returns the current run + steps. SSE streams step events.

**What.**
- Files to create:
  - `apps/web/app/api/runs/route.ts` — POST: validate brief with Zod, persist, kick off `runWithToneCheck` in `void backgroundExecute(...)`, return `{ run_id }`
  - `apps/web/app/api/runs/[id]/route.ts` — GET: returns `{ run, steps, packet? }`
  - `apps/web/app/api/runs/[id]/stream/route.ts` — SSE: subscribes to a Run-scoped event emitter, streams `data: {...}\n\n` per event; closes on `run.completed` or `run.failed`
  - `apps/web/app/api/_lib/runRegistry.ts` — singleton `Map<run_id, EventEmitter>` for in-process event bus
  - `apps/web/app/api/_lib/errorMap.ts` — maps EngineError subclasses to HTTP status codes
- Use `runtime: "nodejs"` on stream route (NOT edge — edge runtime times out)
- Tests: route handler unit tests (mocked engine) for each endpoint

**Acceptance criteria.**
- [ ] 5 route-handler tests green (vitest with `next-test-utils` or by importing the handler directly)
- [ ] SSE stream sends events with `Content-Type: text/event-stream`
- [ ] Brief validation rejects malformed inputs with 400 + ZodError details

**Out of scope.**
- Authentication — single-user demo, no auth layer
- Per-run rate limiting (cut)

**Notes.** Background promises in Next.js Route Handlers: don't `await` them in the response. Use `void backgroundExecute(...)` and let the SSE stream surface errors.

---

### #18 feat(api): replay endpoint + push-to-hubspot endpoint

**Block:** 4
**Type:** feat
**Scope:** api
**Estimate:** 18m
**Blocked by:** #16, #17, #11
**Labels:** block-4, api

**Why.** Two more endpoints that complete the API surface. `POST /api/runs/:id/replay` reads the run's `llm_calls`, constructs a `FixtureLLMClient`, replays the orchestrator against fixtures (no real LLM cost), returns the replayed run. `POST /api/runs/:id/push-to-hubspot` calls the mocked integration and updates `packets.hubspot_campaign_id`.

**What.**
- Files to create:
  - `apps/web/app/api/runs/[id]/replay/route.ts`
  - `apps/web/app/api/runs/[id]/push-to-hubspot/route.ts`
  - `apps/web/app/api/webhooks/engagement/route.ts` — POST receiver that updates a (mocked, in-memory or in `contacts` table) engagement_score
- Replay endpoint: returns `{ original_run, replayed_run, equal: boolean }` — equal true if packets are deep-equal (this is the visible replay invariant)
- Tests: happy replay returns `equal: true`, push returns `hs_camp_<id>`, webhook updates increment counter

**Acceptance criteria.**
- [ ] 4 route-handler tests green
- [ ] Replay endpoint integration-tested against a live engine run end-to-end

**Out of scope.**
- Webhook authentication via HMAC (real HubSpot/Resend would; mock skips)

---

### #19 feat(web): brief form (idle view)

**Block:** 5
**Type:** feat
**Scope:** web
**Estimate:** 22m
**Blocked by:** #17
**Labels:** block-5, web, ui

**Why.** The first thing a viewer sees. A clean, single-page form with the 10 brief fields, sectioned (Target / Offer / Sender / Options), pre-filled with a sample (Notion / VP Marketing). Submitting POSTs to `/api/runs`, transitions the page state to `running`.

**What.**
- Files to create:
  - `apps/web/app/page.tsx` — top-level state machine (`idle | running | complete`)
  - `apps/web/app/components/BriefForm.tsx`
  - `apps/web/app/components/SampleBriefs.ts` — Notion, Linear, Figma examples
- Use Tailwind + plain HTML inputs (no UI library)
- Form submits via `fetch('/api/runs', { method: 'POST', body: JSON.stringify(brief) })`, then sets state to `running` with the new `run_id`
- "Try a sample brief" dropdown pre-fills from `SampleBriefs`

**Acceptance criteria.**
- [ ] Form renders with all 10 fields, properly grouped, pre-filled with Notion sample
- [ ] Submit transitions page state to `running`
- [ ] Form is keyboard-navigable (tab order correct, Enter submits)
- [ ] Mobile-responsive (single column on <640px)

**Out of scope.**
- Brief saving / draft management (cut)
- Field-level validation feedback (rely on backend Zod errors for now)

---

### #20 feat(web): live run view — tree + cost ticker + event log

**Block:** 5
**Type:** feat
**Scope:** web
**Estimate:** 30m
**Blocked by:** #19
**Labels:** block-5, web, ui

**Why.** The captivating part of the demo. Tree view that builds out as steps complete, cost ticker that increments smoothly (rAF-driven number tween), event log that scrolls. SSE-fed.

**What.**
- Files to create:
  - `apps/web/app/components/RunTree.tsx` — recursive component rendering steps as a tree, each node colored by status
  - `apps/web/app/components/CostTicker.tsx` — useEffect-driven number tween toward target value
  - `apps/web/app/components/EventLog.tsx` — auto-scrolling log (newest at bottom)
  - `apps/web/app/hooks/useRunStream.ts` — `useEffect` opens `EventSource` on `run_id`, dispatches events to a reducer
- Layout:
  - Top: small summary card with brief excerpt
  - Center: the tree
  - Right: cost ticker (top) + event log (below)
  - On `run.completed` → page state transitions to `complete`
- Animations:
  - Node status flip uses Tailwind transitions (`transition-colors duration-300`)
  - Cost ticker tweens over 200ms

**Acceptance criteria.**
- [ ] Tree renders 6+ steps in dependency order
- [ ] SSE events flip node status live (manually testable)
- [ ] Cost ticker animates toward final value (no jumps)
- [ ] Event log auto-scrolls to newest entry
- [ ] 3 component tests with React Testing Library (tree renders, ticker tweens, event log auto-scrolls)

**Out of scope.**
- Per-node click-to-inspect drawer (defer to packet view)
- Animated arrow-drawing between tree nodes (skip; CSS-only is enough)

**Notes.** SSE in the browser uses `EventSource` — no library needed. Watch for the polyfill issue with Next.js dev mode (HMR can leak EventSource connections). Ensure useEffect cleanup closes the source.

---

### #21 feat(web): packet view + history rail

**Block:** 5
**Type:** feat
**Scope:** web
**Estimate:** 22m
**Blocked by:** #20, #18
**Labels:** block-5, web, ui

**Why.** The final view. Tree shrinks to a side rail; center renders the Packet as a card with tabs (`Email` | `LinkedIn` | `Agenda` | `Send sequence` | `Research`). Each tab renders the artifact in a pretty form (email looks like an email, etc.). Top-right: Replay button + Push-to-HubSpot button. Left rail: history of past runs (clickable for replay).

**What.**
- Files to create:
  - `apps/web/app/components/PacketView.tsx` — tabbed card
  - `apps/web/app/components/EmailArtifact.tsx`, `LinkedinArtifact.tsx`, `AgendaArtifact.tsx`, `SendSequenceArtifact.tsx`, `ResearchArtifact.tsx`
  - `apps/web/app/components/HistoryRail.tsx` — fetches `GET /api/runs?limit=10` (add this to #17's GET endpoint), shows compact list
  - `apps/web/app/components/ActionsBar.tsx` — Replay and Push-to-HubSpot buttons; toast on success
- Modify: `apps/web/app/api/runs/route.ts` to also support GET (list)
- Replay UX: clicking Replay on a past run resets state to `running` with the replay endpoint result animating through

**Acceptance criteria.**
- [ ] All 5 artifact tabs render correctly
- [ ] Replay button triggers the replay endpoint and re-animates the tree (visible)
- [ ] Push-to-HubSpot fires the mocked integration and shows a toast `→ hs_camp_<id>`
- [ ] History rail lists at least the current + 1 prior run
- [ ] 4 component tests with RTL

**Out of scope.**
- Persistent tab selection (resets to first tab on each open)
- Artifact-level editing (read-only)

---

### #22 test: 9-row scenario matrix verifier wired into CI

**Block:** 6
**Type:** test
**Scope:** verification
**Estimate:** 25m
**Blocked by:** #18
**Labels:** block-6, ci, verification

**Why.** End-to-end integration test that runs every row of the scenario matrix in `CLAUDE.md` against live engine + mocked LLMs + real Postgres. Failure fails CI.

**What.**
- Files to create: `scripts/verify_matrix.ts`
- Each scenario seeds the mocked LLMClient with the specific behavior (success, 5xx, malformed JSON, etc.)
- Runs the orchestrator end-to-end (real DB via testcontainers in CI, local Postgres in dev)
- Asserts expected outcome per row
- Pretty-prints `9/9 scenarios passed` or fails on first mismatch with diff
- Modify: `.github/workflows/ci.yml` → add a final step `npx tsx scripts/verify_matrix.ts`

**Acceptance criteria.**
- [ ] 9 scenarios pass locally
- [ ] CI green with matrix step included
- [ ] Each scenario's expected outcome is asserted with a precise predicate (not just "no throw")

**Out of scope.**
- Adversarial scenarios beyond the 9 (cut; can be added later)
- Concurrency tests (run 2 orchestrators at once — cut)

---

### #23 feat(observability): structured run logs + trace screenshots

**Block:** 6
**Type:** feat
**Scope:** observability
**Estimate:** 15m
**Blocked by:** #20
**Labels:** block-6, observability

**Why.** The trace view IS the observability story for the demo. This ticket commits a screenshot of a real run and adds structured logging (one-line JSON per step event) for any future migration to OTel.

**What.**
- Files to create:
  - `packages/engine/src/log.ts` — tiny `log({ level, event, ... })` that writes JSON one-liners to stdout
  - Wire into orchestrator step events
  - `docs/screenshots/run-tree.png` — manually captured screenshot of a real run committed to repo
  - `docs/screenshots/packet-view.png` — same
- Modify: README to embed the screenshots

**Acceptance criteria.**
- [ ] Two screenshots committed
- [ ] All step events log to stdout in JSON format with `event`, `run_id`, `step_id`, `agent`, `status`
- [ ] No `console.log` calls anywhere in `packages/engine` — use the typed `log` helper

**Out of scope.**
- OpenTelemetry (cut, mentioned in DESIGN.md "what was cut")
- Langfuse (cut)

---

### #24 docs: README + DESIGN + DEMO + 3 architecture SVGs

**Block:** 7
**Type:** docs
**Estimate:** 25m
**Blocked by:** #22, #23
**Labels:** block-7, docs

**Why.** The final read for any reviewer. README has a CI badge + screenshots + quickstart. DESIGN.md walks the trade-offs and includes the mandatory "What was cut." DEMO.md is the literal walkthrough script (paste this brief → click Run → highlight these moments → click Replay). Three architecture SVGs round it out.

**What.**
- Modify: `README.md` — finalize Quickstart, embed CI badge, embed two screenshots from #23
- Files to create:
  - `DESIGN.md` — sections: Architecture, Key decisions (planner DAG, fixture replay, fan-out via Promise.all, single-process orchestration, no ORM), Trade-offs, **What was cut** (with reasons)
  - `DEMO.md` — 5-minute walkthrough script
  - `docs/architecture/01-component-topology.svg` — packages and their dependencies
  - `docs/architecture/02-data-model.svg` — 5 tables and their relationships
  - `docs/architecture/03-run-sequence.svg` — sequence diagram of one orchestrator run

**Acceptance criteria.**
- [ ] All 3 SVGs include `<rect width="100%" height="100%" fill="#ffffff"/>` as the first child
- [ ] DESIGN.md "What was cut" section has at least 5 items with one-line reasons
- [ ] CI badge URL in README points to the actual workflow
- [ ] DEMO.md is followable by someone who has not seen the project

**Out of scope.**
- A 4th "integration boundary" SVG (cut for time; the data model SVG covers persistence)
- Auto-generated API docs (cut)

---

### #25 chore: Vercel deploy config + scripts/dev.sh + scripts/demo_reset.sh

**Block:** 7
**Type:** chore
**Estimate:** 18m
**Blocked by:** #24
**Labels:** block-7, infra

**Why.** One-command boot for local dev, one-command reset for clean demo runs, and a Vercel deploy that auto-builds on push to main. After this ticket the project has a clickable `*.vercel.app` URL.

**What.**
- Files to create:
  - `scripts/dev.sh` — checks for `.env`, runs migrations, starts `npm run dev` for the web app
  - `scripts/demo_reset.sh` — `TRUNCATE`s `runs`, `run_steps`, `llm_calls`, `packets` (keeps `briefs`); reseeds with 1 sample completed run for the history rail
  - `vercel.json` — root build settings (use Turbo's build orchestration)
- Modify: README → add deployed URL + "deploy your own" Vercel button
- Set up Vercel project: link via `vercel link`, add `ANTHROPIC_API_KEY` and `DATABASE_URL` (Neon free tier connection) as env vars
- Deploy on push to main is automatic via Vercel's GitHub integration

**Acceptance criteria.**
- [ ] `./scripts/dev.sh` boots the project from clean checkout (after `npm install` + `.env` creation)
- [ ] `./scripts/demo_reset.sh` resets to clean state with 1 seed run
- [ ] Vercel build succeeds; `*.vercel.app` URL is reachable
- [ ] README has the deployed URL pinned

**Out of scope.**
- Custom domain
- Production-grade env management (Vercel UI is fine for the demo)
