'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Lake { id: string; name: string; state: string; lat?: number | null; lng?: number | null }

export interface LogCatch {
  weight?: number | null
  length?: number | null
  bait?: string | null
  technique?: string | null
  time?: string | null
  notes?: string | null
}

export interface LogDraft {
  id?: string
  lake_id?: string | null
  lake_name: string
  lake_state?: string | null
  lat?: number | null
  lng?: number | null
  spot?: string | null
  trip_date: string
  time_of_day?: string[] | null
  water_temp_f?: number | null
  air_temp_f?: number | null
  sky?: string | null
  wind?: string | null
  water_clarity?: string | null
  water_level?: string | null
  techniques?: string[]
  baits?: string[]
  structure?: string[]
  depth?: string[] | null
  pattern_notes?: string | null
  fish_count?: number | null
  big_fish_lbs?: number | null
  big_fish_entries?: number[] | null
  catches?: LogCatch[] | null
  total_weight_lbs?: number | null
  rating?: number | null
  notes?: string | null
}

const TIME_OPTIONS = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']
const SKY_OPTIONS = ['sunny', 'partly cloudy', 'overcast', 'rain']
const WIND_OPTIONS = ['calm', 'light', 'moderate', 'strong']
const CLARITY_OPTIONS = ['clear', 'stained', 'muddy']
const LEVEL_OPTIONS = ['low', 'normal', 'high', 'rising', 'falling']
const DEPTH_OPTIONS = ['0-5 ft', '5-10 ft', '10-15 ft', '15-20 ft', '20-30 ft', '30+ ft']
const TECHNIQUE_OPTIONS = [
  'flipping', 'pitching', 'punching', 'dock skipping', 'drop shot', 'ned rig', 'shakey head',
  'crankbaiting', 'jerkbaiting', 'topwater', 'frogging', 'chatterbait', 'spinnerbait',
  'swim jig', 'carolina rig', 'texas rig', 'wacky rig', 'umbrella rig',
]
const STRUCTURE_OPTIONS = [
  'points', 'docks', 'grass', 'riprap', 'creek channel', 'standing timber',
  'rock piles', 'laydowns', 'bridges', 'ledges', 'humps', 'brush piles',
]

function chipClass(active: boolean) {
  return `px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`
}

function ChipToggleGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)} className={chipClass(selected.includes(opt))}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function SingleChoiceChips({ options, value, onChange }: { options: string[]; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(value === opt ? null : opt)} className={chipClass(value === opt)}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  function addTag() {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-blue-900"><X size={11} /></button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
        onBlur={addTag}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 text-slate-800 h-9 text-sm rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
      />
    </div>
  )
}

function StarRating({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(value === n ? null : n)} className="text-amber-400 hover:scale-110 transition-transform">
          <Star size={20} fill={value != null && n <= value ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function Section({ title, subtitle, open, onToggle, children }: { title: string; subtitle: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

// Lightweight lake autocomplete — fetches the lake list once and filters client-side.
function LakeAutocomplete({ value, state, onSelect }: { value: string; state?: string | null; onSelect: (lake: Lake | null, rawName: string) => void }) {
  const [lakes, setLakes] = useState<Lake[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(d => setLakes(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = query.length > 0
    ? lakes.filter(l => l.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : []

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={open ? query : (value ? `${value}${state ? ` — ${state}` : ''}` : query)}
          onChange={e => { setQuery(e.target.value); onSelect(null, e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setQuery('') }}
          placeholder="Search for a lake..."
          className="w-full bg-white border border-slate-200 text-slate-800 h-9 text-sm rounded-md pl-8 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
        />
        {value && (
          <button type="button" onClick={() => { onSelect(null, ''); setQuery('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(l => (
            <button key={l.id} type="button" onMouseDown={() => { onSelect(l, l.name); setQuery(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-800 flex items-center justify-between gap-2">
              <span>{l.name}</span>
              <span className="text-slate-400 text-xs shrink-0">{l.state}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-slate-400">
          No match — we'll save "{query}" as a custom water.
        </div>
      )}
    </div>
  )
}

export function LogEntryForm({ initial, onCancel, onSaved }: { initial?: Partial<LogDraft>; onCancel: () => void; onSaved: (saved: any) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [lakeName, setLakeName] = useState(initial?.lake_name || '')
  const [lakeId, setLakeId] = useState<string | null>(initial?.lake_id || null)
  const [lakeState, setLakeState] = useState<string | null>(initial?.lake_state || null)
  const [spot, setSpot] = useState(initial?.spot || '')
  const [tripDate, setTripDate] = useState(initial?.trip_date || today)
  const [timeOfDay, setTimeOfDay] = useState<string[]>(initial?.time_of_day || [])

  const [fishCount, setFishCount] = useState<string>(initial?.fish_count != null ? String(initial.fish_count) : '')
  const [bigFishEntries, setBigFishEntries] = useState<number[]>(
    initial?.big_fish_entries?.length ? initial.big_fish_entries
    : initial?.big_fish_lbs != null ? [initial.big_fish_lbs]
    : []
  )
  const [bigFishDraft, setBigFishDraft] = useState('')
  const [totalWeight, setTotalWeight] = useState<string>(initial?.total_weight_lbs != null ? String(initial.total_weight_lbs) : '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)

  const [waterTemp, setWaterTemp] = useState<string>(initial?.water_temp_f != null ? String(initial.water_temp_f) : '')
  const [airTemp, setAirTemp] = useState<string>(initial?.air_temp_f != null ? String(initial.air_temp_f) : '')
  const [sky, setSky] = useState<string | null>(initial?.sky || null)
  const [wind, setWind] = useState<string | null>(initial?.wind || null)
  const [clarity, setClarity] = useState<string | null>(initial?.water_clarity || null)
  const [level, setLevel] = useState<string | null>(initial?.water_level || null)
  const [autoFillNote, setAutoFillNote] = useState('')
  const [autoFilling, setAutoFilling] = useState(false)
  const [lakeCoords, setLakeCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  )
  const conditionsTouchedRef = useRef(false)

  const [techniques, setTechniques] = useState<string[]>(initial?.techniques || [])
  const [baits, setBaits] = useState<string[]>(initial?.baits || [])
  const [structure, setStructure] = useState<string[]>(initial?.structure || [])
  const [depth, setDepth] = useState<string[]>(initial?.depth || [])
  const [patternNotes, setPatternNotes] = useState(initial?.pattern_notes || '')

  const [catches, setCatches] = useState<LogCatch[]>(initial?.catches || [])

  const [notes, setNotes] = useState(initial?.notes || '')

  const [openSection, setOpenSection] = useState<'conditions' | 'technique' | 'catches' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function addBigFish() {
    const n = parseFloat(bigFishDraft)
    if (!isNaN(n) && n > 0) setBigFishEntries(prev => [...prev, n])
    setBigFishDraft('')
  }

  function addCatch() {
    setCatches(prev => [...prev, {}])
    setOpenSection('catches')
  }
  function updateCatch(i: number, patch: Partial<LogCatch>) {
    setCatches(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }
  function removeCatch(i: number) {
    setCatches(prev => prev.filter((_, idx) => idx !== i))
  }

  // Mark conditions as user-touched once they manually change anything in that
  // section, so a later auto-fill (e.g. lake/date change) won't clobber it.
  function markTouched<T>(setter: (v: T) => void) {
    return (v: T) => { conditionsTouchedRef.current = true; setter(v) }
  }

  // Auto-populate Conditions from real weather/lake data once both a lake (with
  // known coordinates) and a date are set — but only fill fields the angler
  // hasn't already touched, so it never overwrites a manual entry.
  useEffect(() => {
    if (!lakeCoords || !tripDate) return
    let cancelled = false
    setAutoFilling(true)
    setAutoFillNote('')

    function bucketWind(mph: number | null | undefined): string | null {
      if (mph == null) return null
      if (mph < 5) return 'calm'
      if (mph < 12) return 'light'
      if (mph < 20) return 'moderate'
      return 'strong'
    }
    function mapSky(s: string | null | undefined): string | null {
      if (!s) return null
      const v = s.toLowerCase()
      if (v.includes('sun') || v.includes('clear')) return 'sunny'
      if (v.includes('partly')) return 'partly cloudy'
      if (v.includes('rain') || v.includes('storm')) return 'rain'
      if (v.includes('cloud') || v.includes('overcast')) return 'overcast'
      return null
    }

    Promise.all([
      fetch(`/api/weather?lat=${lakeCoords.lat}&lng=${lakeCoords.lng}&date=${tripDate}`).then(r => r.json()).catch(() => null),
      lakeId ? fetch(`/api/lake-conditions?lakeId=${lakeId}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([weatherData, condData]) => {
      if (cancelled) return
      const conditions = condData?.conditions
      const filled: string[] = []

      if (!conditionsTouchedRef.current) {
        if (!waterTemp && conditions?.waterTempF != null) { setWaterTemp(String(Math.round(conditions.waterTempF))); filled.push('water temp') }
        if (!airTemp && weatherData?.tempF != null) { setAirTemp(String(Math.round(weatherData.tempF))); filled.push('air temp') }
        if (!sky) { const s = mapSky(weatherData?.skyCondition); if (s) { setSky(s); filled.push('sky') } }
        if (!wind) { const w = bucketWind(weatherData?.windMph); if (w) { setWind(w); filled.push('wind') } }
        if (!level && conditions?.waterLevel?.status) { setLevel(String(conditions.waterLevel.status).toLowerCase()); filled.push('water level') }
      }

      if (filled.length) setAutoFillNote(`Auto-filled ${filled.join(', ')} from today's conditions for this lake — adjust anything that doesn't match what you saw on the water.`)
      setAutoFilling(false)
    }).catch(() => { if (!cancelled) setAutoFilling(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lakeCoords, tripDate, lakeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lakeName.trim()) { setError('Add a lake to log this trip.'); return }
    setError('')
    setSaving(true)

    const payload: any = {
      lake_id: lakeId,
      lake_name: lakeName.trim(),
      lake_state: lakeState,
      lat: lakeCoords?.lat ?? null,
      lng: lakeCoords?.lng ?? null,
      spot: spot.trim() || null,
      trip_date: tripDate,
      time_of_day: timeOfDay,
      water_temp_f: waterTemp ? Number(waterTemp) : null,
      air_temp_f: airTemp ? Number(airTemp) : null,
      sky, wind, water_clarity: clarity, water_level: level,
      techniques, baits, structure,
      depth,
      pattern_notes: patternNotes.trim() || null,
      fish_count: fishCount ? parseInt(fishCount, 10) : null,
      big_fish_entries: bigFishEntries,
      big_fish_lbs: bigFishEntries.length ? Math.max(...bigFishEntries) : null,
      catches: catches.filter(c => c.weight != null || c.length != null || c.bait || c.technique || c.time || c.notes),
      total_weight_lbs: totalWeight ? Number(totalWeight) : null,
      rating,
      notes: notes.trim() || null,
    }

    try {
      const res = await fetch(initial?.id ? `/api/logs/${initial.id}` : '/api/logs', {
        method: initial?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not save your log.')
      onSaved(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Always-visible essentials — minimal effort path */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Lake">
          <LakeAutocomplete
            value={lakeName}
            state={lakeState}
            onSelect={(lake, raw) => {
              if (lake) {
                setLakeName(lake.name); setLakeId(lake.id); setLakeState(lake.state)
                setLakeCoords(lake.lat != null && lake.lng != null ? { lat: lake.lat, lng: lake.lng } : null)
              } else {
                setLakeName(raw); setLakeId(null); setLakeState(null); setLakeCoords(null)
              }
            }}
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={tripDate} max={today} onChange={e => setTripDate(e.target.value)} className="h-9 text-sm" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fish caught">
          <Input type="number" min="0" inputMode="numeric" placeholder="0" value={fishCount} onChange={e => setFishCount(e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Big fish (lbs) — add each one">
          <div>
            {bigFishEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {bigFishEntries.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {w} lb
                    <button type="button" onClick={() => setBigFishEntries(es => es.filter((_, idx) => idx !== i))} className="hover:text-amber-900"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <Input
              type="number" min="0" step="0.1" inputMode="decimal" placeholder="e.g. 5.4 — press Enter to add"
              value={bigFishDraft}
              onChange={e => setBigFishDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBigFish() } }}
              onBlur={addBigFish}
              className="h-9 text-sm"
            />
          </div>
        </Field>
      </div>

      <Field label="How was the trip overall? (star rating)">
        <div className="h-9 flex items-center"><StarRating value={rating} onChange={setRating} /></div>
      </Field>

      <Field label="Spot (optional)">
        <Input type="text" placeholder="e.g. north riprap near the dam" value={spot} onChange={e => setSpot(e.target.value)} className="h-9 text-sm" />
      </Field>

      {/* Optional deep-dive sections — add value without adding friction */}
      <Section
        title="Conditions"
        subtitle="Weather, water temp, clarity, wind — what you were fishing in"
        open={openSection === 'conditions'}
        onToggle={() => setOpenSection(s => s === 'conditions' ? null : 'conditions')}
      >
        {autoFilling && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Looking up conditions for this lake and date…</p>
        )}
        {!autoFilling && autoFillNote && (
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{autoFillNote}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Water temp (°F)">
            <Input type="number" inputMode="decimal" placeholder="—" value={waterTemp} onChange={e => markTouched(setWaterTemp)(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Air temp (°F)">
            <Input type="number" inputMode="decimal" placeholder="—" value={airTemp} onChange={e => markTouched(setAirTemp)(e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
        <Field label="Time of day (select all that apply)"><ChipToggleGroup options={TIME_OPTIONS} selected={timeOfDay} onToggle={v => toggle(timeOfDay, setTimeOfDay, v)} /></Field>
        <Field label="Sky"><SingleChoiceChips options={SKY_OPTIONS} value={sky} onChange={markTouched(setSky)} /></Field>
        <Field label="Wind"><SingleChoiceChips options={WIND_OPTIONS} value={wind} onChange={markTouched(setWind)} /></Field>
        <Field label="Water clarity"><SingleChoiceChips options={CLARITY_OPTIONS} value={clarity} onChange={markTouched(setClarity)} /></Field>
        <Field label="Water level"><SingleChoiceChips options={LEVEL_OPTIONS} value={level} onChange={markTouched(setLevel)} /></Field>
      </Section>

      <Section
        title="Technique &amp; Pattern"
        subtitle="What you threw, where, and how deep"
        open={openSection === 'technique'}
        onToggle={() => setOpenSection(s => s === 'technique' ? null : 'technique')}
      >
        <Field label="Techniques"><ChipToggleGroup options={TECHNIQUE_OPTIONS} selected={techniques} onToggle={v => toggle(techniques, setTechniques, v)} /></Field>
        <Field label="Baits"><TagInput values={baits} onChange={setBaits} placeholder="Type a bait and press Enter — e.g. Texas-rigged Senko" /></Field>
        <Field label="Structure / cover"><ChipToggleGroup options={STRUCTURE_OPTIONS} selected={structure} onToggle={v => toggle(structure, setStructure, v)} /></Field>
        <Field label="Depth (select all that apply)"><ChipToggleGroup options={DEPTH_OPTIONS} selected={depth} onToggle={v => toggle(depth, setDepth, v)} /></Field>
        <Field label="Total weight (lbs)">
          <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} className="h-9 text-sm sm:max-w-[12rem]" />
        </Field>
        <Field label="Pattern notes">
          <textarea
            value={patternNotes}
            onChange={e => setPatternNotes(e.target.value)}
            placeholder="What was working — depth, retrieve, color, time of day patterns..."
            rows={2}
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 resize-none"
          />
        </Field>
      </Section>

      <Section
        title="Individual Catches (optional)"
        subtitle="Log specific fish — weight, length, bait, time — one by one"
        open={openSection === 'catches'}
        onToggle={() => setOpenSection(s => s === 'catches' ? null : 'catches')}
      >
        {catches.length === 0 && (
          <p className="text-xs text-slate-400">No individual catches logged yet — add one if you want to track specific fish in detail.</p>
        )}
        <div className="space-y-3">
          {catches.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2.5 relative">
              <button type="button" onClick={() => removeCatch(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={14} /></button>
              <p className="text-xs font-bold text-slate-500">Catch #{i + 1}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Field label="Weight (lbs)">
                  <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={c.weight ?? ''} onChange={e => updateCatch(i, { weight: e.target.value ? Number(e.target.value) : null })} className="h-9 text-sm" />
                </Field>
                <Field label="Length (in)">
                  <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={c.length ?? ''} onChange={e => updateCatch(i, { length: e.target.value ? Number(e.target.value) : null })} className="h-9 text-sm" />
                </Field>
                <Field label="Time">
                  <Input type="text" placeholder="e.g. 7:40am" value={c.time ?? ''} onChange={e => updateCatch(i, { time: e.target.value })} className="h-9 text-sm" />
                </Field>
                <Field label="Bait">
                  <Input type="text" placeholder="e.g. Senko" value={c.bait ?? ''} onChange={e => updateCatch(i, { bait: e.target.value })} className="h-9 text-sm" />
                </Field>
              </div>
              <Field label="Technique">
                <Input type="text" placeholder="e.g. wacky rig along the riprap" value={c.technique ?? ''} onChange={e => updateCatch(i, { technique: e.target.value })} className="h-9 text-sm" />
              </Field>
              <Field label="Notes">
                <Input type="text" placeholder="anything else worth noting about this fish" value={c.notes ?? ''} onChange={e => updateCatch(i, { notes: e.target.value })} className="h-9 text-sm" />
              </Field>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCatch} className="text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50">
          + Add a catch
        </Button>
      </Section>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything else worth remembering about this trip..."
          rows={2}
          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 resize-none"
        />
      </Field>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6">
          {saving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving...</span> : (initial?.id ? 'Save Changes' : 'Log This Trip')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="h-10 px-4 text-slate-500">Cancel</Button>
      </div>
    </form>
  )
}
