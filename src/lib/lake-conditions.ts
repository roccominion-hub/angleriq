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
}

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'
const WDFT_BASE  = 'https://www.waterdatafortexas.org/reservoirs/individual'
const USGS_IV    = 'https://waterservices.usgs.gov/nwis/iv'

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
function toCompass(deg: number) { return COMPASS[Math.round(deg / 22.5) % 16] }

// Parse WDFT 30-day CSV for water level + trend
async function fetchWdftLevel(slug: string): Promise<WaterLevel | null> {
  try {
    const res = await fetch(`${WDFT_BASE}/${slug}-30day.csv`, { next: { revalidate: 3600 } })
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
      { next: { revalidate: 900 } }
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

// Fetch inflow gauges from USGS (stream gages near lake)
async function fetchInflows(lat: number, lng: number): Promise<InflowGauge[]> {
  try {
    const pad = 0.4
    const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`
    const siteRes = await fetch(
      `https://waterservices.usgs.gov/nwis/site/?bBox=${bbox}&siteType=ST&format=rdb&siteStatus=active&hasDataTypeCd=iv`,
      { next: { revalidate: 3600 } }
    )
    if (!siteRes.ok) return []
    const txt = await siteRes.text()
    const siteNos = txt.split('\n')
      .filter(l => !l.startsWith('#') && !l.startsWith('agency') && !l.match(/^\d+s/) && l.trim())
      .map(l => l.split('\t')[1])
      .filter(Boolean)
      .slice(0, 8)

    if (!siteNos.length) return []

    const flowRes = await fetch(
      `${USGS_IV}/?sites=${siteNos.join(',')}&parameterCd=00060&format=json`,
      { next: { revalidate: 900 } }
    )
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

// Fetch wind from Open-Meteo
async function fetchWind(lat: number, lng: number): Promise<WindData | null> {
  try {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph`
    const data = await fetch(url, { next: { revalidate: 900 } }).then(r => r.ok ? r.json() : null)
    if (!data?.current) return null
    const { wind_speed_10m: spd, wind_direction_10m: dir, wind_gusts_10m: gust } = data.current
    return {
      speedMph: Math.round(spd),
      directionDeg: dir,
      directionLabel: toCompass(dir),
      gustsMph: Math.round(gust),
    }
  } catch { return null }
}

export async function getLakeConditions(
  wdftSlug: string | null,
  lat: number,
  lng: number,
): Promise<LakeConditions> {
  const [waterLevel, inflows, wind] = await Promise.all([
    wdftSlug ? fetchWdftLevel(wdftSlug) : null,
    fetchInflows(lat, lng),
    fetchWind(lat, lng),
  ])
  return { waterLevel, inflows, wind, waterTempF: null }
}

// NHD structural features (flowlines + waterbody polygon) — USGS is source of truth
export async function getLakeFeatures(lat: number, lng: number, lakeName?: string, _state?: string, radiusDeg = 0.25) {
  const xmin = lng - radiusDeg, ymin = lat - radiusDeg
  const xmax = lng + radiusDeg, ymax = lat + radiusDeg
  const bbox = `${xmin},${ymin},${xmax},${ymax}`
  const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer'

  // Fetch flowlines (layer 6) and waterbodies (layer 8) in parallel
  const [flowlinesResult, wbResult] = await Promise.all([
    fetch(
      `${BASE}/6/query?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,FLOWDIR,LENGTHKM&returnGeometry=true&f=geojson`,
      { next: { revalidate: 3600 } }
    ).then(r => r.ok ? r.json() : null).catch(() => null),

    fetch(
      `${BASE}/8/query?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,AREASQKM&returnGeometry=true&f=geojson`,
      { next: { revalidate: 3600 } }
    ).then(r => r.ok ? r.json() : null).catch(() => null),
  ])

  // Pick the best waterbody feature from NHD results:
  // 1. Name match on GNIS_NAME (case-insensitive, partial ok)
  // 2. Fallback: largest area polygon closest to our known coords
  let waterbodies = null
  const features: any[] = wbResult?.features ?? []

  if (features.length > 0) {
    const nameClean = (lakeName ?? '').toLowerCase().replace(/^lake\s+/i, '').replace(/\s+(lake|reservoir)$/i, '').trim()

    // Score each feature: name match = big bonus, then proximity, then area
    const scored = features.map((f: any) => {
      const gnisName: string = (f.properties?.GNIS_NAME ?? '').toLowerCase()
      const nameSim = gnisName.includes(nameClean) || nameClean.split(' ').every((w: string) => gnisName.includes(w)) ? 1000 : 0
      const area: number = f.properties?.AREASQKM ?? 0
      // centroid approx from flattened coordinate pairs
      const coords: number[] = (f.geometry?.coordinates?.flat(Infinity) as number[]) ?? []
      const lngs = coords.filter((_: number, i: number) => i % 2 === 0)
      const lats = coords.filter((_: number, i: number) => i % 2 === 1)
      const clat = lats.length ? lats.reduce((a: number, b: number) => a + b, 0) / lats.length : lat
      const clng = lngs.length ? lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length : lng
      const dist = Math.sqrt((clat - lat) ** 2 + (clng - lng) ** 2)
      return { f, score: nameSim + area - dist * 10 }
    })

    const best = scored.sort((a: any, b: any) => b.score - a.score)[0]?.f
    if (best) {
      waterbodies = { type: 'FeatureCollection', features: [best] }
    }
  }

  return {
    flowlines: flowlinesResult,
    waterbodies,
  }
}
