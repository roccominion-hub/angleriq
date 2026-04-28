# AnglerIQ — Claude Code Context

## Project Overview

AnglerIQ is a bass fishing intelligence platform. Anglers search by body of water and receive AI-generated summaries of tournament-winning techniques, baits, patterns, and conditions — combined with live weather, moon/solunar data, and lake level information. Subscription-based with a free trial.

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
| AI Summaries | `claude-haiku-4-5` (direct fetch, no SDK) |
| Embeddings | Voyage AI (`voyage-3-lite`, 1024-dim) |
| Weather | Open-Meteo (free, no API key) |
| Lake Levels | TWDB / waterdatafortexas.org |
| Payments | Stripe (planned — not yet integrated) |

---

## Development

```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # lint
```

All env vars are in `.env.local`. Do not commit this file.

---

## Project Structure

```
src/
  app/
    page.tsx                  # Home/landing page
    layout.tsx
    search/page.tsx           # Core search UI (~1,200 lines) — main app
    account/page.tsx          # User account page
    auth/                     # Login + signup pages
    api/
      lakes/                  # GET  — all lakes from body_of_water
      search/                 # POST — technique reports for a lake + filters
      summary/                # POST — AI summary (RAG + claude-haiku-4-5)
      weather/                # GET  — live weather via Open-Meteo
      lake-conditions/        # GET  — TWDB lake level data
      lake-features/          # GET  — OSM polygon + NHD flowlines for map
      rag-search/             # POST — direct RAG lookup
      milk-run/               # POST — sequential fishing pattern generator
      ingest-youtube/         # POST — YouTube transcript ingestion
      backfill-weather/       # POST — one-time utility
  components/
    LakeMap.tsx               # Leaflet map (OSM polygon + NHD waterway tiles)
    LakeLevel.tsx             # TWDB lake level gauge
    NavUserMenu.tsx           # Auth-aware nav
    BaitIcon.tsx
    HomeNav.tsx
    HowItWorks.tsx
    Logo.tsx
    ui/                       # ShadCN components
  lib/
    rag.ts                    # RAG retrieval (getLakeRagContext, getTechniqueRagChunks)
    embeddings.ts             # Voyage AI embedding generation
    moonphase.ts              # Moon phase + solunar calculations (pure math)
    lake-conditions.ts        # TWDB fetch logic + LAKE_PAIRS config
    retry.ts                  # Exponential backoff (written, not yet wired in)
    auth.tsx                  # Auth helpers
    utils.ts
    supabase/
      client.ts               # Client-side Supabase client
      server.ts               # Server-side Supabase client
  middleware.ts               # Supabase session refresh (runs on all routes)
scripts/
  ingestion/
    ingest.ts                 # Ingest from URL
    ingest-raw.ts             # Ingest from raw text
    extract-fishing-data.ts   # AI extraction via claude-haiku-4-5
    enrich-bait-urls.ts       # Backfill Bass Pro Shops affiliate URLs
    embed-techniques.ts       # Generate + store technique embeddings
```

---

## Database Schema (Supabase / Postgres)

### `body_of_water`
Master lake list. 81 TX lakes.
```
id uuid PK | name | state | type (reservoir|natural|river)
species text[] | lat | lng | wdft_slug | similar_lake_id FK (fallback)
```

### `technique_report`
Core data table. ~1,727 rows across 50 TX lakes. One row = one angler's technique at one tournament.
```
id | body_of_water_id FK | tournament_id FK (nullable) | angler_name | place
pattern | presentation | season | time_of_day | fish_depth | location_type
source_url | notes | created_at
```

### `bait_used`
Many-to-one with technique_report.
```
id | technique_report_id FK | bait_type | bait_name | color | weight_oz
line_type | line_lb_test | product_url (Bass Pro Shops affiliate) | retailer | image_url
```

### `conditions`
Weather/water conditions linked to a technique_report.
```
id | technique_report_id FK | date | air_temp_f | water_temp_f | sky_cover
wind_mph | barometric_pressure | pressure_trend | water_clarity
```

### `technique_embeddings`
RAG vector store. Cosine similarity via `match_technique_embeddings` Postgres RPC.
```
id | body_of_water_id FK (nullable) | lake_name | content
embedding vector(1024) | source_type (tournament|article|youtube) | created_at
```

### `summary_cache`
AI summary cache. Intel: 7-day TTL. Today's Recommendation: 2-hour TTL.
```
cache_key PK | intel text | today text | expires_at
```

### `profiles`
Auto-created on signup via Postgres trigger.
```
id (references auth.users) | email | full_name | avatar_url
trial_started_at | subscription_status (trial|active|cancelled|expired)
subscription_tier (free|pro) | stripe_customer_id | created_at | updated_at
```

### `saved_reports`
```
id | user_id FK | lake_name | lake_state | lake_type | trip_date (null = "Right Now")
filters jsonb | result_data jsonb | summary_data jsonb | weather_data jsonb
pinned boolean | created_at
```

### `tournament` / `tournament_result` / `youtube_sources`
Supporting tables — see SPEC.md for full schema.

---

## AI Model Usage

All model calls use raw `fetch` to `https://api.anthropic.com/v1/messages` — no Anthropic SDK.
Auth via `ANTHROPIC_API_KEY` env var.

| Use Case | Model |
|---|---|
| Summary generation (`/api/summary`) | `claude-haiku-4-5` |
| Data extraction (ingestion scripts) | `claude-haiku-4-5` |
| Embeddings | Voyage AI `voyage-3-lite` (1024-dim) |

`claude-haiku-4-5` = `claude-haiku-4-5-20251001` — current, not deprecated.

---

## RAG Architecture

Two layers feed the AI summary prompt in `/api/summary/route.ts`:

1. **Article RAG** — `technique_embeddings` where `source_type = 'article'`
   - `getLakeRagContext()` in `lib/rag.ts`
2. **Tournament technique RAG** — `technique_embeddings` where `source_type = 'tournament'`
   - `getTechniqueRagChunks()` in `/api/summary/route.ts`

Both use cosine similarity via the `match_technique_embeddings` Postgres RPC.

---

## Map Architecture

- **Lake polygon:** Nominatim/OSM. Query strategy: exact → "Lake {name}" → "{name} Reservoir" → bare core. Filter: bbox ≥ 0.001 deg². Sort by proximity to DB lat/lng (MAX_DIST_DEG = 1.5). Cache 24h.
- **Flowlines:** USGS NHD Layer 6 cached tile overlay (Overpass/OSM was blocked by Vercel IPs).
- **Special aliases:** `'Lake LBJ'` → `'Lake Lyndon B. Johnson'`, `'Moss Lake'` → `'Hubert M. Moss Lake'`
- **Paired lakes:** Lake Graham/Eddleman, Lake Tyler/Tyler East

---

## Summary Caching

| Section | TTL | Cache Key |
|---|---|---|
| Tournament Intel | 7 days | lake + active filters |
| Today's Recommendation | 2 hours | lake + filters + temp bucket + time of day + sky + season |

---

## Auth Flow

1. Supabase email/password auth
2. Signup → Postgres trigger auto-creates `profiles` row
3. `middleware.ts` refreshes session on every request
4. `/search` is a protected route — requires auth

---

## Ingestion Pipeline

```bash
# Ingest from URL
npx tsx scripts/ingestion/ingest.ts "https://source.com" "Lake Fork" "TX" "tournament" "B.A.S.S. Elite" "B.A.S.S." "2024-03-15"

# Ingest from raw text
npx tsx scripts/ingestion/ingest-raw.ts ...
```

Hard filters in `extract-fishing-data.ts`: bass species only, artificial baits only.

---

## Deployment

**Platform:** Vercel — auto-deploys from `main` branch.

```bash
npm run build
git add <files>
git commit -m "message"
git push
```

Vercel token is in `.env.local` as `VERCEL_TOKEN`.

---

## What's Built

- [x] Lake search (dropdown, recent history, Near You geolocation)
- [x] Live weather bar + moon/solunar
- [x] Lake map (Leaflet, OSM polygon, NHD waterways)
- [x] Lake level gauge (TWDB)
- [x] Filter panel (season, bait type, depth, structure, location, style, conditions)
- [x] Technique cards with affiliate bait links
- [x] AI summary (Tournament Intel + Today's Recommendation)
- [x] Alternative recommendation (secondary AI call)
- [x] Milk run generator
- [x] Save reports
- [x] Supabase Auth + user profiles

## What's Pending (Pre-Launch)

- [ ] **Stripe integration** — Basic $10/mo, Pro $20-30/mo, 7-day free trial
- [ ] **Report usage tracking** — increment counter per user per summary call
- [ ] **Admin page** — user accounts, per-user metrics, aggregate totals
- [ ] **Pricing/subscription UI** — upgrade flow for free → paid
- [ ] **Data backfill** — 31 TX lakes still have no technique reports
- [ ] **Oklahoma lakes** — Grand Lake, Eufaula, Texoma, etc.
- [ ] **Wire `retry.ts`** — exponential backoff not connected to API routes
- [ ] **getangleriq.com SSL** — custom domain SSL pending
