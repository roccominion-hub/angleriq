import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const lakes = [
  { name: 'Lake Fork',      lat: 32.90, lng: -95.61 },
  { name: 'Sam Rayburn',    lat: 31.07, lng: -94.11 },
  { name: 'Possum Kingdom', lat: 32.87, lng: -98.43 },
]

async function main() {
  for (const lake of lakes) {
    console.log(`\n══ ${lake.name} ══`)

    // Test 1: radius around lake center
    const q1 = `[out:json][timeout:15];way["waterway"~"river|stream|canal"](around:8000,${lake.lat},${lake.lng});out geom;`
    const r1 = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q1, signal: AbortSignal.timeout(15000) })
    const d1: any = await r1.json()
    const ways1 = (d1.elements ?? []).filter((e: any) => e.type === 'way' && e.geometry?.length > 1)
    console.log(`  Radius 8km:  ${ways1.length} waterway ways`)
    if (ways1.length > 0) {
      console.log(`    First way: ${ways1[0].tags?.name ?? '(unnamed)'}, ${ways1[0].geometry.length} pts`)
      const pts = ways1[0].geometry
      console.log(`    Endpoints: [${pts[0].lat.toFixed(4)},${pts[0].lon.toFixed(4)}] → [${pts[pts.length-1].lat.toFixed(4)},${pts[pts.length-1].lon.toFixed(4)}]`)
    }

    // Test 2: look up lake bbox from features API
    const { data: bowRow } = await supabase
      .from('body_of_water')
      .select('id, lat, lng')
      .eq('name', lake.name)
      .maybeSingle()

    if (bowRow) {
      console.log(`  Lake DB coords: ${bowRow.lat}, ${bowRow.lng}`)
    }
  }
}

main().catch(console.error)
