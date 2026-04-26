# agent-orchestrator

A typed multi-agent orchestrator for B2B outreach campaigns. Takes a structured brief, decomposes it into parallel specialist tasks via a planner LLM, runs writers and researchers concurrently, and emits a coordinated multi-channel campaign packet — email, LinkedIn note, discovery agenda, send sequence — together with end-to-end persistence, per-call cost accounting, and bit-for-bit run replay from a stored event log.

## Quickstart

```bash
# prereqs: Node 20+, pnpm or npm, Postgres 16 (or Neon connection)
cp .env.example .env       # add ANTHROPIC_API_KEY + DATABASE_URL
npm install
npm run db:migrate
npm run dev
# → http://localhost:3000
```

Paste a brief, hit **Run orchestrator**, watch the tree-view build out.

## Architecture

Three layers:

- **`packages/engine`** — orchestrator core. Brief schemas, planner, specialist agents, event log, replay, cost accounting. Plain TypeScript, no framework dependency.
- **`packages/db`** *(could fold into engine; kept separate for clarity)* — Postgres schema + raw SQL migrations + a thin client wrapper.
- **`apps/web`** — Next.js app. Three views: brief form, live run, packet inspector. Server-side route handlers wrap the engine; SSE streams step events to the browser.

See [`docs/architecture/`](docs/architecture/) for the diagrams (component topology, data model, integration boundary, run sequence).

## Layout

```
agent-orchestrator/
  apps/web/              # Next.js app — form / run view / packet view
  packages/engine/       # orchestrator core (TS lib)
  packages/db/           # Postgres schema + migrations
  scripts/
    dev.sh               # one-command boot
    demo_reset.sh        # wipe + reseed for clean demo
    verify_matrix.ts     # 9-row scenario integration test
  docs/
    architecture/        # 4 SVG diagrams
  tests/
    fixtures/            # recorded LLM responses for deterministic replay
```

## Senior signals (in case you're scanning the repo)

- Conventional commits + semantic-release on every commit
- Replay invariant enforced as a fast-check property test
- Scenario matrix runs as the final CI step — matrix failure fails the build
- DESIGN.md has a "What was cut" section for trade-offs
- 4 architecture SVGs with consistent visual conventions
- Typed step states, typed reason codes (no string failure modes)
- Real Postgres in CI via testcontainers (no mocked persistence)

See [`CLAUDE.md`](CLAUDE.md) for the full design rationale and build plan.
See [`tickets.md`](tickets.md) for the ordered ticket list.

## License

MIT
