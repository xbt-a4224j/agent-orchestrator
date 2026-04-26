#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="agent-orchestrator-postgres"
DB_PORT=5434
DB_NAME="agent_orchestrator"
DB_USER="postgres"
DB_PASS="postgres"

# ── Postgres ─────────────────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "Restarting existing postgres container..."
    docker start "$DB_CONTAINER"
  else
    echo "Starting postgres on :${DB_PORT}..."
    docker run -d \
      --name "$DB_CONTAINER" \
      -e POSTGRES_DB="$DB_NAME" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_PASSWORD="$DB_PASS" \
      -p "${DB_PORT}:5432" \
      postgres:16-alpine
  fi
fi

echo "Waiting for postgres..."
until docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -q; do sleep 1; done
echo "Postgres ready."

# ── .env.local ───────────────────────────────────────────────────────────────
ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
ANTHROPIC_API_KEY=
DATABASE_URL=
EOF
  echo "Created $ENV_FILE — fill in ANTHROPIC_API_KEY and DATABASE_URL before running again."
  exit 1
fi

if grep -qE '^ANTHROPIC_API_KEY=$' "$ENV_FILE"; then
  echo "ERROR: fill in ANTHROPIC_API_KEY in $ENV_FILE first."
  exit 1
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo "Installing dependencies..."
pnpm install

# ── Migrations ───────────────────────────────────────────────────────────────
echo "Running migrations..."
pnpm --filter @agent-orchestrator/db migrate

# ── Dev server ────────────────────────────────────────────────────────────────
echo "Starting dev server..."
pnpm turbo dev
