CREATE TABLE IF NOT EXISTS packets (
  run_id UUID PRIMARY KEY REFERENCES runs(id),
  content JSONB NOT NULL,
  hubspot_campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
