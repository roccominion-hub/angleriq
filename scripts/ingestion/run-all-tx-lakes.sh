#!/bin/bash
# Master runner — all 10 new Texas lakes in order
# Run from angleriq-app/: bash scripts/ingestion/run-all-tx-lakes.sh

set -e
cd "$(dirname "$0")/../.."

echo "================================================"
echo "  AnglerIQ — Texas Lake Batch Ingestion Runner"
echo "================================================"

run() {
  echo ""
  echo "▶ $1"
  echo "────────────────────────────────────────────────"
  npx tsx scripts/ingestion/$1 || echo "⚠️  Script exited with errors — continuing"
  echo ""
}

# Seed missing lakes first
run seed-missing-lakes.ts

# Ingest in requested order
run batch-ingest-conroe.ts
run batch-ingest-ohivie.ts
run batch-ingest-grapevine.ts
run batch-ingest-lewisville.ts
run batch-ingest-texoma.ts
run batch-ingest-caddo.ts
run batch-ingest-livingston.ts
run batch-ingest-falcon.ts
run batch-ingest-lakeofthepines.ts
run batch-ingest-amistad.ts

echo ""
echo "================================================"
echo "  ✅ All lakes complete!"
echo "================================================"
