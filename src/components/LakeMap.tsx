'use client'
import { useEffect, useRef, useState } from 'react'
import { Navigation, Droplets, Waves } from 'lucide-react'

interface LakeMapProps {
  lakeId: string
  lakeName: string
  lat: number
  lng: number
}

type BaseLayer = 'satellite' | 'topo'
type OverlayKey = 'flowlines' | 'wind'

const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, GeoEye, Earthstar Geographics',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
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

// Wind direction: meteorological convention — wind FROM a direction
// Navigation icon default points UP (north). Rotate so it points IN the direction wind is going (opposite of "from").
function windIconRotation(fromDeg: number) {
  return (fromDeg + 180) % 360
}

export function LakeMap({ lakeId, lakeName, lat, lng }: LakeMapProps) {
  const mapRef = useRef<any>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const [conditions, setConditions] = useState<any>(null)
  const [features, setFeatures] = useState<any>(null)
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('satellite')
  const [overlays, setOverlays] = useState<Set<OverlayKey>>(new Set(['flowlines']))
  const [loading, setLoading] = useState(true)
  const flowlinesLayerRef = useRef<any>(null)
  const windLayerRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)

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

  // Init Leaflet map
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })
      const map = L.map(mapDivRef.current!, { center: [lat, lng], zoom: 13, zoomControl: true })
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.satellite.url, {
        attribution: TILE_LAYERS.satellite.attribution, maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [lat, lng])

  // Flowlines overlay
  useEffect(() => {
    if (!mapRef.current || !features?.flowlines) return
    import('leaflet').then(L => {
      flowlinesLayerRef.current?.remove()
      flowlinesLayerRef.current = null
      if (!overlays.has('flowlines')) return
      flowlinesLayerRef.current = L.geoJSON(features.flowlines, {
        style: f => ({
          color: f?.properties?.FTYPE === 460 ? '#60a5fa' : '#93c5fd',
          weight: f?.properties?.FTYPE === 460 ? 3 : 1.5,
          opacity: 0.85,
        }),
        onEachFeature: (f, layer) => {
          if (f.properties?.GNIS_NAME) layer.bindPopup(`<b>${f.properties.GNIS_NAME}</b>`)
        },
      }).addTo(mapRef.current)
    })
  }, [features, overlays])

  // Wind arrows overlay — grid of directional arrows across the lake
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(L => {
      windLayerRef.current?.remove()
      windLayerRef.current = null
      if (!overlays.has('wind') || !conditions?.conditions?.wind) return

      const wind = conditions.conditions.wind
      const rotation = windIconRotation(wind.directionDeg)
      const group = L.layerGroup()

      // Place wind arrows in a 3x3 grid around the lake center
      const offsets = [-0.06, 0, 0.06]
      for (const dlat of offsets) {
        for (const dlng of offsets) {
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#60a5fa" opacity="0.85">
                <path d="M12 2L8 10h8L12 2z"/>
                <rect x="11" y="10" width="2" height="12" fill="#60a5fa"/>
              </svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          L.marker([lat + dlat, lng + dlng], { icon, interactive: false }).addTo(group)
        }
      }
      windLayerRef.current = group.addTo(mapRef.current)
    })
  }, [conditions, overlays, lat, lng])

  // Inflow markers (always shown when data available)
  const inflowsAdded = useRef(false)
  useEffect(() => {
    if (!mapRef.current || !conditions?.conditions?.inflows?.length || inflowsAdded.current) return
    import('leaflet').then(L => {
      inflowsAdded.current = true
      for (const inflow of conditions.conditions.inflows.slice(0, 6)) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#1d4ed8;color:white;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.5)">${inflow.flowCfs.toLocaleString()} cfs</div>`,
          iconAnchor: [0, 0],
        })
        L.marker([inflow.lat, inflow.lng], { icon })
          .bindPopup(`<b>${inflow.siteName}</b><br>${inflow.flowCfs.toLocaleString()} cfs`)
          .addTo(mapRef.current)
      }
    })
  }, [conditions])

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
  const temp = cond?.waterTemp

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">

      {/* Conditions header */}
      <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center gap-5 border-b border-slate-700/50">
        {loading && <span className="text-xs text-slate-500 animate-pulse">Loading…</span>}

        {temp && (
          <div className="flex items-center gap-1.5">
            <Droplets size={13} className="text-cyan-400" />
            <span className="text-xs font-bold text-white">{temp.valueFahrenheit}°F</span>
            <span className="text-xs text-slate-400">water temp</span>
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
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700/40">
        {/* Satellite / Topo toggle — clearly two states */}
        <div className="flex rounded-md overflow-hidden border border-slate-600 text-xs font-semibold">
          <button
            onClick={() => setBaseLayer('satellite')}
            className={`px-3 py-1 transition-colors ${baseLayer === 'satellite' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Satellite
          </button>
          <button
            onClick={() => setBaseLayer('topo')}
            className={`px-3 py-1 border-l border-slate-600 transition-colors ${baseLayer === 'topo' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Topo
          </button>
        </div>

        {/* Overlay toggles */}
        {(['flowlines', 'wind'] as OverlayKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleOverlay(key)}
            className={`text-xs px-3 py-1 rounded border font-semibold transition-colors capitalize ${
              overlays.has(key)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {key === 'flowlines' ? 'Streams' : 'Wind'}
          </button>
        ))}
      </div>

      {/* Map canvas */}
      <div ref={mapDivRef} style={{ height: 520 }} className="w-full z-0" />

      {/* Inflow strip */}
      {cond?.inflows?.length > 0 && (
        <div className="bg-slate-900 border-t border-slate-700/50 px-4 py-2.5 flex flex-wrap gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">Inflows</span>
          {cond.inflows.slice(0, 4).map((f: any) => (
            <span key={f.siteNo} className="text-xs text-slate-300">
              <span className="font-semibold text-blue-300">{f.siteName.replace(/\s+(nr|at|ab|bl)\s+.*/i, '').trim()}</span>
              {' — '}<span className="font-bold text-white">{f.flowCfs.toLocaleString()}</span>
              <span className="text-slate-400"> cfs</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
