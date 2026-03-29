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

// Lake features: flowlines from NHD (authoritative stream data) + polygon from Nominatim/OSM
// NOTE: NHD large-scale waterbody data (layer 12) is incomplete for TX reservoirs — many are
// placeholder points only. Nominatim/OSM has full polygon coverage for named TX lakes.
export async function getLakeFeatures(lat: number, lng: number, lakeName?: string, state?: string, radiusDeg = 0.18) {
  const xmin = lng - radiusDeg, ymin = lat - radiusDeg
  const xmax = lng + radiusDeg, ymax = lat + radiusDeg
  const bbox = `${xmin},${ymin},${xmax},${ymax}`
  const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer'

  // Flowlines from NHD layer 6 (streams/rivers feeding the lake) — reliable for all states
  const flowlinesResult = await fetch(
    `${BASE}/6/query?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,FLOWDIR,LENGTHKM&returnGeometry=true&f=geojson`,
    { next: { revalidate: 3600 } }
  ).then(r => r.ok ? r.json() : null).catch(() => null)

  // Waterbody polygon from Nominatim/OSM — best coverage for TX reservoirs
  // Strategy: try exact name first; if only tiny results (<0.001 deg² bbox), try "Reservoir" suffix
  let waterbodies = null
  if (lakeName) {
    try {
      const queries = [
        state ? `${lakeName} ${state}` : lakeName,
        // Fallback: try with "Reservoir" suffix for lakes that OSM names differently
        state ? `${lakeName} Reservoir ${state}` : `${lakeName} Reservoir`,
      ]

      for (const query of queries) {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'AnglerIQ/1.0 (angleriq.app)' },
          next: { revalidate: 3600 },
        })
        if (!res.ok) continue

        const results = (await res.json() as any[])
          .filter(r => r.geojson?.type === 'Polygon' || r.geojson?.type === 'MultiPolygon')

        // Minimum bbox area to exclude ponds (~0.001 deg² ≈ a few km²)
        function bboxArea(r: any): number {
          const bb = r.boundingbox
          if (!bb || bb.length < 4) return 0
          return (parseFloat(bb[1]) - parseFloat(bb[0])) * (parseFloat(bb[3]) - parseFloat(bb[2]))
        }

        const valid = results.filter(r => bboxArea(r) >= 0.001)
        if (valid.length === 0) continue // Nothing useful — try next query

        // Among valid results, pick closest centroid to our known coordinates
        const best = valid.sort((a, b) => {
          const dA = (parseFloat(a.lat) - lat) ** 2 + (parseFloat(a.lon) - lng) ** 2
          const dB = (parseFloat(b.lat) - lat) ** 2 + (parseFloat(b.lon) - lng) ** 2
          return dA - dB
        })[0]

        if (best?.geojson) {
          waterbodies = {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: best.geojson, properties: { name: best.display_name, osm_id: best.osm_id } }],
          }
          break // Found a good polygon — stop
        }

        await new Promise(r => setTimeout(r, 300)) // Nominatim rate limit
      }
    } catch {
      // Nominatim unavailable — map shows without polygon overlay
    }
  }

  return { flowlines: flowlinesResult, waterbodies }
}
