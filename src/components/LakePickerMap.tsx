'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronRight, Search, MapPin } from 'lucide-react'

export interface PickerLake {
  id: string
  name: string
  state: string
  type: string
  lat?: number | null
  lng?: number | null
}

// Color markers by body-of-water type (not region — region colors had accuracy issues)
function typeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'lake':      return '#2563eb' // blue
    case 'reservoir': return '#0891b2' // cyan
    case 'river':     return '#d97706' // amber
    case 'bay':       return '#7c3aed' // violet
    case 'coastal':   return '#059669' // emerald
    default:          return '#64748b' // slate
  }
}

// Geocode a free-text location (city, state, zip) via Nominatim.
// Returns { lat, lng } or null on failure / no result.
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AnglerIQ/1.0 (angleriq-app.vercel.app)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// Unique types present in the current lake list — used to build the legend
function presentTypes(lakes: PickerLake[]): string[] {
  const seen = new Set<string>()
  for (const l of lakes) seen.add(l.type.toLowerCase())
  const order = ['lake', 'reservoir', 'river', 'bay', 'coastal', 'other']
  return order.filter(t => seen.has(t))
}

const TYPE_LABELS: Record<string, string> = {
  lake: 'Lake', reservoir: 'Reservoir', river: 'River',
  bay: 'Bay', coastal: 'Coastal', other: 'Other',
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
  const mapDivRef  = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const markersRef = useRef<{ lake: PickerLake; marker: any }[]>([])
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [picked, setPicked]         = useState<PickerLake | null>(null)
  const [filter, setFilter]         = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [geocoding, setGeocoding]   = useState(false)

  const plottable = lakes.filter(l => l.lat != null && l.lng != null)
  const types     = presentTypes(plottable)

  // Build the Leaflet map once
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !mapDivRef.current) return
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(mapDivRef.current, {
        zoomControl: false,       // We add it manually at topright below
        scrollWheelZoom: true,
      })
      L.control.zoom({ position: 'topright' }).addTo(map)
      map.attributionControl.setPrefix('')

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 18 }
      ).addTo(map)

      map.setView([36.5, -90.5], 5)
      mapRef.current = map

      const refs: { lake: PickerLake; marker: any }[] = []
      for (const lake of plottable) {
        const color = typeColor(lake.type)
        const icon = L.divIcon({
          className: '',
          html: `<div style="
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

  // Filter / geocode logic — runs on every filter change
  const handleFilter = useCallback((q: string) => {
    setFilter(q)

    const term = q.toLowerCase().trim()

    // --- Lake name / state filter ---
    let shown = 0
    let firstMatch: PickerLake | null = null
    for (const { lake, marker } of markersRef.current) {
      const matches = !term
        || lake.name.toLowerCase().includes(term)
        || lake.state.toLowerCase().includes(term)
      marker.setOpacity(matches ? 1 : 0.1)
      if (matches) {
        shown++
        if (!firstMatch) firstMatch = lake
      }
    }
    setMatchCount(shown)

    // Pan to a single exact lake match
    if (term.length >= 2 && firstMatch && shown <= 3) {
      mapRef.current?.panTo([firstMatch.lat!, firstMatch.lng!], { animate: true, duration: 0.5 })
    }

    // --- Location geocode (city / state / zip) ---
    // Fire only when no lake markers matched and there's a meaningful query.
    // Debounce by 600ms so we don't spam Nominatim on every keystroke.
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)

    if (term.length >= 3 && shown === 0) {
      geocodeTimer.current = setTimeout(async () => {
        setGeocoding(true)
        const loc = await geocodeLocation(q.trim())
        setGeocoding(false)
        if (loc && mapRef.current) {
          // Show all markers again when panning to a location
          for (const { marker } of markersRef.current) marker.setOpacity(1)
          setMatchCount(markersRef.current.length)
          mapRef.current.setView([loc.lat, loc.lng], 9, { animate: true })
        }
      }, 600)
    }
  }, [])

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-white flex flex-col">

      {/* ── Top bar: search + close ────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={filter}
          onChange={e => handleFilter(e.target.value)}
          placeholder="Search by lake name, city, state, or zip…"
          className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
          autoFocus
        />
        {filter && !geocoding && (
          <span className="text-xs text-slate-400 shrink-0">
            {matchCount} lake{matchCount !== 1 ? 's' : ''}
          </span>
        )}
        {geocoding && (
          <span className="text-xs text-blue-500 shrink-0 animate-pulse">Locating…</span>
        )}
        {/* Type legend — inline in top bar */}
        <div className="hidden sm:flex items-center gap-3 border-l border-slate-100 pl-3 shrink-0">
          {types.map(t => (
            <span key={t} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: typeColor(t) }} />
              {TYPE_LABELS[t]}
            </span>
          ))}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-1 -mr-1"
          title="Close map"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Map ───────────────────────────────────────────────────── */}
      <div ref={mapDivRef} className="w-full h-[460px]" />

      {/* ── Bottom bar: selected lake or hint ─────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200 shrink-0">
        {picked ? (
          <>
            <div className="min-w-0 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: typeColor(picked.type) }}
              />
              <span className="font-bold text-slate-900 truncate">{picked.name}</span>
              <span className="text-slate-400 text-sm shrink-0">{picked.state} · {picked.type}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setPicked(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors"
              >
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
          <p className="text-sm text-slate-400 w-full text-center flex items-center justify-center gap-1.5">
            <MapPin size={13} />
            Click any dot to select · {plottable.length} bodies of water across 13 states
          </p>
        )}
      </div>

    </div>
  )
}
