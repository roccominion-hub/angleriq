-- AnglerIQ Ingest Queue
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ingest_queue (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lake_name     text NOT NULL,
  state         text NOT NULL,
  source_type   text NOT NULL,          -- tournament | article | youtube
  url           text,                   -- null if raw_text provided
  raw_text      text,                   -- null if url provided
  tournament    text,
  organization  text,
  reported_date text,
  notes         text,
  status        text NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed | skipped
  attempts      int  NOT NULL DEFAULT 0,
  max_attempts  int  NOT NULL DEFAULT 3,
  error         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_queue_status   ON ingest_queue(status);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_state    ON ingest_queue(state);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_lake     ON ingest_queue(lake_name);
