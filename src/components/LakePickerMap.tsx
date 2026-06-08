'use client'
import { useEffect, useRef, useState } from 'react'
import { X, ChevronRight, Search } from 'lucide-react'

export interface PickerLake {
  id: string
  name: string
  state: string
  type: string
  lat?: number | null
  lng?: number | null
}

// Color a marker by broad region so the map is easier to read at a glance.
function stateColor(state: string): string {
  const s = state.toUpperCase()
  if (s.startsWith('TX') || s === 'OK')             return '#dc2626' // red   — South-Central
  if (s.startsWith('LA') || s === 'AR' || s === 'MS') return '#d97706' // amber — Deep South
  if (s === 'TN' || s === 'AL' || s.startsWith('GA') || s === 'FL') return '#16a34a' // green — Southeast
  if (s === 'MO')                                    return '#7c3aed' // violet — Midwest South
  if (s === 'CA' || s.startsWith('CA'))              return '#ca8a04' // yellow — West
  if (s === 'NY' || s.startsWith('NY') || s === 'MI') return '#1d4ed8' // navy — North
  return '#2563eb' // default blue
}

export function LakePickerMap({
  lakes,
  onSelect,
  onClose,
}: {
  lakes: PickerLake[]
  onSelect: (lake: PickerLake) => void
  onClose: () => void
}) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const markersRef  = useRef<{ lake: PickerLake; marker: any }[]>([])
  const [picked, setPicked]       = useState<PickerLake | null>(null)
  const [filter, setFilter]       = useState('')
  const [matchCount, setMatchCount] = useState(0)

  const plottable = lakes.filter(l => l.lat != null && l.lng != null)

  // Build map once
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !mapDivRef.current) return
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: true })
      map.attributionControl.setPrefix('')
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 18 }
      ).addTo(map)
      map.setView([36.5, -90.5], 5)
      mapRef.current = map

      const refs: { lake: PickerLake; marker: any }[] = []
      for (const lake of plottable) {
        const color = stateColor(lake.state)
        const icon = L.divIcon({
          className: '',
          html: `<div data-lake="${lake.id}" style="
            width:11px;height:11px;background:${color};
            border:2px solid white;border-radius:9999px;
            box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;
          "></div>`,
          iconSize: [11, 11],
          iconAnchor: [5.5, 5.5],
        })
        const marker = L.marker([lake.lat!, lake.lng!], { icon })
          .addTo(map)
          .on('click', () => setPicked(lake))
        refs.push({ lake, marker })
      }
      markersRef.current = refs
      setMatchCount(refs.length)
    })

    return () => { mapRef.current?.remove(); mapRef.current = null; cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plottable.length])

  // Filter markers as user types — dim non-matches, highlight matches
  useEffect(() => {
    const q = filter.toLowerCase().trim()
    let shown = 0
    for (const { lake, marker } of markersRef.current) {
      const matches = !q
        || lake.name.toLowerCase().includes(q)
        || lake.state.toLowerCase().includes(q)
      marker.setOpacity(matches ? 1 : 0.12)
      if (matches) shown++
    }
    setMatchCount(shown)
    // If exactly one match after typing 3+ chars, pan to it
    if (q.length >= 3) {
      const exact = markersRef.current.find(({ lake }) =>
        lake.name.toLowerCase().startsWith(q)
      )
      if (exact && mapRef.current) {
        mapRef.current.panTo([exact.lake.lat!, exact.lake.lng!], { animate: true, duration: 0.4 })
      }
    }
  }, [filter])

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100">
      <div ref={mapDivRef} className="w-full h-[500px]" />

      {/* Search filter overlay — top-left */}
      <div className="absolute top-3 left-3 z-[500] flex items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter lakes…"
            className="h-8 pl-7 pr-3 text-sm rounded-lg border border-slate-200 bg-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
        </div>
        {filter && (
          <span className="text-xs bg-white/90 border border-slate-200 rounded-full px-2 py-0.5 text-slate-500 shadow">
            {matchCount} lake{matchCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Legend — top-right (before close button) */}
      <div className="absolute top-3 right-11 z-[500] bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow px-2.5 py-1.5 hidden sm:flex flex-col gap-0.5 text-[10px] font-semibold leading-tight">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />TX/OK</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />LA/AR/MS</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />TN/AL/GA/FL</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-600 inline-block" />CA</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-navy-700 inline-block" style={{background:'#1d4ed8'}} />NY/MI</span>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-[500] bg-white rounded-full shadow p-1.5 text-slate-500 hover:text-slate-800 transition-colors"
        title="Close map"
      >
        <X size={16} />
      </button>

      {/* Bottom strip — instruction or selected lake */}
      <div className="absolute bottom-0 left-0 right-0 z-[500] bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
        {picked ? (
          <>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 truncate">{picked.name}</span>
              <span className="text-slate-400 text-sm ml-2">{picked.state} · {picked.type}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setPicked(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded">
                Clear
              </button>
              <button
                onClick={() => onSelect(picked)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Select Lake <ChevronRight size={14} />
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 w-full text-center">
            Click any dot to select a lake · {plottable.length} lakes mapped across 13 states
          </p>
        )}
      </div>
    </div>
  )
}
