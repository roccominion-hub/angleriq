import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SQL = `
CREATE TABLE IF NOT EXISTS ingest_queue (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lake_name     text NOT NULL,
  state         text NOT NULL,
  source_type   text NOT NULL,
  url           text,
  raw_text      text,
  tournament    text,
  organization  text,
  reported_date text,
  notes         text,
  status        text NOT NULL DEFAULT 'pending',
  attempts      int  NOT NULL DEFAULT 0,
  max_attempts  int  NOT NULL DEFAULT 3,
  error         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_queue_status ON ingest_queue(status);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_state  ON ingest_queue(state);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_lake   ON ingest_queue(lake_name);
`

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  console.log('Running ingest_queue migration...')

  const res = await fetch(`${url}/rest/v1/`, {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  console.log('Supabase connection:', res.ok ? '✅ connected' : `❌ ${res.status}`)

  // Use the Postgres REST endpoint via pg_dump approach — Supabase exposes SQL via the management API
  const projectRef = url.replace('https://', '').split('.')[0]
  const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ query: SQL })
  })

  if (mgmtRes.ok) {
    console.log('✅ Migration applied via management API')
    return
  }

  // Fallback: use the pg REST endpoint directly
  const pgRes = await fetch(`${url}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ query: SQL })
  })

  console.log('pg endpoint status:', pgRes.status, await pgRes.text().catch(() => ''))
}

main().catch(console.error)
