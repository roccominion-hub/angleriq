/**
 * Lake conditions data fetching
 * Sources: USGS NWIS (water level, streamflow, temp), Open-Meteo (wind)
 */

export interface LakeConditions {
  waterLevel: {
    valueFt: number
    dateTime: string
    trend: 'rising' | 'falling' | 'stable'
    deltaft: number          // change over last 24h
    conservationPoolFt?: number
    percentFull?: number
  } | null
  inflows: {
    siteName: string
    siteNo: string
    flowCfs: number
    dateTime: string
    lat: number
    lng: number
  }[]
  waterTemp: {
    valueFahrenheit: number
    dateTime: string
  } | null
  wind: {
    speedMph: number
    directionDeg: number
    directionLabel: string
    gusts?: number
  } | null
}

const USGS_IV = 'https://waterservices.usgs.gov/nwis/iv'
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'

function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

async function fetchUSGS(params: Record<string, string>): Promise<any> {
  const url = new URL(USGS_IV)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { next: { revalidate: 900 } }) // 15 min cache
  if (!res.ok) return null
  return res.json()
}

export async function getLakeConditions(
  usgsSiteNo: string | null,
  lat: number,
  lng: number,
): Promise<LakeConditions> {
  const results: LakeConditions = { waterLevel: null, inflows: [], waterTemp: null, wind: null }

  // ── Water level + temp from USGS lake gage ──────────────────────────────
  if (usgsSiteNo) {
    try {
      // Get current + 24h ago for trend
      const now = new Date()
      const yesterday = new Date(now.getTime() - 86400000)
      const isoYesterday = yesterday.toISOString().split('.')[0]

      const data = await fetchUSGS({
        sites: usgsSiteNo,
        parameterCd: '00062,00010', // elevation + water temp
        startDT: isoYesterday,
      })

      if (data?.value?.timeSeries) {
        for (const ts of data.value.timeSeries) {
          const paramCode = ts.variable?.variableCode?.[0]?.value
          const values = ts.values?.[0]?.value ?? []
          if (!values.length) continue

          const latest = values[values.length - 1]
          const oldest = values[0]

          if (paramCode === '00062') {
            const current = parseFloat(latest.value)
            const prior = parseFloat(oldest.value)
            const delta = current - prior
            results.waterLevel = {
              valueFt: Math.round(current * 100) / 100,
              dateTime: latest.dateTime,
              deltaft: Math.round(delta * 100) / 100,
              trend: delta > 0.05 ? 'rising' : delta < -0.05 ? 'falling' : 'stable',
            }
          }

          if (paramCode === '00010') {
            const celsius = parseFloat(latest.value)
            if (!isNaN(celsius)) {
              results.waterTemp = {
                valueFahrenheit: Math.round(celsius * 9 / 5 + 32),
                dateTime: latest.dateTime,
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('USGS lake gage error:', e)
    }

    // ── Inflow streamflow — upstream gages within ~50km ─────────────────
    try {
      const bbox = `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`
      const siteData = await fetch(
        `https://waterservices.usgs.gov/nwis/site/?bBox=${bbox}&siteType=ST&format=json&siteStatus=active&hasDataTypeCd=iv`,
        { next: { revalidate: 3600 } }
      ).then(r => r.ok ? r.json() : null)

      if (siteData?.value?.timeSeries || siteData?.sites) {
        const siteNos = (siteData.sites || [])
          .slice(0, 5)
          .map((s: any) => s.site_no)
          .join(',')

        if (siteNos) {
          const flowData = await fetchUSGS({ sites: siteNos, parameterCd: '00060' })
          for (const ts of flowData?.value?.timeSeries ?? []) {
            const values = ts.values?.[0]?.value ?? []
            if (!values.length) continue
            const latest = values[values.length - 1]
            const flow = parseFloat(latest.value)
            if (isNaN(flow) || flow < 0) continue
            results.inflows.push({
              siteName: ts.sourceInfo?.siteName ?? 'Unknown Stream',
              siteNo: ts.sourceInfo?.siteCode?.[0]?.value ?? '',
              flowCfs: Math.round(flow),
              dateTime: latest.dateTime,
              lat: ts.sourceInfo?.geoLocation?.geogLocation?.latitude ?? lat,
              lng: ts.sourceInfo?.geoLocation?.geogLocation?.longitude ?? lng,
            })
          }
        }
      }
    } catch (e) {
      console.error('USGS inflow error:', e)
    }
  }

  // ── Wind from Open-Meteo ──────────────────────────────────────────────
  try {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph`
    const wind = await fetch(url, { next: { revalidate: 900 } }).then(r => r.ok ? r.json() : null)
    if (wind?.current) {
      const { wind_speed_10m, wind_direction_10m, wind_gusts_10m } = wind.current
      results.wind = {
        speedMph: Math.round(wind_speed_10m),
        directionDeg: wind_direction_10m,
        directionLabel: degToCompass(wind_direction_10m),
        gusts: Math.round(wind_gusts_10m),
      }
    }
  } catch (e) {
    console.error('Wind fetch error:', e)
  }

  return results
}

// ── NHD structural features ──────────────────────────────────────────────────
export async function getLakeFeatures(lat: number, lng: number, radiusDeg = 0.15) {
  const xmin = lng - radiusDeg, ymin = lat - radiusDeg
  const xmax = lng + radiusDeg, ymax = lat + radiusDeg
  const bbox = `${xmin},${ymin},${xmax},${ymax}`

  const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer'

  // Layer 6 = Flowlines (streams/rivers), Layer 8 = Waterbodies
  const [flowlines, waterbodies] = await Promise.allSettled([
    fetch(`${BASE}/6/query?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,LENGTHKM&returnGeometry=true&f=geojson`, { next: { revalidate: 86400 } })
      .then(r => r.ok ? r.json() : null),
    fetch(`${BASE}/8/query?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=GNIS_NAME,FTYPE,AREASQKM&returnGeometry=true&f=geojson`, { next: { revalidate: 86400 } })
      .then(r => r.ok ? r.json() : null),
  ])

  return {
    flowlines: flowlines.status === 'fulfilled' ? flowlines.value : null,
    waterbodies: waterbodies.status === 'fulfilled' ? waterbodies.value : null,
  }
}
