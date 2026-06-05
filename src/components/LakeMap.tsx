'use client'
import { useEffect, useRef, useState } from 'react'
import { Navigation, Droplets } from 'lucide-react'

interface LakeMapProps {
  lakeId: string
  lakeName: string
  lat: number
  lng: number
}

type BaseLayer = 'satellite' | 'topo'
type OverlayKey = 'flowlines' | 'wind' | 'ramps'

const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
}

function TrendBadge({ trend, delta }: { trend: string; delta: number }) {
  const color = trend === 'rising' ? 'text-green-400' : trend === 'falling' ? 'text-red-400' : 'text-slate-400'
  const arrow = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '—'
  return (
    <span className={`text-xs font-bold ${color}`}>
      {arrow} {Math.abs(delta).toFixed(2)} ft/24h
    </span>
  )
}

function windIconRotation(fromDeg: number) {
  return (fromDeg + 180) % 360
}

function degreesPerPixel(zoom: number): number {
  return 360 / (256 * Math.pow(2, zoom))
}

function windStepForZoom(zoom: number): number {
  return Math.min(degreesPerPixel(zoom) * 52, 0.028)
}

// Rate inflows relative to the highest-flow gauge on this lake
type InflowRating = 'high' | 'medium' | 'low'
function rateInflow(flowCfs: number, maxCfs: number): InflowRating {
  if (maxCfs === 0) return 'low'
  const pct = flowCfs / maxCfs
  if (pct >= 0.5) return 'high'
  if (pct >= 0.15) return 'medium'
  return 'low'
}

const RATING_COLORS: Record<InflowRating, { bg: string; border: string; text: string }> = {
  high:   { bg: '#166534', border: '#16a34a', text: '#bbf7d0' },
  medium: { bg: '#92400e', border: '#d97706', text: '#fde68a' },
  low:    { bg: '#3b0764', border: '#a855f7', text: '#e9d5ff' },
}

// Shorten USGS site name to just the stream name (strip "nr XYZ" / "at XYZ" etc.)
function shortName(siteName: string): string {
  return siteName.replace(/\s+(nr|near|at|ab|above|bl|below|bel)\s+.*/i, '').trim()
}

// Find the point on the lake polygon boundary closest to the gauge.
// This is the shoreline entry point for this stream — no dependency on
// whether the lake center is inside the polygon, works for any geometry.
function closestShorelinePoint(
  gaugeLat: number,
  gaugeLng: number,
  lakePolygons: number[][][],
  fallbackLat: number,
  fallbackLng: number,
): [number, number] {
  if (!lakePolygons.length) return [fallbackLat, fallbackLng]

  let best: [number, number] = [fallbackLat, fallbackLng]
  let minDist = Infinity

  for (const ring of lakePolygons) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i]       // [lng, lat] in GeoJSON
      const [x2, y2] = ring[i + 1]

      // Project gauge onto this edge segment, clamped to [0,1]
      const dx = x2 - x1, dy = y2 - y1
      const len2 = dx * dx + dy * dy
      const t = len2 > 0
        ? Math.max(0, Math.min(1, ((gaugeLng - x1) * dx + (gaugeLat - y1) * dy) / len2))
        : 0

      const cLng = x1 + t * dx
      const cLat = y1 + t * dy
      const d = Math.hypot(cLat - gaugeLat, cLng - gaugeLng)

      if (d < minDist) { minDist = d; best = [cLat, cLng] }
    }
  }

  return best
}

export function LakeMap({ lakeId, lakeName, lat, lng }: LakeMapProps) {
  const mapRef = useRef<any>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const [conditions, setConditions] = useState<any>(null)
  const [features, setFeatures] = useState<any>(null)
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('topo')
  const [overlays, setOverlays] = useState<Set<OverlayKey>>(new Set(['flowlines']))
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(13)
  const [mapReady, setMapReady] = useState(false)

  // Inflow interaction state
  const [selectedInflow, setSelectedInflow] = useState<string | null>(null)

  const windLayerRef         = useRef<any>(null)
  const tileLayerRef         = useRef<any>(null)
  const waterbodyLayerRef    = useRef<any>(null)
  const rampsLayerRef        = useRef<any>(null)
  const rampsDataRef         = useRef<any[] | null>(null)
  const nhdLayerRef          = useRef<any>(null)
  const inflowMarkersRef     = useRef<Map<string, any>>(new Map())  // siteNo → L.Marker
  const inflowStreamLayerRef = useRef<any>(null)
  const originalBoundsRef    = useRef<any>(null)  // saved after initial fitBounds
  const inflowGeoCacheRef    = useRef<Map<string, [number,number][][]>>(new Map()) // siteNo → geometry

  // Fetch conditions + features
  useEffect(() => {
    Promise.all([
      fetch(`/api/lake-conditions?lakeId=${lakeId}`).then(r => r.json()),
      fetch(`/api/lake-features?lakeId=${lakeId}`).then(r => r.json()),
    ]).then(([cond, feat]) => {
      setConditions(cond)
      setFeatures(feat)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [lakeId])

  // Init map + waterbody fill
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current || !features) return
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })

      const map = L.map(mapDivRef.current!, { center: [lat, lng], zoom: 13, zoomControl: true })
      map.attributionControl.setPrefix('')
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.topo.url, {
        attribution: TILE_LAYERS.topo.attribution, maxZoom: 19,
      }).addTo(map)

      map.on('zoomend', () => setZoom(map.getZoom()))
      mapRef.current = map
      setMapReady(true)

      const wb = features?.waterbodies
      if (wb?.features?.length) {
        waterbodyLayerRef.current = L.geoJSON(wb, {
          style: { fillColor: '#7dd3fc', fillOpacity: 0.35, color: '#38bdf8', weight: 2, opacity: 0.9 },
          interactive: false,
        }).addTo(map)

        const bounds = waterbodyLayerRef.current.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 })
          originalBoundsRef.current = bounds  // save for restoring after inflow deselect
          setZoom(map.getZoom())
        }
      }
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [lat, lng, features])

  // NHD stream overlay
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    import('leaflet').then(L => {
      const opacity = baseLayer === 'topo' ? 0.95 : 0.75
      if (overlays.has('flowlines')) {
        if (!nhdLayerRef.current) {
          nhdLayerRef.current = L.tileLayer(
            'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}',
            { attribution: 'USGS NHD', opacity, maxZoom: 19, minZoom: 8 }
          ).addTo(mapRef.current)
        } else {
          nhdLayerRef.current.setOpacity(opacity)
        }
      } else {
        nhdLayerRef.current?.remove()
        nhdLayerRef.current = null
      }
    })
  }, [overlays, mapReady, baseLayer])

  // Wind arrows
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(L => {
      windLayerRef.current?.remove()
      windLayerRef.current = null
      if (!overlays.has('wind') || !conditions?.conditions?.wind) return

      const wind = conditions.conditions.wind
      const rotation = windIconRotation(wind.directionDeg)
      const group = L.layerGroup()

      const lakePolygons: number[][][] = []
      if (features?.waterbodies?.features) {
        for (const f of features.waterbodies.features) {
          const geom = f.geometry
          if (geom?.type === 'Polygon') lakePolygons.push(geom.coordinates[0])
          if (geom?.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) lakePolygons.push(poly[0])
          }
        }
      }

      function inPolygon(px: number, py: number, ring: number[][]): boolean {
        let inside = false
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i], [xj, yj] = ring[j]
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
        }
        return inside
      }
      function inAnyLake(lng: number, lat: number): boolean {
        if (!lakePolygons.length) return true
        return lakePolygons.some(ring => inPolygon(lng, lat, ring))
      }

      const bounds = features?.waterbodies?.features?.length
        ? L.geoJSON(features.waterbodies).getBounds()
        : mapRef.current.getBounds()
      if (!bounds?.isValid?.()) return

      const step = windStepForZoom(zoom)
      const swLat = bounds.getSouth(), neLat = bounds.getNorth()
      const swLng = bounds.getWest(),  neLng = bounds.getEast()
      const arrowColor = baseLayer === 'topo' ? '#7e22ce' : '#c084fc'
      const arrowHtml = `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${arrowColor}" opacity="0.9">
          <path d="M12 3L7 12h10L12 3z"/>
          <rect x="11" y="12" width="2" height="9" fill="${arrowColor}"/>
        </svg>
      </div>`

      for (let plat = swLat; plat <= neLat; plat += step) {
        for (let plng = swLng; plng <= neLng; plng += step) {
          if (!inAnyLake(plng, plat)) continue
          const icon = L.divIcon({ className: '', html: arrowHtml, iconSize: [24, 24], iconAnchor: [12, 12] })
          L.marker([plat, plng], { icon, interactive: false }).addTo(group)
        }
      }
      windLayerRef.current = group.addTo(mapRef.current)
    })
  }, [conditions, features, overlays, baseLayer, zoom, mapReady])

  // Inflow markers — colored dot at the lake-edge entry point for each gauge.
  // Uses the lake polygon (already loaded) to find where each stream enters —
  // no Overpass call needed.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !conditions?.conditions?.inflows?.length || !features) return
    const inflows: any[] = conditions.conditions.inflows.slice(0, 6)
    const maxCfs = Math.max(...inflows.map((f: any) => f.flowCfs))
    const map = mapRef.current

    // Extract lake polygon rings for edge detection
    const lakePolygons: number[][][] = []
    if (features?.waterbodies?.features) {
      for (const f of features.waterbodies.features) {
        const geom = f.geometry
        if (geom?.type === 'Polygon') lakePolygons.push(geom.coordinates[0])
        if (geom?.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) lakePolygons.push(poly[0])
        }
      }
    }

    import('leaflet').then(L => {
      inflowMarkersRef.current.forEach(m => m.remove())
      inflowMarkersRef.current.clear()

      for (const inflow of inflows) {
        const [eLat, eLng] = closestShorelinePoint(inflow.lat, inflow.lng, lakePolygons, lat, lng)
        const rating = rateInflow(inflow.flowCfs, maxCfs)
        const c = RATING_COLORS[rating]

        // Large transparent circle — communicates approximate area, not false precision
        const circle = L.circle([eLat, eLng], {
          radius: 350,
          color: c.border,
          fillColor: c.border,
          fillOpacity: 0.12,
          weight: 1.5,
          opacity: 0.5,
        }).bindPopup(`<b>${shortName(inflow.siteName)}</b><br>${inflow.flowCfs.toLocaleString()} cfs`)
          .addTo(map)
        inflowMarkersRef.current.set(inflow.siteNo, circle)
      }
    })
  }, [conditions, mapReady, features])

  // Handle inflow selection — place a pulsing marker at the lake-edge entry
  // point and zoom to it. No external API call — uses the lake polygon only.
  function handleInflowSelect(inflow: any) {
    const map = mapRef.current
    if (!map) return

    // Toggle off — remove highlight and restore original lake view
    if (selectedInflow === inflow.siteNo) {
      inflowStreamLayerRef.current?.remove()
      inflowStreamLayerRef.current = null
      setSelectedInflow(null)
      if (originalBoundsRef.current) {
        map.fitBounds(originalBoundsRef.current, { padding: [20, 20], maxZoom: 14 })
      }
      return
    }

    setSelectedInflow(inflow.siteNo)
    inflowStreamLayerRef.current?.remove()
    inflowStreamLayerRef.current = null

    // Extract lake polygon rings
    const lakePolygons: number[][][] = []
    if (features?.waterbodies?.features) {
      for (const f of features.waterbodies.features) {
        const geom = f.geometry
        if (geom?.type === 'Polygon') lakePolygons.push(geom.coordinates[0])
        if (geom?.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) lakePolygons.push(poly[0])
        }
      }
    }

    const [eLat, eLng] = closestShorelinePoint(inflow.lat, inflow.lng, lakePolygons, lat, lng)
    const rating = rateInflow(inflow.flowCfs, maxCfs)
    const c = RATING_COLORS[rating]

    // Two-ring selected highlight: large transparent area + solid border
    import('leaflet').then(L => {
      const group = L.layerGroup()

      // Outer fill — large soft area indicator
      L.circle([eLat, eLng], {
        radius: 500,
        color: c.border,
        fillColor: c.border,
        fillOpacity: 0.18,
        weight: 0,
        interactive: false,
      }).addTo(group)

      // Solid border ring — shows the selected state clearly
      L.circle([eLat, eLng], {
        radius: 500,
        color: c.border,
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 2.5,
        opacity: 0.9,
        interactive: false,
      }).addTo(group)

      inflowStreamLayerRef.current = group.addTo(map)
      map.setView([eLat, eLng], 14)
    })
  }

  // Boat ramps
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    import('leaflet').then(async L => {
      if (!overlays.has('ramps')) {
        rampsLayerRef.current?.remove()
        rampsLayerRef.current = null
        return
      }

      if (!rampsDataRef.current) {
        try {
          const wb = features?.waterwayBbox
          const bbox = wb
            ? `${wb.minLat},${wb.minLng},${wb.maxLat},${wb.maxLng}`
            : `${lat - 0.3},${lng - 0.3},${lat + 0.3},${lng + 0.3}`

          const query = `[out:json][timeout:15];(node["leisure"="slipway"](${bbox});way["leisure"="slipway"](${bbox}););out center tags;`
          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST', body: query, signal: AbortSignal.timeout(15000),
          })
          const data = await res.json()
          rampsDataRef.current = (data.elements ?? []).filter((el: any) => el.tags?.access !== 'private')
        } catch {
          rampsDataRef.current = []
        }
      }

      const group = L.layerGroup()
      for (const el of rampsDataRef.current!) {
        const rlat = el.lat ?? el.center?.lat
        const rlng = el.lon ?? el.center?.lon
        if (!rlat || !rlng) continue

        const name     = el.tags?.name ?? 'Boat Ramp'
        const feeStr   = el.tags?.fee === 'yes' ? ' · Fee required' : el.tags?.fee === 'no' ? ' · Free' : ''
        const operator = el.tags?.operator ? `<br><span style="color:#6b7280;font-size:11px">${el.tags.operator}</span>` : ''
        const surface  = el.tags?.surface  ? `<br><span style="color:#6b7280;font-size:11px">Surface: ${el.tags.surface}</span>` : ''
        const mapsUrl  = `https://www.google.com/maps/dir/?api=1&destination=${rlat},${rlng}&travelmode=driving`
        const directions = `<br><a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-size:11px;font-weight:600;text-decoration:none">↗ Directions</a>`

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:26px;height:26px;background:#0d9488;border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:14px;line-height:1">⚓</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        })
        L.marker([rlat, rlng], { icon })
          .bindPopup(`<b>${name}</b>${feeStr}${operator}${surface}${directions}`)
          .addTo(group)
      }
      rampsLayerRef.current = group.addTo(mapRef.current!)
    })
  }, [overlays, mapReady, features, lat, lng])

  // Swap base tile
  useEffect(() => {
    if (!tileLayerRef.current) return
    tileLayerRef.current.setUrl(TILE_LAYERS[baseLayer].url)
  }, [baseLayer])

  function toggleOverlay(key: OverlayKey) {
    setOverlays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const cond = conditions?.conditions
  const wind = cond?.wind
  const waterTempF: number | null = cond?.waterTempF ?? null
  const waterTempSource: string | null = cond?.waterTempSource ?? null

  // Compute ratings for the strip
  const inflows: any[] = cond?.inflows?.slice(0, 6) ?? []
  const maxCfs = inflows.length ? Math.max(...inflows.map((f: any) => f.flowCfs)) : 0

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">

      {/* Conditions header */}
      <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center gap-5 border-b border-slate-700/50">
        {loading && <span className="text-xs text-slate-500 animate-pulse">Loading…</span>}

        {waterTempF !== null && (
          <div className="flex items-center gap-1.5">
            <Droplets size={13} className="text-cyan-400" />
            <span className="text-xs font-bold text-white">{waterTempF}°F</span>
            <span className="text-xs text-slate-400">water temp</span>
            {waterTempSource === 'estimated' && (
              <span className="text-[10px] text-slate-500 font-semibold">(est.)</span>
            )}
          </div>
        )}

        {wind && (
          <div className="flex items-center gap-2">
            <div style={{ transform: `rotate(${windIconRotation(wind.directionDeg)}deg)` }}>
              <Navigation size={14} className="text-blue-400" fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-white">{wind.speedMph} mph</span>
            <span className="text-xs text-slate-400">from {wind.directionLabel}</span>
            {wind.gusts > wind.speedMph + 5 && (
              <span className="text-xs text-amber-400 font-semibold">gusts {wind.gusts}</span>
            )}
          </div>
        )}
      </div>

      {/* Map layer controls */}
      <div className="bg-slate-800 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-slate-700/40">
        {(['topo', 'satellite'] as BaseLayer[]).map(layer => (
          <button
            key={layer}
            onClick={() => setBaseLayer(layer)}
            className={`text-xs px-3 py-1 rounded border font-semibold transition-colors capitalize ${
              baseLayer === layer
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {layer === 'topo' ? 'Topo' : 'Satellite'}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-600 mx-0.5" />

        {(['flowlines', 'wind', 'ramps'] as OverlayKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleOverlay(key)}
            className={`text-xs px-3 py-1 rounded border font-semibold transition-colors ${
              overlays.has(key)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {key === 'flowlines' ? 'Streams' : key === 'wind' ? 'Wind' : 'Ramps'}
          </button>
        ))}
      </div>

      {/* Map canvas */}
      <div className="relative" style={{ height: 520 }}>
        {!features && (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-10">
            <span className="text-slate-500 text-sm animate-pulse">Loading map…</span>
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full z-0" />
      </div>

      {/* Inflow strip — clickable buttons with volume ratings */}
      {inflows.length > 0 && (
        <div className="bg-slate-900 border-t border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inflows</span>
            {selectedInflow && (
              <span className="text-[10px] text-cyan-400">stream highlighted · tap to clear</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {inflows.map((f: any) => {
              const rating = rateInflow(f.flowCfs, maxCfs)
              const c = RATING_COLORS[rating]
              const isActive = selectedInflow === f.siteNo
              return (
                <button
                  key={f.siteNo}
                  onClick={() => handleInflowSelect(f)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs font-semibold transition-all"
                  style={{
                    background:   isActive ? c.bg : 'rgba(30,41,59,0.8)',
                    borderColor:  isActive ? c.border : '#334155',
                    color:        isActive ? c.text  : '#94a3b8',
                    boxShadow:    isActive ? `0 0 0 1px ${c.border}` : 'none',
                  }}
                >
                  {/* Volume rating dot */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0 transition-colors"
                    style={{ background: c.border }}
                  />
                  {/* Stream name */}
                  <span>{shortName(f.siteName)}</span>
                  {/* CFS */}
                  <span
                    className="font-bold"
                    style={{ color: isActive ? c.text : '#e2e8f0' }}
                  >
                    {f.flowCfs.toLocaleString()} cfs
                  </span>
                  {/* Rating label */}
                  <span
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: c.border }}
                  >
                    {rating}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
