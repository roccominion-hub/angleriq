import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const lakes = [
  { name: 'Lake Fork',      lat: 32.90, lng: -95.61 },
  { name: 'Sam Rayburn',    lat: 31.07, lng: -94.11 },
  { name: 'Lake Granbury',  lat: 32.44, lng: -97.79 },
  { name: 'Toledo Bend',    lat: 31.53, lng: -93.57 },
  { name: 'Possum Kingdom', lat: 32.87, lng: -98.43 },
]

async function main() {
  for (const lake of lakes) {
    console.log(`\n══ ${lake.name} ══`)
    const pad = 0.7
    const r = (n: number) => parseFloat(n.toFixed(7))
    const bbox = `${r(lake.lng - pad)},${r(lake.lat - pad)},${r(lake.lng + pad)},${r(lake.lat + pad)}`

    const siteRes = await fetch(
      `https://waterservices.usgs.gov/nwis/site/?bBox=${bbox}&siteType=ST&format=rdb&siteStatus=active`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!siteRes.ok) { console.log(`  ❌ HTTP ${siteRes.status}`); continue }
    const txt = await siteRes.text()

    const sites = txt.split('\n')
      .filter(l => !l.startsWith('#') && !l.startsWith('agency') && !l.match(/^\d+s/) && l.trim())
      .map(l => { const c = l.split('\t'); return { no: c[1], name: c[2], slat: parseFloat(c[4]), slng: parseFloat(c[5]) } })
      .filter(s => s.no && !isNaN(s.slat) && !isNaN(s.slng))
      .sort((a, b) => distKm(lake.lat, lake.lng, a.slat, a.slng) - distKm(lake.lat, lake.lng, b.slat, b.slng))
      .slice(0, 12)

    if (!sites.length) { console.log('  ❌ No sites'); continue }

    const flowRes = await fetch(
      `https://waterservices.usgs.gov/nwis/iv/?sites=${sites.map(s=>s.no).join(',')}&parameterCd=00060&format=json`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data: any = await flowRes.json()
    const valid = (data?.value?.timeSeries ?? []).flatMap((ts: any) => {
      const vals = ts.values?.[0]?.value ?? []
      const v = parseFloat(vals[vals.length-1]?.value ?? 'NaN')
      if (isNaN(v) || v < 0) return []
      const gloc = ts.sourceInfo?.geoLocation?.geogLocation
      return [{ no: ts.sourceInfo?.siteCode?.[0]?.value, name: ts.sourceInfo?.siteName, cfs: Math.round(v),
                dist: distKm(lake.lat, lake.lng, gloc?.latitude, gloc?.longitude) }]
    }).sort((a: any, b: any) => a.dist - b.dist)

    console.log(`  ✓ ${valid.length} inflows with flow data:`)
    valid.forEach((g: any) => console.log(`    ${g.dist.toFixed(1).padStart(5)}km  ${g.no}  ${g.name}: ${g.cfs} cfs`))
  }
}

main().catch(console.error)
