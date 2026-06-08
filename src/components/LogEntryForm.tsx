'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Lake { id: string; name: string; state: string }

export interface LogDraft {
  id?: string
  lake_id?: string | null
  lake_name: string
  lake_state?: string | null
  spot?: string | null
  trip_date: string
  time_of_day?: string | null
  water_temp_f?: number | null
  air_temp_f?: number | null
  sky?: string | null
  wind?: string | null
  water_clarity?: string | null
  water_level?: string | null
  techniques?: string[]
  baits?: string[]
  structure?: string[]
  depth?: string | null
  pattern_notes?: string | null
  fish_count?: number | null
  big_fish_lbs?: number | null
  total_weight_lbs?: number | null
  rating?: number | null
  notes?: string | null
}

const TIME_OPTIONS = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']
const SKY_OPTIONS = ['sunny', 'partly cloudy', 'overcast', 'rain']
const WIND_OPTIONS = ['calm', 'light', 'moderate', 'strong']
const CLARITY_OPTIONS = ['clear', 'stained', 'muddy']
const LEVEL_OPTIONS = ['low', 'normal', 'high', 'rising', 'falling']
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
  const [timeOfDay, setTimeOfDay] = useState<string | null>(initial?.time_of_day || null)

  const [fishCount, setFishCount] = useState<string>(initial?.fish_count != null ? String(initial.fish_count) : '')
  const [bigFish, setBigFish] = useState<string>(initial?.big_fish_lbs != null ? String(initial.big_fish_lbs) : '')
  const [totalWeight, setTotalWeight] = useState<string>(initial?.total_weight_lbs != null ? String(initial.total_weight_lbs) : '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)

  const [waterTemp, setWaterTemp] = useState<string>(initial?.water_temp_f != null ? String(initial.water_temp_f) : '')
  const [airTemp, setAirTemp] = useState<string>(initial?.air_temp_f != null ? String(initial.air_temp_f) : '')
  const [sky, setSky] = useState<string | null>(initial?.sky || null)
  const [wind, setWind] = useState<string | null>(initial?.wind || null)
  const [clarity, setClarity] = useState<string | null>(initial?.water_clarity || null)
  const [level, setLevel] = useState<string | null>(initial?.water_level || null)

  const [techniques, setTechniques] = useState<string[]>(initial?.techniques || [])
  const [baits, setBaits] = useState<string[]>(initial?.baits || [])
  const [structure, setStructure] = useState<string[]>(initial?.structure || [])
  const [depth, setDepth] = useState(initial?.depth || '')
  const [patternNotes, setPatternNotes] = useState(initial?.pattern_notes || '')

  const [notes, setNotes] = useState(initial?.notes || '')

  const [openSection, setOpenSection] = useState<'conditions' | 'technique' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lakeName.trim()) { setError('Add a lake to log this trip.'); return }
    setError('')
    setSaving(true)

    const payload: any = {
      lake_id: lakeId,
      lake_name: lakeName.trim(),
      lake_state: lakeState,
      spot: spot.trim() || null,
      trip_date: tripDate,
      time_of_day: timeOfDay,
      water_temp_f: waterTemp ? Number(waterTemp) : null,
      air_temp_f: airTemp ? Number(airTemp) : null,
      sky, wind, water_clarity: clarity, water_level: level,
      techniques, baits, structure,
      depth: depth.trim() || null,
      pattern_notes: patternNotes.trim() || null,
      fish_count: fishCount ? parseInt(fishCount, 10) : null,
      big_fish_lbs: bigFish ? Number(bigFish) : null,
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
              if (lake) { setLakeName(lake.name); setLakeId(lake.id); setLakeState(lake.state) }
              else { setLakeName(raw); setLakeId(null); setLakeState(null) }
            }}
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={tripDate} max={today} onChange={e => setTripDate(e.target.value)} className="h-9 text-sm" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Fish caught">
          <Input type="number" min="0" inputMode="numeric" placeholder="0" value={fishCount} onChange={e => setFishCount(e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Big fish (lbs)">
          <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={bigFish} onChange={e => setBigFish(e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="How was it?">
          <div className="h-9 flex items-center"><StarRating value={rating} onChange={setRating} /></div>
        </Field>
      </div>

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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Water temp (°F)">
            <Input type="number" inputMode="decimal" placeholder="—" value={waterTemp} onChange={e => setWaterTemp(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Air temp (°F)">
            <Input type="number" inputMode="decimal" placeholder="—" value={airTemp} onChange={e => setAirTemp(e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
        <Field label="Time of day"><SingleChoiceChips options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} /></Field>
        <Field label="Sky"><SingleChoiceChips options={SKY_OPTIONS} value={sky} onChange={setSky} /></Field>
        <Field label="Wind"><SingleChoiceChips options={WIND_OPTIONS} value={wind} onChange={setWind} /></Field>
        <Field label="Water clarity"><SingleChoiceChips options={CLARITY_OPTIONS} value={clarity} onChange={setClarity} /></Field>
        <Field label="Water level"><SingleChoiceChips options={LEVEL_OPTIONS} value={level} onChange={setLevel} /></Field>
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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Depth">
            <Input type="text" placeholder="e.g. 8-12 ft" value={depth} onChange={e => setDepth(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Total weight (lbs)">
            <Input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
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
