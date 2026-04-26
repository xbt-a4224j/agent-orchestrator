# Demo Walkthrough (5 min)

This is the script for demoing `agent-orchestrator` to a hiring manager or technical audience.

---

## Setup (before you start)

```bash
bash scripts/demo_reset.sh   # wipe DB, reseed one sample run
bash scripts/dev.sh          # start the server
# open http://localhost:3000
```

You should see the brief form with a **Notion / VP of Marketing** preset already loaded.

---

## The pitch (30 seconds)

> "This is a typed multi-agent orchestrator. You give it a target account and a goal. A planner decomposes the brief into specialist tasks — research, copywriting, tone-check. The specialists run in parallel against shared data. A coordinator validates and merges results into a coordinated outreach packet: email, LinkedIn, agenda. Every LLM call is recorded so any past run can be replayed deterministically. I'll show you all three primitives."

---

## Step 1: Submit a brief (1 min)

Click **Notion / VP Marketing** preset (top of the form). Show the 10 fields — account, persona, offer, sender, goal. Hit **Run orchestrator**.

**What to narrate:**

> "The form submits a `Brief` schema validated by Zod. The API route inserts a row in `briefs` and `runs`, registers an SSE emitter, and fires the orchestrator as a background task."

---

## Step 2: Watch the run tree build out (1.5 min)

Point at the DAG tree as steps light up:

1. **Planner** completes first — returns the DAG
2. **account_research** and **contact_research** fan out in parallel
3. The three writers (**outreach**, **LinkedIn**, **agenda**) fan out next
4. **tone_checker** runs last

Point at the cost ticker ticking up in the corner.

**What to narrate:**

> "The orchestrator walks the DAG in topological waves — `Promise.all` for siblings. If any step fails, its transitive dependents are marked `skipped` rather than propagating an exception. The SSE stream is pushing step events from the server; the client just renders them."
>
> "Every LLM call records tokens in, tokens out, and cost in cents. The cost ticker is doing a requestAnimationFrame tween toward the live total."

---

## Step 3: Inspect the packet (1 min)

When the run completes, the view flips to the packet. Walk through the tabs:

- **Email** — subject, preview text, body. Point out how the pain points from account_research appear in the body.
- **LinkedIn** — ≤300 chars. Show the char count badge.
- **Agenda** — title, duration, 3 talking points.
- **Send sequence** — VP-level rule fires Tue 9am email, then LinkedIn D+3.
- **Research** — the raw account + contact intel that all artifacts are grounded in.

Hit **Push to HubSpot** and show the returned `hs_camp_<id>`.

---

## Step 4: Replay a past run (30 sec)

Click any past run in the left rail. The packet loads instantly — no LLM calls, served from the stored `packets` row.

Click **Re-run from beginning**. Watch the tree build out again.

**What to narrate:**

> "Every run is replayable. The `FixtureLLMClient` keys responses by SHA-256 of the prompt, so replay produces byte-identical output. This is how you regression-test a multi-LLM system — run the 9-row scenario matrix against fixtures, not the live API."

---

## Step 5: Show the scenario matrix (30 sec)

```bash
pnpm exec tsx scripts/verify_matrix.ts
```

```
✅ 9/9 scenarios passed
```

**What to narrate:**

> "Nine scenarios, zero LLM calls, under two seconds. Rows 2, 4, 6 prove failure handling — bad planner JSON, permanent 4xx, bounded tone retry. Row 7 proves the replay invariant. This runs as the final CI step on every push."

---

## Fallback if the app isn't running

- Show the scenario matrix output — it demonstrates all three primitives without a UI
- Show the engine source (`packages/engine/src/orchestrator.ts`) — the topological wave loop is ~30 lines
- Show the fast-check replay property test (`packages/engine/tests/replay.test.ts`)
