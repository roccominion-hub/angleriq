'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
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

// ── Flowline ↔ lake geometry (for stream entry/exit points) ──────────────────
// All coordinates are [lng, lat] to match GeoJSON order.

// Even-odd point-in-polygon across all rings.
function pointInRings(lng: number, lat: number, rings: number[][][]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

// Intersection point of segments a-b and c-d, or null if they don't cross.
function segInt(a: number[], b: number[], c: number[], d: number[]): [number, number] | null {
  const r = [b[0] - a[0], b[1] - a[1]]
  const s = [d[0] - c[0], d[1] - c[1]]
  const denom = r[0] * s[1] - r[1] * s[0]
  if (denom === 0) return null
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return [a[0] + t * r[0], a[1] + t * r[1]]
}

// Where a flowline crosses the lake boundary, and whether the line's downstream
// end sits inside the lake (→ inflow) or outside (→ outflow).
function classifyFlowline(coords: number[][], rings: number[][][]): null | {
  point: [number, number]  // [lng, lat] crossing on the shoreline
  kind: 'inflow' | 'outflow'
} {
  if (coords.length < 2 || !rings.length) return null
  const startInside = pointInRings(coords[0][0], coords[0][1], rings)
  const endInside = pointInRings(coords[coords.length - 1][0], coords[coords.length - 1][1], rings)
  if (startInside === endInside) return null  // fully in or fully out — not an entry/exit

  // Find the boundary crossing nearest the outside end (the shoreline entry/exit).
  let crossing: [number, number] | null = null
  for (let i = 0; i < coords.length - 1; i++) {
    for (const ring of rings) {
      for (let j = 0; j < ring.length - 1; j++) {
        const p = segInt(coords[i], coords[i + 1], ring[j], ring[j + 1])
        if (p) { crossing = p; break }
      }
      if (crossing) break
    }
    if (crossing) break
  }
  if (!crossing) return null
  // NHD flowlines are digitized downstream, so the last vertex is downstream.
  // Downstream end inside the lake ⇒ water flows in (inflow); outside ⇒ outflow.
  return { point: crossing, kind: endInside ? 'inflow' : 'outflow' }
}

// ── Stream network via NHD topology (no polygon dependency) ──────────────────
// NHD ties the ftype-558 "artificial paths" that trace a lake's water course to
// the lake's waterbody via wbarea_permanent_identifier. We take the dominant
// wbarea near the center as "the lake"; its 558 endpoints are the shoreline
// nodes. A named river (460) or a differently-identified 558 (an impounded
// river) touching one of those nodes is a mouth — inflow if its downstream end
// touches, outflow if its upstream end does.
type Flow = { coords: number[][]; ftype: number; flowdir: number; name: string | null; wb: string | null; size: number }
type Junction = { lng: number; lat: number; kind: 'inflow' | 'outflow'; size: number }

function nodeKey(pt: number[]): string { return `${pt[0].toFixed(6)},${pt[1].toFixed(6)}` }
function ends(f: Flow): [string, string] { return [nodeKey(f.coords[0]), nodeKey(f.coords[f.coords.length - 1])] }

function buildStreamNetwork(flows: Flow[], cLng: number, cLat: number): { drawStreams: Flow[]; junctions: Junction[] } {
  const paths = flows.filter(f => f.ftype === 558)
  const streams = flows.filter(f => f.ftype === 460)
  if (!paths.length) return { drawStreams: streams, junctions: [] }

  // The lake = the wbarea shared by the most 558 paths passing near the center.
  const nearCounts = new Map<string, number>()
  for (const f of paths) {
    if (!f.wb) continue
    if (f.coords.some(c => Math.hypot(c[0] - cLng, c[1] - cLat) < 0.05)) {
      nearCounts.set(f.wb, (nearCounts.get(f.wb) ?? 0) + 1)
    }
  }
  let lakeWb: string | null = null, bestN = 0
  for (const [wb, n] of nearCounts) if (n > bestN) { bestN = n; lakeWb = wb }
  if (!lakeWb) return { drawStreams: streams, junctions: [] }

  // Shoreline nodes = endpoints of the lake's own 558 network.
  const lakeNodes = new Set<string>()
  for (const f of paths) if (f.wb === lakeWb) { const [a, b] = ends(f); lakeNodes.add(a); lakeNodes.add(b) }

  // Draw the 460 rivers wired into the lake (directly, or via connected creeks).
  const parent = new Map<string, string>()
  const find = (x: string): string => { let p = parent.get(x) ?? x; if (p !== x) { p = find(p); parent.set(x, p) } return p }
  for (const f of streams) {
    const [a, b] = ends(f)
    if (!parent.has(a)) parent.set(a, a)
    if (!parent.has(b)) parent.set(b, b)
    parent.set(find(a), find(b))
  }
  const lakeRoots = new Set<string>()
  for (const f of streams) for (const n of ends(f)) if (lakeNodes.has(n)) lakeRoots.add(find(n))
  const drawStreams = streams.filter(f => lakeRoots.has(find(ends(f)[0])))

  // Mouths: named rivers (460) and impounded rivers (558 with a different
  // wbarea) that touch the lake's network at exactly one end.
  const junctions: Junction[] = []
  for (const f of [...streams, ...paths.filter(p => p.wb !== lakeWb)]) {
    const [a, b] = ends(f)
    const aIn = lakeNodes.has(a), bIn = lakeNodes.has(b)
    if (aIn === bIn) continue
    const p = bIn ? f.coords[f.coords.length - 1] : f.coords[0]
    junctions.push({ lng: p[0], lat: p[1], kind: bIn ? 'inflow' : 'outflow', size: f.size })
  }
  return { drawStreams, junctions }
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

  // NHD flowlines (label-free vector streams). Each: { coords:[lng,lat][], ftype, flowdir, size }
  const [flowlines, setFlowlines] = useState<any[] | null>(null)

  const windLayerRef         = useRef<any>(null)
  const tileLayerRef         = useRef<any>(null)
  const waterbodyLayerRef    = useRef<any>(null)
  const rampsLayerRef        = useRef<any>(null)
  const rampsDataRef         = useRef<any[] | null>(null)
  const streamLayerRef       = useRef<any>(null)  // vector NHD flowlines (label-free)
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

  // Fetch label-free NHD flowlines (vector streams) for the lake bbox. Done
  // client-side, like the boat-ramp query, to avoid Vercel egress limits.
  useEffect(() => {
    const wb = features?.waterwayBbox
    if (!wb) return
    const bbox = `${wb.minLng},${wb.minLat},${wb.maxLng},${wb.maxLat}`
    // Named rivers/creeks (ftype 460) for display, plus the ftype-558 artificial
    // paths that trace the water course through the lake — needed to compute the
    // stream network topology. Unnamed capillary 460 ditches are excluded (clutter
    // + row cap). gnis_name is used only for ranking, never displayed.
    const where = encodeURIComponent("(ftype=460 AND gnis_name IS NOT NULL) OR ftype=558")
    const url = `https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query`
      + `?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326`
      + `&spatialRel=esriSpatialRelIntersects&where=${where}&outFields=ftype,flowdir,lengthkm,gnis_name,wbarea_permanent_identifier`
      + `&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=4000`
    fetch(url, { signal: AbortSignal.timeout(20000) })
      .then(r => r.json())
      .then(fc => {
        const feats = (fc?.features ?? [])
          .filter((f: any) => f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates))
        // Total length per named stream — so a long river outranks a short creek
        // even where its crossing segment is small.
        const lenByName: Record<string, number> = {}
        for (const f of feats) {
          const n = f.properties?.gnis_name
          if (n) lenByName[n] = (lenByName[n] ?? 0) + (f.properties?.lengthkm ?? 0)
        }
        const lines = feats.map((f: any) => {
          const name = f.properties?.gnis_name ?? null
          return {
            coords: f.geometry.coordinates as number[][],
            ftype: f.properties?.ftype,
            flowdir: f.properties?.flowdir,
            name,
            wb: f.properties?.wbarea_permanent_identifier ?? null,
            size: name ? (lenByName[name] ?? 0) : (f.properties?.lengthkm ?? 0),
          }
        })
        setFlowlines(lines)
      })
      .catch(() => setFlowlines([]))
  }, [features])

  // Derive the lake's connected stream network + true mouths from NHD topology.
  const streamNetwork = useMemo(
    () => (flowlines?.length ? buildStreamNetwork(flowlines as Flow[], lng, lat) : { drawStreams: [], junctions: [] }),
    [flowlines, lng, lat]
  )

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

  // Streams overlay — label-free NHD flowlines drawn as vector polylines.
  // Only rivers connected to this lake's network are drawn (no unrelated creeks
  // draining elsewhere), and never the 558 paths that run through open water.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    import('leaflet').then(L => {
      streamLayerRef.current?.remove()
      streamLayerRef.current = null
      if (!overlays.has('flowlines') || !streamNetwork.drawStreams.length) return

      const group = L.layerGroup()
      for (const fl of streamNetwork.drawStreams) {
        const latlngs = fl.coords.map((c: number[]) => [c[1], c[0]] as [number, number])
        // Heavier for longer (bigger) named streams; thin for small creeks.
        const big = fl.size >= 20, mid = fl.size >= 6
        const weight = big ? 2.6 : mid ? 1.8 : 1.2
        L.polyline(latlngs, { color: '#2563eb', weight, opacity: big ? 0.7 : 0.5, interactive: false }).addTo(group)
      }
      streamLayerRef.current = group.addTo(map)
    })
  }, [overlays, mapReady, streamNetwork])

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

  // Stream entry/exit circles — soft area indicators at the true mouths where
  // named rivers meet the lake's NHD network (major tributaries + the outflow).
  // Falls back to polygon-boundary crossings for lakes lacking artificial paths.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current

    type Cross = { lng: number; lat: number; kind: 'inflow' | 'outflow'; size: number }
    let crossings: Cross[] = streamNetwork.junctions

    if (!crossings.length && flowlines?.length && features?.waterbodies?.features) {
      const rings: number[][][] = []
      for (const f of features.waterbodies.features) {
        const geom = f.geometry
        if (geom?.type === 'Polygon') rings.push(geom.coordinates[0])
        if (geom?.type === 'MultiPolygon') for (const poly of geom.coordinates) rings.push(poly[0])
      }
      if (rings.length) {
        const fb: Cross[] = []
        for (const fl of flowlines) {
          if (fl.ftype !== 460) continue
          const cls = classifyFlowline(fl.coords, rings)
          if (cls) fb.push({ lng: cls.point[0], lat: cls.point[1], kind: cls.kind, size: fl.size || 0 })
        }
        crossings = fb
      }
    }
    if (!crossings.length) {
      inflowMarkersRef.current.forEach(m => m.remove()); inflowMarkersRef.current.clear(); return
    }

    // Merge near-duplicate crossings (several flowlines meeting at one mouth).
    const merged: Cross[] = []
    for (const c of [...crossings].sort((a, b) => b.size - a.size)) {
      if (!merged.find(m => m.kind === c.kind && Math.hypot(m.lng - c.lng, m.lat - c.lat) < 0.0025)) merged.push(c)
    }

    // Major tributaries + the outflow.
    const selected = [
      ...merged.filter(c => c.kind === 'inflow').slice(0, 5),
      ...merged.filter(c => c.kind === 'outflow').slice(0, 1),
    ]

    const gauges: any[] = conditions?.conditions?.inflows ?? []
    const maxCfs = gauges.length ? Math.max(...gauges.map((g: any) => g.flowCfs)) : 0

    import('leaflet').then(L => {
      inflowMarkersRef.current.forEach(m => m.remove())
      inflowMarkersRef.current.clear()

      selected.forEach((c, i) => {
        let color = c.kind === 'outflow' ? '#475569' : '#0891b2'   // slate outflow / cyan inflow
        let popup = c.kind === 'outflow'
          ? '<b>Outflow</b><br>Water exits the lake here'
          : '<b>Inflow</b><br>Tributary enters here'

        // Attach the nearest USGS gauge's live flow to an inflow, if one is close.
        if (c.kind === 'inflow' && gauges.length) {
          const best = gauges.reduce((acc: any, g: any) => {
            const d = Math.hypot(g.lng - c.lng, g.lat - c.lat)
            return d < acc.d ? { g, d } : acc
          }, { g: null, d: Infinity })
          if (best.g && best.d < 0.06) {
            color = RATING_COLORS[rateInflow(best.g.flowCfs, maxCfs)].border
            popup = `<b>${shortName(best.g.siteName)}</b><br>${best.g.flowCfs.toLocaleString()} cfs`
          }
        }

        const circle = L.circle([c.lat, c.lng], {
          radius: 350, color, fillColor: color, fillOpacity: 0.12, weight: 1.5, opacity: 0.55,
        }).bindPopup(popup).addTo(map)
        inflowMarkersRef.current.set(`x${i}`, circle)
      })
    })
  }, [conditions, mapReady, features, flowlines, streamNetwork])

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
          html: `<div style="width:26px;height:26px;background:#0d9488;border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg></div>`,
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
