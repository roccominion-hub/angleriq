'use client'
import { useEffect, useRef, useState } from 'react'

export interface FishedLake {
  lake_id: string | null
  lake_name: string
  lake_state: string | null
  lat: number | null
  lng: number | null
  visits: number
  fish: number
}

// A lightweight regional map (centered on TX/OK) that drops a pin for every
// lake the angler has logged trips to, with a badge showing how many times
// they've fished it. Hover/tap a pin to see quick stats.
export function MyWatersMap({ lakes }: { lakes: FishedLake[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [selected, setSelected] = useState<FishedLake | null>(null)

  const plottable = lakes.filter(l => l.lat != null && l.lng != null)

  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !mapDivRef.current) return
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: false })
      map.attributionControl.setPrefix('')
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri', maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      const markers: any[] = []
      for (const lake of plottable) {
        const size = lake.visits >= 10 ? 38 : lake.visits >= 5 ? 34 : lake.visits >= 2 ? 30 : 26
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:9999px;
            background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:${size > 30 ? 13 : 12}px;border:2.5px solid #ffffff;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
          ">${lake.visits}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
        const marker = L.marker([lake.lat!, lake.lng!], { icon })
          .addTo(map)
          .on('click', () => setSelected(lake))
        markers.push(marker)
      }

      if (markers.length) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 8 })
      } else {
        map.setView([31.5, -98.5], 6) // TX/OK regional fallback
      }
    })

    return () => { mapRef.current?.remove(); mapRef.current = null; cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plottable.length])

  return (
    <div className="relative">
      <div ref={mapDivRef} className="w-full h-72 sm:h-96 rounded-xl overflow-hidden border border-slate-200" />
      {plottable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/90 rounded-xl pointer-events-none">
          <p className="text-sm text-slate-400 font-medium px-4 text-center">Log a few trips and your fished lakes will show up here</p>
        </div>
      )}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5">
          <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 text-xs">✕</button>
          <p className="font-extrabold text-slate-900 text-sm">{selected.lake_name}{selected.lake_state ? <span className="text-slate-400 font-semibold"> · {selected.lake_state}</span> : ''}</p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
            <span><strong className="text-blue-600">{selected.visits}</strong> {selected.visits === 1 ? 'trip' : 'trips'} logged</span>
            <span><strong className="text-blue-600">{selected.fish}</strong> fish caught</span>
          </div>
        </div>
      )}
    </div>
  )
}
