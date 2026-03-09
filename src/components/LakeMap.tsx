'use client'

interface LakeMapProps {
  lat: number
  lng: number
  name: string
}

export function LakeMap({ lat, lng, name }: LakeMapProps) {
  // OpenStreetMap static map — no API key required
  const zoom = 11
  const width = 600
  const height = 180
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=osm&markers=${lat},${lng},red`

  return (
    <div className="rounded-lg overflow-hidden border border-blue-100 w-full">
      <img
        src={mapUrl}
        alt={`Map of ${name}`}
        className="w-full object-cover"
        style={{ height: '140px' }}
        onError={(e) => {
          // Fallback to a simple OSM tile if static map fails
          const t = e.currentTarget
          t.style.display = 'none'
        }}
      />
    </div>
  )
}
