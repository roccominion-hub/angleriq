'use client'

import { useEffect, useRef } from 'react'

interface LakeMapProps {
  lat: number
  lng: number
  name: string
}

const MAP_HEIGHT = 190

export function LakeMap({ lat, lng, name }: LakeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=11/${lat}/${lng}`

  useEffect(() => {
    // Inject Leaflet CSS once via JS to avoid inline <link> creating a gap
    if (!document.getElementById('leaflet-css')) {
      const el = document.createElement('link')
      el.id = 'leaflet-css'
      el.rel = 'stylesheet'
      el.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(el)
    }

    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 10,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.marker([lat, lng]).addTo(map)

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng])

  return (
    <div
      className="relative w-full overflow-hidden border-b border-blue-100"
      style={{ height: `${MAP_HEIGHT}px` }}
    >
      <div ref={mapRef} style={{ height: `${MAP_HEIGHT}px`, width: '100%' }} />
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 bg-white/80 text-xs text-blue-600 px-2 py-0.5 rounded shadow hover:bg-white z-[1000]"
      >
        View larger map
      </a>
    </div>
  )
}
