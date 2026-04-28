# AnglerIQ — Project Specification
> Last updated: 2026-04-07

## Overview

AnglerIQ is a bass fishing intelligence platform. Anglers search by body of water and receive AI-generated summaries of tournament-winning techniques, baits, patterns, and conditions — combined with live weather, moon/solunar data, and lake level information. The product is subscription-based with a free trial.

**Live URL:** https://angleriq-app.vercel.app (custom domain: getangleriq.com, SSL pending)
**Repo:** github.com/roccominion-hub/angleriq
**Local workspace:** /Users/rocco/Documents/angleriq

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, ShadCN |
| Maps | Leaflet + react-leaflet |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel (auto-deploy from main branch) |
| AI Summaries | Anthropic claude-haiku-4-5 |
| Embeddings | Voyage AI (voyage-3-lite) |
| Weather | Open-Meteo (free, no API key) |
| Lake Levels | TWDB / waterdatafortexas.org |
| Payments | Stripe (planned — not yet integrated) |

---

## Environment Variables

All stored in `.env.local` (local) and Vercel production environment.

```
NEXT_PUBLIC_SUPABASE_URL=https://qotpyszkdzjxqrlzlosw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-api03-...   (angleriq-ingestion key)
VOYAGE_API_KEY=...
```

---

## Database Schema

Supabase (Postgres). All tables in `public` schema.

### `body_of_water`
The master lake list. 81 TX lakes currently seeded.
```
id uuid PK
name text
state text
type text          -- reservoir | natural | river
species text[]     -- ['largemouth', 'smallmouth', ...]
lat numeric        -- centroid latitude (source of truth for maps)
lng numeric        -- centroid longitude
wdft_slug text     -- slug for waterdatafortexas.org lake level API
similar_lake_id uuid FK → body_of_water  -- fallback if this lake has no data
```

### `tournament`
```
id uuid PK
body_of_water_id uuid FK
name text
organization text   -- B.A.S.S. | MLF | local
year int
date date
```

### `tournament_result`
```
id uuid PK
tournament_id uuid FK
angler_name text
place int
total_weight_lbs numeric
```

### `technique_report`
Core data table. Each row = one angler's technique at one tournament.
~1,727 rows across 50 TX lakes.
```
id uuid PK
body_of_water_id uuid FK
tournament_id uuid FK (nullable)
angler_name text
place int
pattern text           -- e.g. "Deep cranking", "Texas rig"
presentation text      -- narrative description
season text            -- spring | summer | fall | winter
time_of_day text
fish_depth text
location_type text
source_url text
notes text
created_at timestamptz
```

### `bait_used`
Many-to-one with technique_report.
```
id uuid PK
technique_report_id uuid FK
bait_type text         -- crankbait | jig | soft plastic | etc.
bait_name text         -- e.g. "Strike King 6XD"
color text
weight_oz numeric
line_type text
line_lb_test numeric
product_url text       -- Bass Pro Shops affiliate link
retailer text
image_url text
```

### `conditions`
Weather/water conditions associated with a technique_report.
```
id uuid PK
technique_report_id uuid FK
date date
air_temp_f numeric
water_temp_f numeric
sky_cover text
wind_mph numeric
barometric_pressure numeric
pressure_trend text
water_clarity text
```

### `technique_embeddings`
RAG vector store. Each row = embedded chunk of technique/article text.
```
id uuid PK
body_of_water_id uuid FK (nullable)
lake_name text
content text
embedding vector(1024)   -- Voyage AI voyage-3-lite
source_type text         -- tournament | article | youtube
created_at timestamptz
```

### `summary_cache`
Caches AI-generated summaries to reduce API costs.
```
cache_key text PK
intel text              -- Tournament Intel section (7-day TTL)
today text              -- Today's Recommendation section (2-hour TTL)
expires_at timestamptz
```

### `profiles`
One per auth user. Auto-created on signup via Postgres trigger.
```
id uuid PK (references auth.users)
email text
full_name text
avatar_url text
trial_started_at timestamptz
subscription_status text   -- trial | active | cancelled | expired
subscription_tier text     -- free | pro
stripe_customer_id text
created_at timestamptz
updated_at timestamptz
```

### `saved_reports`
User-saved fishing reports.
```
id uuid PK
user_id uuid FK (references auth.users)
lake_name text
lake_state text
lake_type text
trip_date text        -- null = "Right Now" report
filters jsonb
result_data jsonb     -- topBaits, topPatterns, sampleSize, coords, water
summary_data jsonb    -- intel, today
weather_data jsonb
pinned boolean
created_at timestamptz
```

### `youtube_sources`
Tracks ingested YouTube videos.
```
id uuid PK
video_id text
title text
lake_name text
state text
published_at timestamptz
processed_at timestamptz
```

---

## API Routes

All under `src/app/api/`.

### `GET /api/lakes`
Returns all lakes from `body_of_water` table.
**Response:** `[{ id, name, state, type, species, lat, lng }]`

### `POST /api/search`
Core data query. Given a lake + optional filters, returns technique reports aggregated by bait and pattern.
**Body:** `{ lake, state, season?, filters? }`
**Response:** `{ water, sampleSize, topBaits, topPatterns, reports, coords }`

### `POST /api/summary`
Generates AI fishing report. Uses RAG (technique embeddings + curated articles). Returns two sections: Tournament Intel and Today's Recommendation. Caches intel 7 days, today 2 hours.
**Body:** `{ lake, state, season, sampleSize, topBaits, topPatterns, reports, weather, filters, lakeId, _secondary? }`
**AI Model:** `claude-haiku-4-5` via direct Anthropic API call
**Response:** `{ intel, today, cached }`

### `GET /api/weather`
Fetches live weather for a lat/lng via Open-Meteo. Returns temp, wind, sky conditions, precipitation, time of day, season, moon/solunar data.
**Query params:** `?lat=&lng=`
**Response:** `{ tempF, feelsLikeF, windMph, cloudCoverPct, skyCondition, timeOfDay, season, moon, ... }`

### `GET /api/lake-conditions`
Returns TWDB lake level data (elevation + pct full) for a given lake.
**Query params:** `?lake=&state=`
**Response:** `{ elevation, pctFull, ... }`

### `GET /api/lake-features`
Returns OSM lake polygon + NHD flowlines for map rendering.
- Lake polygon: Nominatim/OSM (preferred — full TX coverage)
- Flowlines: USGS NHD Layer 6
**Query params:** `?lake=&state=&lat=&lng=`

### `POST /api/rag-search`
Direct RAG lookup against `technique_embeddings` for a query.
**Body:** `{ query, lakeId?, topK? }`

### `POST /api/milk-run`
Generates a "milk run" — top 3-5 sequential patterns/locations for a lake day.
**Body:** `{ lake, state, topPatterns, topBaits, weather }`

### `POST /api/ingest-youtube`
Ingests a YouTube video transcript as technique data.
**Body:** `{ videoId, lake, state }`

### `POST /api/backfill-weather`
One-time utility to backfill weather data for existing reports.

### `GET /auth/callback`
Supabase OAuth callback handler.

---

## Key Pages & Components

### `app/page.tsx` — Home/Landing
Marketing homepage. Has how-it-works section, CTA to search.

### `app/search/page.tsx` — Search/Main App
The core user-facing page. ~1,200 lines. Features:
- Lake search dropdown with recent history + "Near You" geolocation
- Weather bar (live conditions, moon phase, solunar rating)
- Lake map (Leaflet — polygon + flowlines)
- Lake level gauge
- Filter panel (season, bait type, depth, structure, style, etc.)
- Technique cards (top baits with affiliate links, patterns)
- AI summary panel (Tournament Intel + Today's Recommendation)
- Alternative recommendation (secondary AI call with different approach)
- Milk run section
- Save report functionality

### `app/auth/login/page.tsx` + `app/auth/signup/page.tsx`
Standard Supabase email auth forms.

### `app/account/page.tsx`
User account page (current state TBD — likely basic profile view).

### `components/LakeMap.tsx`
Leaflet map component. Fetches polygon from `/api/lake-features`. Renders:
- Lake polygon (OSM via Nominatim)
- USGS NHD waterway tile overlay
- Wind direction arrows

### `components/LakeLevel.tsx`
TWDB lake level gauge with elevation + pct full.

### `components/NavUserMenu.tsx`
Auth-aware nav component (login/logout, account link).

### `lib/rag.ts`
RAG retrieval logic. Searches `technique_embeddings` via pgvector for relevant chunks.

### `lib/embeddings.ts`
Voyage AI embedding generation (`voyage-3-lite`, 1024-dim).

### `lib/moonphase.ts`
Moon phase calculation + solunar period computation. Pure client-side math.

### `lib/lake-conditions.ts`
TWDB lake level fetch logic + lake slug mapping + LAKE_PAIRS config.

### `lib/retry.ts`
Exponential backoff utility. Written but not yet wired into API routes.

### `middleware.ts`
Supabase session refresh middleware (runs on all routes).

---

## Ingestion Pipeline

Scripts in `scripts/ingestion/`.

### `ingest.ts`
Fetch a URL → AI-extract tournament technique data → insert to Supabase.
```bash
npx tsx scripts/ingestion/ingest.ts <url> <lake> <state> <type> [tournament] [org] [date]
```

### `ingest-raw.ts`
Same as above but takes raw text instead of URL.

### `extract-fishing-data.ts`
Core AI extraction logic. Uses `claude-haiku-4-5`. Includes hard filters to reject non-bass species and non-artificial baits post-extraction.

### `enrich-bait-urls.ts`
Backfills Bass Pro Shops product URLs for bait records.

### `embed-techniques.ts`
Generates embeddings for technique reports and stores in `technique_embeddings`.

**To run ingestion for a new lake:**
```bash
npx tsx scripts/ingestion/ingest.ts "https://source-url.com" "Lake Fork" "TX" "tournament" "B.A.S.S. Elite" "B.A.S.S." "2024-03-15"
```

---

## AI Model Usage

| Use Case | Model | Notes |
|---|---|---|
| Summary generation | `claude-haiku-4-5` | Direct API call in `/api/summary/route.ts` |
| Data extraction (ingestion) | `claude-haiku-4-5` | In `extract-fishing-data.ts` |
| Embeddings | `voyage-3-lite` (Voyage AI) | 1024 dimensions, stored in pgvector |

**All model calls use the `ANTHROPIC_API_KEY` env var.** No SDK wrapper — raw `fetch` to `https://api.anthropic.com/v1/messages`.

**Current models are up to date** (as of 2026-04-07):
- `claude-haiku-4-5` = `claude-haiku-4-5-20251001` — current, not deprecated
- `claude-haiku-3` retires 2026-04-19 — **we are NOT using this**

---

## Summary Caching Strategy

To control API costs, `/api/summary` caches both sections separately:

| Section | Cache TTL | Cache Key Includes |
|---|---|---|
| Tournament Intel | 7 days | lake + active filters |
| Today's Recommendation | 2 hours | lake + filters + temp bucket + time of day + sky + season |

Cache stored in `summary_cache` Supabase table. Lookup before AI call; cache miss triggers generation.

---

## RAG Architecture

Two RAG layers feed the AI summary prompt:

1. **Article/guide RAG** (`technique_embeddings` where `source_type = 'article'`)
   - Curated fishing articles and lake guides
   - Fetched via `getLakeRagContext()` in `lib/rag.ts`

2. **Tournament technique RAG** (`technique_embeddings` where `source_type = 'tournament'`)
   - Embeddings of actual tournament reports from the DB
   - Fetched via `getTechniqueRagChunks()` in `/api/summary/route.ts`

Both are retrieved using cosine similarity search via `match_technique_embeddings` Postgres RPC function.

---

## Map Architecture

**Lake polygon source:** Nominatim/OSM
- Query strategy: exact name → "Lake {name}" → "{name} Reservoir" → bare core
- Filter: bbox area ≥ 0.001 deg² (excludes ponds/placeholder points)
- Sort by proximity to known lat/lng from DB (MAX_DIST_DEG = 1.5)
- NHD Layer 12 is NOT used — incomplete for TX reservoirs
- Cache: 24 hours (86400s)

**Flowlines/waterways:** USGS NHD cached tile overlay
- Previous approach (Overpass/OSM) was blocked by Vercel IPs — replaced with NHD tiles
- NHD Layer 6 for large-scale flowlines
- bbox derived from polygon bounds, resultRecordCount=5000

**Map render:** `fitBounds(bounds, { padding: [20,20], maxZoom: 14 })`

**Special aliases:**
- `'Lake LBJ'` → `'Lake Lyndon B. Johnson'` (Nominatim)
- `'Moss Lake'` → `'Hubert M. Moss Lake'` (Nominatim)

**Paired lakes** (single search entry, dual polygon):
- Lake Graham / Lake Eddleman
- Lake Tyler / Lake Tyler East

---

## Auth Flow

1. Supabase email/password auth
2. Signup → Postgres trigger auto-creates `profiles` row
3. `middleware.ts` refreshes session on every request
4. `createClient()` in `lib/supabase/server.ts` for server components/routes
5. `createClient()` in `lib/supabase/client.ts` for client components
6. Protected routes: `/search` requires auth (enforced in middleware)

---

## Data Coverage

**State:** Texas (81 lakes in DB)
**Reports:** ~1,727 technique reports
**Lakes with data:** 50 of 81
**Primary sources:** B.A.S.S. Elite tournament results, pro angler articles
**Secondary sources:** YouTube transcripts (via `/api/ingest-youtube`)
**Affiliate links:** Bass Pro Shops (via CJ Affiliate program)

---

## Deployment

**Platform:** Vercel
**Branch:** main → auto-deploys to production
**Manual deploy:**
```bash
cd /Users/rocco/Documents/angleriq
npm run build && git add -A && git commit -m "message" && git push && vercel --prod --token <VERCEL_TOKEN>
```

**Vercel token:** In `.env.local` as `VERCEL_TOKEN` (vcp_...)

---

## What's Built

- [x] Lake search with dropdown (recent + Near You)
- [x] Live weather bar + moon/solunar
- [x] Lake map (Leaflet, OSM polygon, NHD waterways)
- [x] Lake level gauge (TWDB)
- [x] Filter panel (season, bait type, depth, structure, location, style, conditions)
- [x] Technique cards with affiliate bait links
- [x] AI summary (Tournament Intel + Today's Recommendation)
- [x] Alternative recommendation (secondary AI call)
- [x] Milk run generator
- [x] Save reports
- [x] Supabase Auth (email signup/login)
- [x] User profiles table + auto-create trigger
- [x] RAG (technique embeddings + article embeddings)
- [x] Summary caching (2hr + 7-day)

## What's Pending (Pre-Launch)

- [ ] **Admin page** — list user accounts, per-user metrics (create date, last access, reports run), aggregate totals
- [ ] **Stripe integration** — subscription payments (Basic $10/mo, Pro $20-30/mo, 7-day free trial)
- [ ] **Report usage tracking** — increment counter per user per summary call (needed for admin metrics)
- [ ] **Data backfill** — 31 TX lakes still have no technique reports (shell script approach, not sub-agent)
- [ ] **Oklahoma lakes** — expand data coverage to OK fisheries (Grand Lake, Eufaula, Texoma, etc.)
- [ ] **Wire `retry.ts`** — exponential backoff not yet connected to API routes
- [ ] **getangleriq.com SSL** — custom domain SSL pending
- [ ] **Pricing/subscription UI** — upgrade flow for free → paid users
