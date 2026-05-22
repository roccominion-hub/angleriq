/**
 * Lake conditions — water level via waterdatafortexas.org,
 * inflows via USGS NWIS, wind via Open-Meteo
 */

export interface WaterLevel {
  valueFt: number
  percentFull: number
  abovePoolFt: number        // positive = above conservation pool, negative = below
  conservationPoolFt: number
  deltaFt: number            // change from yesterday
  trend: 'rising' | 'falling' | 'stable'
  date: string
}

export interface InflowGauge {
  siteName: string
  siteNo: string
  flowCfs: number
  dateTime: string
  lat: number
  lng: number
}

export interface WindData {
  speedMph: number
  directionDeg: number       // meteorological: direction FROM which wind blows
  directionLabel: string
  gustsMph: number
}

export interface LakeConditions {
  waterLevel: WaterLevel | null
  inflows: InflowGauge[]
  wind: WindData | null
  waterTempF: number | null
  waterTempSource: 'measured' | 'estimated' | null
}

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'
const WDFT_BASE  = 'https://www.waterdatafortexas.org/reservoirs/individual'
const USGS_IV    = 'https://waterservices.usgs.gov/nwis/iv'
const CWMS_BASE  = 'https://cwms-data.usace.army.mil/cwms-data'

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
function toCompass(deg: number) { return COMPASS[Math.round(deg / 22.5) % 16] }

// Parse WDFT 30-day CSV for water level + trend
async function fetchWdftLevel(slug: string): Promise<WaterLevel | null> {
  try {
    const res = await fetch(`${WDFT_BASE}/${slug}-30day.csv`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(25000),
    } as RequestInit)
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
    if (lines.length < 2) return null

    // Parse data rows (skip header)
    const rows = lines.slice(1).map(l => {
      const [date, water_level, , , , percent_full, conservation_capacity] = l.split(',')
      return { date, wl: parseFloat(water_level), pct: parseFloat(percent_full), cap: parseFloat(conservation_capacity) }
    }).filter(r => !isNaN(r.wl))

    if (rows.length < 2) return null
    const latest = rows[rows.length - 1]
    const prev   = rows[rows.length - 2]

    // Get conservation pool from the statewide instantaneous API
    const instRes = await fetch(
      'https://www.waterdatafortexas.org/reservoirs/api/instantaneous?output_format=csv',
      { next: { revalidate: 900 }, signal: AbortSignal.timeout(15000) } as RequestInit
    )
    let conservPool = 0
    let abovePool = 0
    if (instRes.ok) {
      const csv = await instRes.text()
      const slugUpper = slug.replace(/-/g, '').toLowerCase()
      const match = csv.split('\n').find(l =>
        l.toLowerCase().replace(/[^a-z]/g, '').includes(slugUpper)
      )
      if (match) {
        const fields = match.split(',')
        conservPool = parseFloat(fields[3]) || 0  // conservation_pool_elevation
        abovePool   = parseFloat(fields[9]) || 0  // water_level_above_conservation_pool
      }
    }

    const delta = latest.wl - prev.wl
    return {
      valueFt: Math.round(latest.wl * 100) / 100,
      percentFull: Math.round(latest.pct * 10) / 10,
      abovePoolFt: Math.round(abovePool * 100) / 100,
      conservationPoolFt: conservPool,
      deltaFt: Math.round(delta * 100) / 100,
      trend: delta > 0.02 ? 'rising' : delta < -0.02 ? 'falling' : 'stable',
      date: latest.date,
    }
  } catch { return null }
}

// Fetch pool elevation from Army Corps CWMS API (Corps-managed reservoirs)
// Elevation is in feet above NGVD29. Office codes: SWT = Tulsa District (OK), SWF = Fort Worth (TX)
async function fetchCwmsLevel(locationCode: string, office = 'SWT'): Promise<WaterLevel | null> {
  try {
    const now  = new Date()
    const past = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const begin = past.toISOString().replace(/\.\d+Z$/, 'Z')
    const end   = now.toISOString().replace(/\.\d+Z$/, 'Z')

    const url = `${CWMS_BASE}/timeseries?office=${office}&name=${encodeURIComponent(`${locationCode}.Elev.Inst.1Hour.0.Ccp-Rev`)}&begin=${begin}&end=${end}&format=json&unit=ft`
    const res = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10000) } as RequestInit)
    if (!res.ok) return null

    const data = await res.json()
    // values: [[timestamp_ms, elevation_ft | null, quality_code], ...]
    const values: [number, number | null, number][] = data.values ?? []
    const good = values.filter(v => v[1] !== null && v[1]! > 0)
    if (good.length < 2) return null

    const latest = good[good.length - 1]
    const first  = good[0]
    const elev   = latest[1]!
    const delta  = elev - first[1]!

    return {
      valueFt:            Math.round(elev  * 100) / 100,
      percentFull:        0,    // not available from CWMS elevation timeseries
      abovePoolFt:        0,
      conservationPoolFt: 0,
      deltaFt:            Math.round(delta * 100) / 100,
      trend:              delta > 0.02 ? 'rising' : delta < -0.02 ? 'falling' : 'stable',
      date:               new Date(latest[0]).toISOString().split('T')[0],
    }
  } catch { return null }
}

// Fetch lake stage (water level) from USGS for lakes with a known gauge site (parameter 00065 = gauge height ft)
async function fetchUsgsLakeLevel(siteNo: string): Promise<WaterLevel | null> {
  try {
    // Get last 2 days of data so we can compute a trend
    const url = `${USGS_IV}/?sites=${siteNo}&parameterCd=00065&period=P2D&format=json`
    const res = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10000) } as RequestInit)
    if (!res.ok) return null

    const data = await res.json()
    const ts = data?.value?.timeSeries?.[0]
    if (!ts) return null

    const values = (ts.values?.[0]?.value ?? [])
      .map((v: any) => ({ val: parseFloat(v.value), dt: v.dateTime }))
      .filter((v: any) => !isNaN(v.val) && v.val > 0)

    if (values.length < 2) return null

    const latest = values[values.length - 1]
    const dayAgo = values[0]
    const delta  = latest.val - dayAgo.val

    return {
      valueFt:           Math.round(latest.val * 100) / 100,
      percentFull:       0,     // USGS gauge height doesn't give % full
      abovePoolFt:       0,
      conservationPoolFt: 0,
      deltaFt:           Math.round(delta * 100) / 100,
      trend:             delta > 0.02 ? 'rising' : delta < -0.02 ? 'falling' : 'stable',
      date:              latest.dt.split('T')[0],
    }
  } catch { return null }
}

// Fetch inflow gauges from USGS (stream gages near lake) — hard 10s timeout so it never
// delays or starves the waterway/map data which is higher priority.
async function fetchInflows(lat: number, lng: number): Promise<InflowGauge[]> {
  try {
    const pad = 0.4
    const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`
    const ac1 = new AbortController()
    const t1 = setTimeout(() => ac1.abort(), 10000)
    const siteRes = await fetch(
      `https://waterservices.usgs.gov/nwis/site/?bBox=${bbox}&siteType=ST&format=rdb&siteStatus=active&hasDataTypeCd=iv`,
      { next: { revalidate: 3600 }, signal: ac1.signal } as RequestInit
    )
    clearTimeout(t1)
    if (!siteRes.ok) return []
    const txt = await siteRes.text()
    const siteNos = txt.split('\n')
      .filter(l => !l.startsWith('#') && !l.startsWith('agency') && !l.match(/^\d+s/) && l.trim())
      .map(l => l.split('\t')[1])
      .filter(Boolean)
      .slice(0, 8)

    if (!siteNos.length) return []

    const ac2 = new AbortController()
    const t2 = setTimeout(() => ac2.abort(), 8000)
    const flowRes = await fetch(
      `${USGS_IV}/?sites=${siteNos.join(',')}&parameterCd=00060&format=json`,
      { next: { revalidate: 900 }, signal: ac2.signal } as RequestInit
    )
    clearTimeout(t2)
    if (!flowRes.ok) return []
    const data = await flowRes.json()

    return (data?.value?.timeSeries ?? []).flatMap((ts: any) => {
      const values = ts.values?.[0]?.value ?? []
      if (!values.length) return []
      const latest = values[values.length - 1]
      const flow = parseFloat(latest.value)
      if (isNaN(flow) || flow < 0) return []
      return [{
        siteName: ts.sourceInfo?.siteName ?? 'Unknown',
        siteNo: ts.sourceInfo?.siteCode?.[0]?.value ?? '',
        flowCfs: Math.round(flow),
        dateTime: latest.dateTime,
        lat: ts.sourceInfo?.geoLocation?.geogLocation?.latitude ?? lat,
        lng: ts.sourceInfo?.geoLocation?.geogLocation?.longitude ?? lng,
      }]
    })
  } catch { return [] }
}

// Monthly average surface water temps (°F) for TX and OK reservoirs.
// TX = central TX baseline (~lat 32–33°N); OK = central OK (~lat 35°N).
// Source: long-term USGS/TWDB reservoir averages.
const MONTHLY_WATER_TEMP_F: Record<string, number[]> = {
  TX: [54, 56, 63, 71, 78, 84, 87, 87, 83, 74, 63, 56],
  OK: [45, 48, 56, 64, 72, 80, 84, 84, 78, 67, 55, 47],
}

// Estimate water temp when no sensor data is available.
// Blends seasonal baseline (75%) with current air temp (25%) to account
// for the lag between air and water temperature change.
function estimateWaterTempF(airTempF: number, month: number, state: string): number {
  const bases = MONTHLY_WATER_TEMP_F[state] ?? MONTHLY_WATER_TEMP_F.TX
  const base = bases[month - 1]
  return Math.round(base * 0.75 + airTempF * 0.25)
}

// Fetch wind + air temp from Open-Meteo in a single request
async function fetchWeatherData(lat: number, lng: number): Promise<{ wind: WindData | null; airTempF: number | null }> {
  try {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&wind_speed_unit=mph&temperature_unit=fahrenheit`
    const data = await fetch(url, { next: { revalidate: 900 } }).then(r => r.ok ? r.json() : null)
    if (!data?.current) return { wind: null, airTempF: null }
    const { wind_speed_10m: spd, wind_direction_10m: dir, wind_gusts_10m: gust, temperature_2m: airTemp } = data.current
    return {
      wind: {
        speedMph: Math.round(spd),
        directionDeg: dir,
        directionLabel: toCompass(dir),
        gustsMph: Math.round(gust),
      },
      airTempF: airTemp != null ? Math.round(airTemp) : null,
    }
  } catch { return { wind: null, airTempF: null } }
}

export async function getLakeConditions(
  wdftSlug: string | null,
  lat: number,
  lng: number,
  usgsLakeSiteNo?: string | null,
  cwmsLocationCode?: string | null,
  cwmsOffice?: string | null,
  state?: string | null,
): Promise<LakeConditions> {
  const [waterLevel, inflows, weatherData] = await Promise.all([
    wdftSlug          ? fetchWdftLevel(wdftSlug)                                       :
    cwmsLocationCode  ? fetchCwmsLevel(cwmsLocationCode, cwmsOffice ?? 'SWT')          :
    usgsLakeSiteNo    ? fetchUsgsLakeLevel(usgsLakeSiteNo)                             : null,
    fetchInflows(lat, lng),
    fetchWeatherData(lat, lng),
  ])

  const { wind, airTempF } = weatherData

  // Water temp: measured sensor not yet available for most lakes.
  // Fall back to estimation from air temp + seasonal baseline when possible.
  const measuredWaterTempF: number | null = null  // placeholder for future USGS 00010 integration
  let waterTempF: number | null = measuredWaterTempF
  let waterTempSource: LakeConditions['waterTempSource'] = measuredWaterTempF !== null ? 'measured' : null

  if (waterTempF === null && airTempF !== null) {
    const month = new Date().getMonth() + 1
    waterTempF = estimateWaterTempF(airTempF, month, state ?? 'TX')
    waterTempSource = 'estimated'
  }

  return { waterLevel, inflows, wind, waterTempF, waterTempSource }
}

// OSM name aliases for lakes whose common name differs significantly from OSM
const OSM_ALIASES: Record<string, string> = {
  'Lake LBJ':             'Lake Lyndon B. Johnson',
  'Lake B.A. Steinhagen': 'B.A. Steinhagen Lake',
  'Moss Lake':            'Hubert M. Moss Lake',
}

// Paired lakes — when one is searched, also show the other's polygon on the map
const LAKE_PAIRS: Record<string, string[]> = {
  'Lake Graham':    ['Lake Eddleman'],
  'Lake Eddleman':  ['Lake Graham'],
  'Lake Tyler':     ['Lake Tyler East'],
  'Lake Tyler East':['Lake Tyler'],
}

// OSM waterways (flowlines) + Nominatim waterbody polygon
export async function getLakeFeatures(lat: number, lng: number, lakeName?: string, state?: string, radiusDeg = 0.35) {
  // Rivers are linear features — no polygon expected, just center map on coords
  const isRiver = /\briver\b/i.test(lakeName ?? '')

  // Waterbody polygon first — use its bounds for the flowlines bbox when available
  let waterbodies = null
  if (lakeName && !isRiver) {
    try {
      const alias = OSM_ALIASES[lakeName]
      const core = lakeName.replace(/^Lake\s+/i, '').replace(/\s+(Lake|Reservoir)$/i, '').trim()
      const s = state ?? ''
      const queries = alias
        ? [`${alias} ${s}`.trim(), `${lakeName} ${s}`.trim()]
        : [
            `${lakeName} ${s}`.trim(),
            `${core} Lake ${s}`.trim(),
            `${core} Reservoir ${s}`.trim(),
            `${core} ${s}`.trim(),
          ].filter((q, i, arr) => arr.indexOf(q) === i)

      for (const query of queries) {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5`
        const res = await fetch(url, { headers: { 'User-Agent': 'AnglerIQ/1.0 (angleriq.app)' }, next: { revalidate: 86400 } })
        if (!res.ok) continue
        const results = (await res.json() as any[])
          .filter(r => r.geojson?.type === 'Polygon' || r.geojson?.type === 'MultiPolygon')
          .filter(r => !['administrative', 'park', 'hamlet', 'village', 'town', 'city'].includes(r.type))
        const MIN_AREA = 0.0001   // ~1 km² minimum — catches smaller reservoirs like Eddleman
        const MAX_DIST_DEG = 1.5
        const valid = results.filter(r => {
          const bb = r.boundingbox
          if (!bb) return false
          const area = (parseFloat(bb[1]) - parseFloat(bb[0])) * (parseFloat(bb[3]) - parseFloat(bb[2]))
          if (area < MIN_AREA) return false
          const dist = Math.sqrt((parseFloat(r.lat) - lat) ** 2 + (parseFloat(r.lon) - lng) ** 2)
          return dist <= MAX_DIST_DEG
        })
        if (!valid.length) continue
        waterbodies = {
          type: 'FeatureCollection',
          features: valid.map(r => ({ type: 'Feature', geometry: r.geojson, properties: { name: r.display_name, osm_id: r.osm_id } }))
        }
        break
      }
    } catch { /* Nominatim unavailable */ }

    // Fetch paired lake polygons (e.g. Lake Graham + Lake Eddleman, Lake Tyler + Lake Tyler East)
    const pairs = lakeName ? (LAKE_PAIRS[lakeName] ?? []) : []
    for (const pairName of pairs) {
      try {
        const pCore = pairName.replace(/^Lake\s+/i,'').replace(/\s+(Lake|Reservoir)$/i,'').trim()
        const pS = state ?? ''
        const pQueries = [`${pairName} ${pS}`.trim(), `${pCore} Lake ${pS}`.trim(), `${pCore} ${pS}`.trim()]
        for (const pq of pQueries) {
          const pRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pq)}&format=json&polygon_geojson=1&limit=3`,
            { headers: { 'User-Agent': 'AnglerIQ/1.0 (angleriq.app)' }, next: { revalidate: 86400 } }
          )
          if (!pRes.ok) continue
          const pResults = (await pRes.json() as any[])
            .filter(r => r.geojson?.type === 'Polygon' || r.geojson?.type === 'MultiPolygon')
            .filter(r => !['administrative','park','hamlet','village','town','city'].includes(r.type))
            .filter(r => { const bb = r.boundingbox; return bb && (parseFloat(bb[1])-parseFloat(bb[0]))*(parseFloat(bb[3])-parseFloat(bb[2])) >= 0.0005 })
          if (!pResults.length) continue
          const pFeatures = pResults.map(r => ({ type: 'Feature', geometry: r.geojson, properties: { name: r.display_name } }))
          if (waterbodies) waterbodies.features.push(...pFeatures)
          else waterbodies = { type: 'FeatureCollection', features: pFeatures }
          break
        }
      } catch { /* ignore pair fetch failure */ }
    }
  }

  // Use polygon bounds for flowlines bbox — covers the whole lake on large reservoirs
  // Fall back to fixed radiusDeg around center coords
  let flowBbox: string
  if (waterbodies?.features?.length) {
    try {
      const allCoords: number[][] = waterbodies.features.flatMap((f: any) => {
        const coords: number[] = f.geometry?.coordinates?.flat(Infinity) ?? []
        const pairs: number[][] = []
        for (let i = 0; i < coords.length; i += 2) pairs.push([coords[i], coords[i + 1]])
        return pairs
      })
      const lngs = allCoords.map(c => c[0]), lats = allCoords.map(c => c[1])
      const pad = 0.1
      flowBbox = `${Math.min(...lngs)-pad},${Math.min(...lats)-pad},${Math.max(...lngs)+pad},${Math.max(...lats)+pad}`
    } catch {
      flowBbox = `${lng-radiusDeg},${lat-radiusDeg},${lng+radiusDeg},${lat+radiusDeg}`
    }
  } else {
    flowBbox = `${lng-radiusDeg},${lat-radiusDeg},${lng+radiusDeg},${lat+radiusDeg}`
  }

  // Waterways are fetched client-side in LakeMap.tsx via Overpass to avoid
  // Vercel server-IP blocks. Return the flowBbox so the client knows where to query.
  const [fMinLng, fMinLat, fMaxLng, fMaxLat] = flowBbox.split(',').map(Number)
  const waterwayBbox = { minLat: fMinLat, minLng: fMinLng, maxLat: fMaxLat, maxLng: fMaxLng }

  return { flowlines: null, waterbodies, waterwayBbox }
}
