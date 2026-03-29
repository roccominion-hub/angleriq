#!/bin/bash
cd /Users/rocco/.openclaw/workspace/angleriq-app

LAKES=(
  "Squaw Creek Reservoir"
  "Lake Texoma"
  "Lake Eddleman"
  "Lake Buchanan"
  "Lake Aquilla"
  "Joe Pool Lake"
  "Lake Belton"
  "Lake Conroe"
  "Lake Granbury"
  "Lake Ray Hubbard"
  "O.H. Ivie Reservoir"
  "Possum Kingdom Lake"
  "Lake Brownwood"
  "Lake Waco"
  "Canyon Lake"
  "Lake Bridgeport"
  "Lake LBJ"
  "Lake Nocona"
  "Lake Worth"
  "Moss Lake"
  "Lake Lewisville"
  "Lake O' the Pines"
  "Wright Patman Lake"
  "Lake B.A. Steinhagen"
  "E.V. Spence Reservoir"
  "Coleto Creek Reservoir"
  "Somerville Lake"
  "Navarro Mills Lake"
)

for lake in "${LAKES[@]}"; do
  echo "===LAKE_START: $lake==="
  npx tsx scripts/ingestion/search-and-ingest.ts "$lake" TX 2>&1
  echo "===LAKE_END: $lake==="
done

echo "===BATCH_COMPLETE==="
