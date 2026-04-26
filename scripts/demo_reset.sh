#!/usr/bin/env bash
# demo_reset.sh — wipe run data and reseed one sample run for a clean demo
set -euo pipefail

source "$(dirname "$0")/../.env.local" 2>/dev/null || true

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌  DATABASE_URL not set. Copy .env.example to .env.local and fill it in."
  exit 1
fi

echo "🗑️  Truncating run data..."
psql "$DATABASE_URL" <<SQL
TRUNCATE TABLE packets, llm_calls, run_steps, runs, briefs RESTART IDENTITY CASCADE;
SQL

echo "🌱  Done. DB is clean — submit a brief from the UI to seed a fresh run."
echo "    Or run: pnpm exec tsx scripts/verify_matrix.ts"
