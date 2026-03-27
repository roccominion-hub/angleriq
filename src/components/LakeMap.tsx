'use client'
import { useEffect, useRef, useState } from 'react'
import { Layers, Wind, Droplets, Waves, Navigation } from 'lucide-react'

interface LakeMapProps {
  lakeId: string
  lakeName: string
  lat: number
  lng: number
}

type LayerKey = 'satellite' | 'flowlines' | 'wind' | 'waterlevel'

const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
}

function WindArrow({ deg, speed }: { deg: number; speed: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 text-blue-400 flex items-center justify-center transition-transform"
        style={{ transform: `rotate(${deg}deg)` }}
      >
        <Navigation size={16} fill="currentColor" />
      </div>
      <span className="text-xs font-bold text-white">{speed} mph</span>
    </div>
  )
}

function TrendBadge({ trend, delta }: { trend: string; delta: number }) {
  const color = trend === 'rising' ? 'text-green-400' : trend === 'falling' ? 'text-red-400' : 'text-slate-400'
  const arrow = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→'
  return (
    <span className={`text-xs font-bold ${color}`}>
      {arrow} {Math.abs(delta).toFixed(2)}ft/24h
    </span>
  )
}

export function LakeMap({ lakeId, lakeName, lat, lng }: LakeMapProps) {
  const mapRef = useRef<any>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const [conditions, setConditions] = useState<any>(null)
  const [features, setFeatures] = useState<any>(null)
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(['satellite', 'flowlines']))
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'topo'>('satellite')
  const [loading, setLoading] = useState(true)
  const flowlinesLayerRef = useRef<any>(null)
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
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })

      const map = L.map(mapDivRef.current!, {
        center: [lat, lng],
        zoom: 11,
        zoomControl: true,
      })

      // Satellite base tile
      const tile = L.tileLayer(TILE_LAYERS.satellite.url, {
        attribution: TILE_LAYERS.satellite.attribution,
        maxZoom: 18,
      }).addTo(map)
      tileLayerRef.current = tile

      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  // Add flowlines when features arrive
  useEffect(() => {
    if (!mapRef.current || !features?.flowlines) return
    import('leaflet').then(L => {
      flowlinesLayerRef.current?.remove()
      if (!activeLayers.has('flowlines')) return
      const layer = L.geoJSON(features.flowlines, {
        style: (feature) => ({
          color: feature?.properties?.FTYPE === 460 ? '#60a5fa' : '#93c5fd',
          weight: feature?.properties?.FTYPE === 460 ? 3 : 1.5,
          opacity: 0.85,
        }),
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.GNIS_NAME
          if (name) layer.bindPopup(`<b>${name}</b>`)
        },
      }).addTo(mapRef.current)
      flowlinesLayerRef.current = layer
    })
  }, [features, activeLayers])

  // Add inflow markers
  useEffect(() => {
    if (!mapRef.current || !conditions?.conditions?.inflows?.length) return
    import('leaflet').then(L => {
      for (const inflow of conditions.conditions.inflows.slice(0, 6)) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#1d4ed8;color:white;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${inflow.flowCfs.toLocaleString()} cfs</div>`,
          iconAnchor: [0, 0],
        })
        L.marker([inflow.lat, inflow.lng], { icon })
          .bindPopup(`<b>${inflow.siteName}</b><br>${inflow.flowCfs.toLocaleString()} cfs`)
          .addTo(mapRef.current)
      }
    })
  }, [conditions])

  // Swap base tile layer
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    import('leaflet').then(L => {
      tileLayerRef.current.setUrl(TILE_LAYERS[baseLayer].url)
    })
  }, [baseLayer])

  function toggleLayer(key: LayerKey) {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const cond = conditions?.conditions
  const wl = cond?.waterLevel
  const wind = cond?.wind
  const temp = cond?.waterTemp

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">

      {/* Conditions strip */}
      <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center gap-4 border-b border-slate-700/50">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{lakeName}</span>
        {loading && <span className="text-xs text-slate-500 animate-pulse">Loading conditions…</span>}

        {wl && (
          <div className="flex items-center gap-1.5">
            <Waves size={13} className="text-blue-400" />
            <span className="text-xs font-bold text-white">{wl.valueFt.toLocaleString()} ft</span>
            <TrendBadge trend={wl.trend} delta={wl.deltaft} />
          </div>
        )}

        {temp && (
          <div className="flex items-center gap-1.5">
            <Droplets size={13} className="text-cyan-400" />
            <span className="text-xs font-bold text-white">{temp.valueFahrenheit}°F water</span>
          </div>
        )}

        {wind && (
          <WindArrow deg={wind.directionDeg} speed={wind.speedMph} />
        )}

        {wind?.gusts && wind.gusts > wind.speedMph + 5 && (
          <span className="text-xs text-amber-400 font-semibold">gusts {wind.gusts} mph</span>
        )}

        {conditions?.wdftUrl && (
          <a href={conditions.wdftUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-semibold underline-offset-2 hover:underline">
            Full data →
          </a>
        )}
      </div>

      {/* Layer toggles */}
      <div className="bg-slate-800/80 px-4 py-2 flex items-center gap-2 flex-wrap border-b border-slate-700/30">
        <Layers size={13} className="text-slate-400 shrink-0" />
        <button
          onClick={() => setBaseLayer(b => b === 'satellite' ? 'topo' : 'satellite')}
          className="text-xs px-2.5 py-1 rounded-full font-semibold border transition-all bg-blue-600 border-blue-500 text-white"
        >
          {baseLayer === 'satellite' ? '🛰 Satellite' : '🗺 Topo'}
        </button>
        {([
          ['flowlines', '🏞 Streams', 'flowlines'],
          ['wind', '💨 Wind', 'wind'],
          ['waterlevel', '📊 Level', 'waterlevel'],
        ] as [LayerKey, string, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
              activeLayers.has(key)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Wind compass overlay when wind layer active */}
        {activeLayers.has('wind') && wind && (
          <div className="ml-auto flex items-center gap-2 bg-slate-700/60 rounded-lg px-3 py-1">
            <span className="text-xs text-slate-300 font-semibold">From {wind.directionLabel}</span>
            <WindArrow deg={wind.directionDeg} speed={wind.speedMph} />
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapDivRef} style={{ height: 420 }} className="w-full z-0" />

      {/* Inflow summary */}
      {cond?.inflows?.length > 0 && (
        <div className="bg-slate-900 border-t border-slate-700/50 px-4 py-2 flex flex-wrap gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">Inflows</span>
          {cond.inflows.slice(0, 4).map((f: any) => (
            <span key={f.siteNo} className="text-xs text-slate-300">
              <span className="font-bold text-blue-300">{f.siteName.replace(/nr .*/, '').trim()}</span>
              {' '}<span className="text-white font-bold">{f.flowCfs.toLocaleString()}</span> cfs
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
