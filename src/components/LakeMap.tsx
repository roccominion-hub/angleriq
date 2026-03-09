'use client'

interface LakeMapProps {
  lat: number
  lng: number
  name: string
}

export function LakeMap({ lat, lng, name }: LakeMapProps) {
  const bbox = `${lng - 0.15},${lat - 0.10},${lng + 0.15},${lat + 0.10}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=11/${lat}/${lng}`

  return (
    <div className="relative w-full overflow-hidden rounded-t-xl border-b border-blue-100" style={{ height: '160px' }}>
      <iframe
        src={src}
        width="100%"
        height="160"
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        title={`Map of ${name}`}
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
