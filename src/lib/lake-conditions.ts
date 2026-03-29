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

// OSM name aliases for lakes whose common name differs significantly from OSM
const OSM_ALIASES: Record<string, string> = {
  'Lake LBJ':             'Lake Lyndon B. Johnson',
  'Lake B.A. Steinhagen': 'B.A. Steinhagen Lake',
}

// Paired lakes — when one is searched, also show the other's polygon on the map
const LAKE_PAIRS: Record<string, string[]> = {
  'Lake Graham':    ['Lake Eddleman'],
  'Lake Eddleman':  ['Lake Graham'],
  'Lake Tyler':     ['Lake Tyler East'],
  'Lake Tyler East':['Lake Tyler'],
}

// NHD structural features (flowlines) + Nominatim waterbody polygon
export async function getLakeFeatures(lat: number, lng: number, lakeName?: string, state?: string, radiusDeg = 0.35) {
  const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer'

  // Waterbody polygon first — use its bounds for the flowlines bbox when available
  let waterbodies = null
  if (lakeName) {
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
        const MIN_AREA = 0.001
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
            .filter(r => { const bb = r.boundingbox; return bb && (parseFloat(bb[1])-parseFloat(bb[0]))*(parseFloat(bb[3])-parseFloat(bb[2])) >= 0.001 })
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

  // Flowlines from NHD covering the full lake extent
  const flowlinesResult = await fetch(
    `${BASE}/6/query?geometry=${flowBbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,FLOWDIR,LENGTHKM&returnGeometry=true&resultRecordCount=5000&f=geojson`,
    { next: { revalidate: 3600 } }
  ).then(r => r.ok ? r.json() : null).catch(() => null)

  return { flowlines: flowlinesResult, waterbodies }
}
