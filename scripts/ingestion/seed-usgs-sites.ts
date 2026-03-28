import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapping: lake name in DB → { usgs_site_no, wdft_slug }
// USGS site numbers sourced from:
// https://waterservices.usgs.gov/nwis/site/?stateCd=TX&siteType=LK&format=rdb&siteStatus=active&hasDataTypeCd=iv
// wdft_slug: waterdatafortexas.org slug pattern
const MAPPINGS: Record<string, { usgs_site_no: string; wdft_slug: string }> = {
  // Confirmed mappings
  "Lake Fork":               { usgs_site_no: "08018800", wdft_slug: "fork" },
  "Lake Tawakoni":           { usgs_site_no: "08017400", wdft_slug: "tawakoni" },
  "Lake Nocona":             { usgs_site_no: "07315600", wdft_slug: "nocona" },
  "Moss Lake":               { usgs_site_no: "07315950", wdft_slug: "hubert-h-moss" },
  "Bois d'Arc Lake":         { usgs_site_no: "07332621", wdft_slug: "bois-darc" },
  "Lake Bob Sandlin":        { usgs_site_no: "07344489", wdft_slug: "bob-sandlin" },
  "Cypress Springs Lake":    { usgs_site_no: "07344484", wdft_slug: "cypress-springs" },
  "Lake Athens":             { usgs_site_no: "08031290", wdft_slug: "athens" },
  "Lake Palestine":          { usgs_site_no: "08031400", wdft_slug: "palestine" },
  "Lake Buchanan":           { usgs_site_no: "08148000", wdft_slug: "buchanan" },

  // Matched from USGS TX lake site list
  "Sam Rayburn Reservoir":       { usgs_site_no: "08039300", wdft_slug: "sam-rayburn" },
  "Toledo Bend Reservoir":       { usgs_site_no: "312914093422701", wdft_slug: "toledo-bend" },
  "Lake Conroe":                 { usgs_site_no: "08067600", wdft_slug: "conroe" },
  "Lake Livingston":             { usgs_site_no: "08066190", wdft_slug: "livingston" },
  "O.H. Ivie Reservoir":         { usgs_site_no: "08136600", wdft_slug: "ivie" },
  "Richland Chambers Reservoir": { usgs_site_no: "08064550", wdft_slug: "richland-chambers" },
  "Lake Whitney":                { usgs_site_no: "08092500", wdft_slug: "whitney" },
  "Lake Travis":                 { usgs_site_no: "08154500", wdft_slug: "travis" },
  "Lake Granbury":               { usgs_site_no: "08090900", wdft_slug: "granbury" },
  "Possum Kingdom Lake":         { usgs_site_no: "08088500", wdft_slug: "possum-kingdom" },
  "Eagle Mountain Lake":         { usgs_site_no: "08045000", wdft_slug: "eagle-mountain" },
  "Lake Lavon":                  { usgs_site_no: "08060500", wdft_slug: "lavon" },
  "Lake Ray Hubbard":            { usgs_site_no: "08061550", wdft_slug: "ray-hubbard" },
  "Joe Pool Lake":               { usgs_site_no: "08049800", wdft_slug: "joe-pool" },
  "Choke Canyon Reservoir":      { usgs_site_no: "08206900", wdft_slug: "choke-canyon" },
  "Canyon Lake":                 { usgs_site_no: "08167700", wdft_slug: "canyon" },
  "Lake LBJ":                    { usgs_site_no: "08152500", wdft_slug: "lbj" },
  "Hubbard Creek Reservoir":     { usgs_site_no: "08086400", wdft_slug: "hubbard-creek" },
  "Lake Bridgeport":             { usgs_site_no: "08043000", wdft_slug: "bridgeport" },
  "Cedar Creek Reservoir":       { usgs_site_no: "08063010", wdft_slug: "cedar-creek" },
  "Lake Worth":                  { usgs_site_no: "08045400", wdft_slug: "worth" },
  "Lake Arlington":              { usgs_site_no: "08049200", wdft_slug: "arlington" },
  "Lake Ray Roberts":            { usgs_site_no: "08051100", wdft_slug: "ray-roberts" },
  "Lake Tyler":                  { usgs_site_no: "08034000", wdft_slug: "tyler" },
  "Lake Belton":                 { usgs_site_no: "08102000", wdft_slug: "belton" },

  // Additional lakes in DB that also appear in USGS list
  "Lake Graham":                 { usgs_site_no: "08088400", wdft_slug: "graham" },
  "Lake Granbury":               { usgs_site_no: "08090900", wdft_slug: "granbury" },
  "Lake J.B. Thomas":            { usgs_site_no: "08118000", wdft_slug: "j-b-thomas" },
  "Lake Waxahachie":             { usgs_site_no: "08063600", wdft_slug: "waxahachie" },
  "Lake Pat Cleburne":           { usgs_site_no: "08091900", wdft_slug: "pat-cleburne" },
}

// Lakes in DB with wdft_slug only (no USGS site found in TX active lake IV list)
const WDFT_ONLY: Record<string, string> = {
  "Lake Texoma":   "texoma",     // straddles TX/OK — USGS site likely in OK
  "Falcon Lake":   "falcon",     // international reservoir (TX/Mexico)
  "Lake Amistad":  "amistad",    // international reservoir (TX/Mexico)
  "Caddo Lake":    "caddo",      // no active IV site found in TX LK list
}

async function main() {
  const { data: lakes, error } = await supabase
    .from('body_of_water')
    .select('id, name')
    .eq('state', 'TX')
    .order('name')

  if (error) {
    console.error('Failed to fetch lakes:', error)
    process.exit(1)
  }

  const matched: string[] = []
  const wdftOnly: string[] = []
  const unmatched: string[] = []

  for (const lake of lakes!) {
    const mapping = MAPPINGS[lake.name]
    if (mapping) {
      const { error: updateErr } = await supabase
        .from('body_of_water')
        .update({ usgs_site_no: mapping.usgs_site_no, wdft_slug: mapping.wdft_slug })
        .eq('id', lake.id)
      if (updateErr) {
        console.error(`  ❌ Failed to update ${lake.name}:`, updateErr.message)
      } else {
        matched.push(`  ✅ ${lake.name} → usgs: ${mapping.usgs_site_no}, wdft: ${mapping.wdft_slug}`)
      }
    } else if (WDFT_ONLY[lake.name]) {
      const slug = WDFT_ONLY[lake.name]
      const { error: updateErr } = await supabase
        .from('body_of_water')
        .update({ wdft_slug: slug })
        .eq('id', lake.id)
      if (updateErr) {
        console.error(`  ❌ Failed to update ${lake.name}:`, updateErr.message)
      } else {
        wdftOnly.push(`  🟡 ${lake.name} → wdft: ${slug} (no USGS site)`)
      }
    } else {
      unmatched.push(`  ⚪ ${lake.name}`)
    }
  }

  console.log(`\n✅ Fully matched (USGS + wdft): ${matched.length}`)
  matched.forEach(m => console.log(m))

  console.log(`\n🟡 wdft_slug only (no USGS match): ${wdftOnly.length}`)
  wdftOnly.forEach(m => console.log(m))

  console.log(`\n⚪ No match found: ${unmatched.length}`)
  unmatched.forEach(m => console.log(m))

  console.log('\nDone.')
}

main()
