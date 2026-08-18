/**
 * AnglerIQ — Lake outlines from NHD
 *
 * The map draws waterbodies from OSM, which is usually accurate: on 258 of 415
 * lakes the two sources agree within 15%. But OSM coverage of US reservoirs is
 * uneven, and where it falls short the shoreline renders visibly incomplete —
 * Lake Eufaula's polygon covers 246 km² of a 415 km² lake.
 *
 * NHD is the USGS hydrography dataset already queried for flowlines, and its
 * waterbody layer is authoritative for US waters. It is used selectively rather
 * than wholesale: it costs more to query, returns 2-3x the vertices, and on
 * most lakes would replace a good outline with an equivalent one.
 */

export type Ring = number[][]

export function ringsOf(geometry: any): Ring[] {
  const out: Ring[] = []
  if (!geometry) return out
  if (geometry.type === 'Polygon') out.push(geometry.coordinates[0])
  if (geometry.type === 'MultiPolygon') for (const poly of geometry.coordinates) out.push(poly[0])
  return out
}

/** Shoelace on an equirectangular projection about the ring's mean latitude. */
export function areaKm2(ring: Ring): number {
  if (ring.length < 3) return 0
  let lo = Infinity, hi = -Infinity
  for (const c of ring) { if (c[1] < lo) lo = c[1]; if (c[1] > hi) hi = c[1] }
  const lat0 = ((lo + hi) / 2) * Math.PI / 180
  const kx = 111.320 * Math.cos(lat0), ky = 110.574
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky)
  }
  return Math.abs(a / 2)
}

export const totalArea = (rings: Ring[]) => rings.reduce((s, r) => s + areaKm2(r), 0)

export function pointInRings(lng: number, lat: number, rings: Ring[]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

/**
 * Ramer-Douglas-Peucker. NHD outlines reach 240k vertices — accurate, but more
 * than Leaflet should be asked to draw, and more than the shoreline needs at
 * any zoom an angler uses. Iterative rather than recursive: recursion blows the
 * stack on rings this size.
 */
export function simplifyRing(ring: Ring, toleranceDeg: number): Ring {
  if (ring.length < 4) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = 1; keep[ring.length - 1] = 1

  // A closed ring starts and ends on the same point, so the opening segment has
  // zero length and every perpendicular distance against it is zero — the whole
  // ring collapses to two points. Anchor a third vertex, the one farthest from
  // the start, and simplify each half against a real segment.
  let far = 0, farDist = -1
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (d > farDist) { farDist = d; far = i }
  }
  if (far > 0) keep[far] = 1

  const stack: [number, number][] = far > 0
    ? [[0, far], [far, ring.length - 1]]
    : [[0, ring.length - 1]]

  while (stack.length) {
    const [first, last] = stack.pop()!
    let maxDist = 0, index = 0
    const [x1, y1] = ring[first], [x2, y2] = ring[last]
    const dx = x2 - x1, dy = y2 - y1
    const denom = Math.hypot(dx, dy) || 1e-12

    for (let i = first + 1; i < last; i++) {
      const [x0, y0] = ring[i]
      const dist = Math.abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / denom
      if (dist > maxDist) { maxDist = dist; index = i }
    }
    if (maxDist > toleranceDeg && index > 0) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  const out: Ring = []
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i])
  return out
}

/**
 * Simplify a whole outline to roughly a vertex budget, raising the tolerance
 * until it fits. A shoreline is worth more detail than a lake's own scale
 * suggests — coves are where fish live — so the budget is generous.
 */
export function simplifyOutline(rings: Ring[], budget = 8000): { rings: Ring[]; tolerance: number } {
  const count = (rs: Ring[]) => rs.reduce((s, r) => s + r.length, 0)
  if (count(rings) <= budget) return { rings, tolerance: 0 }
  let tol = 0.00005
  for (let i = 0; i < 12; i++) {
    const out = rings.map(r => simplifyRing(r, tol)).filter(r => r.length >= 4)
    if (count(out) <= budget) return { rings: out, tolerance: tol }
    tol *= 1.8
  }
  return { rings: rings.map(r => simplifyRing(r, tol)).filter(r => r.length >= 4), tolerance: tol }
}

const norm = (s: string) =>
  s.toLowerCase().replace(/^lake\s+/, '').replace(/\s+(lake|reservoir)$/, '').trim()

const NHD_WATERBODY = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/12/query'

async function query(where: string, bbox: string): Promise<any[]> {
  const url = `${NHD_WATERBODY}?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326`
    + `&spatialRel=esriSpatialRelIntersects&where=${encodeURIComponent(where)}`
    + `&outFields=GNIS_NAME,AREASQKM,FTYPE&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=2000`
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`NHD HTTP ${res.status}`)
  const fc = await res.json() as any
  if (fc?.error) throw new Error(fc.error?.message ?? 'NHD error')
  if (!Array.isArray(fc?.features)) throw new Error('NHD malformed response')
  return fc.features
}

export type OutlineResult = {
  rings: Ring[]
  areaKm2: number
  source: 'nhd-named' | 'nhd-contained'
  matchedName: string | null
} | null

/**
 * NHD waterbodies for a lake, with guards against the two ways selection fails.
 *
 * Names are queried rather than filtered client-side: a lake-sized box holds
 * thousands of farm ponds and the row cap means the lake itself never returns.
 * NHD's LIKE is case-sensitive, and it names lakes in its own order — "Eufaula
 * Lake", not "Lake Eufaula" — so the comparison is upper-cased and loose.
 *
 * `osmAreaKm2`, when known, bounds the result. Without it the containment
 * fallback swallows whatever polygon holds the point, which on a Great Lake is
 * the entire Great Lake: the audit returned 58,046 km² for Lake Michigan and
 * 26,821 km² for Lake St. Clair.
 */
export async function nhdOutline(
  name: string,
  lat: number,
  lng: number,
  osmAreaKm2?: number | null,
  padDeg = 0.45,
): Promise<OutlineResult> {
  const bbox = `${lng - padDeg},${lat - padDeg},${lng + padDeg},${lat + padDeg}`
  const plausible = (rings: Ring[]) => {
    const a = totalArea(rings)
    if (a <= 0) return false
    // A lake cannot be 5x the outline OSM already has, and absent an OSM
    // reference a result the size of an inland sea is a selection failure.
    if (osmAreaKm2 && osmAreaKm2 > 0 && a > osmAreaKm2 * 5) return false
    if (!osmAreaKm2 && a > 2000) return false
    return true
  }

  const core = norm(name).replace(/'/g, "''")
  if (core) {
    const feats = await query(`UPPER(GNIS_NAME) LIKE '%${core.toUpperCase()}%'`, bbox)
    const named = feats.filter(f => {
      const n = f.properties?.GNIS_NAME
      return n && norm(String(n)) === norm(name)
    })
    if (named.length) {
      const rings = named.flatMap(f => ringsOf(f.geometry))
      if (plausible(rings)) {
        return { rings, areaKm2: totalArea(rings), source: 'nhd-named', matchedName: named[0].properties?.GNIS_NAME ?? null }
      }
    }
  }

  // Unnamed in NHD, which is common for reservoirs. Take the polygon under the
  // stored point, plus large neighbours overlapping its extent, since reservoir
  // arms are frequently separate features.
  const feats = await query('AREASQKM > 0.4', bbox)
  const containing = feats.filter(f => pointInRings(lng, lat, ringsOf(f.geometry)))
  if (!containing.length) return null

  let chosen = [...containing]
  const ext = (rs: Ring[]) => {
    let mn = [9e9, 9e9], mx = [-9e9, -9e9]
    for (const r of rs) for (const c of r) {
      mn[0] = Math.min(mn[0], c[0]); mn[1] = Math.min(mn[1], c[1])
      mx[0] = Math.max(mx[0], c[0]); mx[1] = Math.max(mx[1], c[1])
    }
    return { mn, mx }
  }
  const base = ext(containing.flatMap(f => ringsOf(f.geometry)))
  for (const f of feats) {
    if (chosen.includes(f)) continue
    if (Number(f.properties?.AREASQKM ?? 0) < 1) continue
    const e = ext(ringsOf(f.geometry))
    const overlaps = e.mn[0] <= base.mx[0] && e.mx[0] >= base.mn[0] && e.mn[1] <= base.mx[1] && e.mx[1] >= base.mn[1]
    if (!overlaps) continue
    const trial = [...chosen, f]
    if (plausible(trial.flatMap(x => ringsOf(x.geometry)))) chosen = trial
  }

  const rings = chosen.flatMap(f => ringsOf(f.geometry))
  if (!plausible(rings)) return null
  return { rings, areaKm2: totalArea(rings), source: 'nhd-contained', matchedName: null }
}
