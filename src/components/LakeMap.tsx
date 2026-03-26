'use client'

interface LakeMapProps {
  lat: number
  lng: number
  name: string
}

export function LakeMap({ lat, lng, name }: LakeMapProps) {
  // Use OSM static map image — no iframe, no CORS/X-Frame-Options issues
  const zoom = 11
  const width = 800
  const height = 160
  const src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=${lat},${lng},red-pushpin`
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`

  return (
    <div className="relative w-full overflow-hidden rounded-t-xl border-b border-blue-100" style={{ height: '160px' }}>
      <img
        src={src}
        alt={`Map of ${name}`}
        width={width}
        height={height}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 bg-white/80 text-xs text-blue-600 px-2 py-0.5 rounded shadow hover:bg-white"
      >
        View larger map
      </a>
    </div>
  )
}
