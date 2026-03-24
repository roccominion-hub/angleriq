'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Logo } from '@/components/Logo'
import { LakeMap } from '@/components/LakeMap'
import {
  MapPin, Trophy, Sparkles, Fish, Layers, Anchor,
  Sun, Clock, Thermometer, ExternalLink, ChevronDown, ChevronUp, Wind, Droplets,
  ShoppingCart, RefreshCw, Route, Zap, Feather, Cloud, Search, X, Calendar, Moon
} from 'lucide-react'
import { BaitIcon } from '@/components/BaitIcon'
import { solunarRatingColor, getMoonAge, getMoonIllumination, getMoonPhaseLabel, getSolunarRating, getMoonData, type MoonData } from '@/lib/moonphase'

interface Lake { id: string; name: string; state: string; type: string; species: string[]; lat?: number; lng?: number }
interface BaitRecord { bait_type: string; bait_name: string; color: string; weight_oz: number; product_url: string; retailer: string; line_type: string; line_lb_test: number }
interface Weather { tempF: number; feelsLikeF: number; cloudCoverPct: number; windMph: number; precipitation: number; skyCondition: string; timeOfDay: string; season: string; weatherDesc: string; moon?: MoonData }
interface SearchResult {
  water: Lake & { lat: number; lng: number }
  sampleSize: number
  topBaits: { name: string; count: number }[]
  topPatterns: { pattern: string; count: number }[]
  reports: any[]
  coords?: { lat: number; lng: number }
}
interface MilkRunPattern { number: number; name: string; why: string; how: string; where: string }

const CURRENT_YEAR = new Date().getFullYear()

// Map bait names/types to their canonical technique
function inferTechnique(baitName: string, baitType: string, storedPresentation: string): string {
  const combined = `${baitName} ${baitType}`.toLowerCase()

  // Crankbaits
  if (combined.match(/10xd|6xd|8xd|deep.?crank|deep.?div/)) return 'Deep cranking'
  if (combined.match(/squarebill|square.?bill/)) return 'Squarebill cranking'
  if (combined.match(/lipless|rat-l|rattle/)) return 'Ripping lipless'
  if (combined.match(/crankbait|crank bait/)) return 'Cranking'
  if (combined.match(/jerkbait|jerk bait/) && !combined.includes('soft')) return 'Jerkbait'

  // Topwater
  if (combined.match(/popper|chug/)) return 'Popping'
  if (combined.match(/buzzbait|buzz bait/)) return 'Buzzing'
  if (combined.match(/topwater|spook|walker|walk.the.dog/)) return 'Walking topwater'
  if (combined.match(/frog/) && !combined.includes('toad')) return 'Frogging'
  if (combined.match(/toad|ribbit|horny toad/)) return 'Swimming toad'

  // Swimbaits / bladed
  if (combined.match(/swimbait|swim bait|paddle tail/)) return 'Swimbaiting'
  if (combined.match(/swimjig|swim jig/)) return 'Swimming jig'
  if (combined.match(/bladed|chatterbait|chatter bait|vibrating jig/)) return 'Bladed jig'
  if (combined.match(/spinnerbait|spinner bait/)) return 'Spinnerbait'

  // Jigs
  if (combined.match(/football jig/)) return 'Football jig'
  if (combined.match(/flipping jig|punch/)) return 'Flipping & pitching'
  if (combined.match(/jig/) && !combined.match(/swim|blade|spin/)) return 'Jigging'

  // Finesse
  if (combined.match(/drop.?shot|dropshot/)) return 'Drop shot'
  if (combined.match(/ned|trd|mushroom/)) return 'Ned rig'
  if (combined.match(/damiki/)) return 'Damiki rig'
  if (combined.match(/shaky.?head|shakey.?head/)) return 'Shaky head'
  if (combined.match(/wacky|neko/)) return 'Wacky / Neko rig'
  if (combined.match(/senko|stick.?bait/)) return 'Weightless stickbait'

  // Soft plastics
  if (combined.match(/carolina|c-rig/) || storedPresentation?.toLowerCase().includes('carolina')) {
    // Only use Carolina rig if the bait is actually fished that way
    if (combined.match(/lizard|worm|craw|creature|tube/)) return 'Carolina rig'
  }
  if (combined.match(/texas|t-rig/)) return 'Texas rig'
  if (combined.match(/fluke|soft.?jerk|slug|minnow/) && !combined.includes('ned')) return 'Soft jerkbait'
  if (combined.match(/worm/)) return 'Worm fishing'
  if (combined.match(/craw|crawfish/)) return 'Craw presentation'
  if (combined.match(/creature|brush hog|beaver/)) return 'Flipping creature'
  if (combined.match(/tube/)) return 'Tube fishing'
  if (combined.match(/grub/)) return 'Grub fishing'

  // Dice / fuzzy
  if (combined.match(/dice|tumbleweed|nuki|cue bomb|fuzzy/)) return 'Dice bait — finesse'

  // Spoon
  if (combined.match(/spoon/)) return 'Spooning'

  // Fall back to stored presentation if it seems reasonable (not a rig name mismatch)
  const rigs = ['texas rig', 'carolina rig', 'drop shot', 'ned rig', 'shaky head']
  const isPresentationRig = rigs.some(r => storedPresentation?.toLowerCase().includes(r))
  const isBaitHardware = combined.match(/crank|jerk|spinner|topwater|bladed|swimbait|frog|buzzbait/)
  if (isPresentationRig && isBaitHardware) return '—' // mismatch — don't show bad data
  return storedPresentation || '—'
}

function getTackleSetup(baitType: string, _weightOz: number) {
  const bt = baitType.toLowerCase()
  if (bt.includes('jig') || bt.includes('texas') || bt.includes('soft plastic')) {
    return { reel: 'Baitcaster', rod: `7'3" Heavy Fast Action`, lineType: 'Fluorocarbon', lineLb: '15-17 lb' }
  }
  if (bt.includes('crankbait') || bt.includes('jerkbait')) {
    return { reel: 'Baitcaster', rod: `7'0" Medium Heavy Moderate Action`, lineType: 'Fluorocarbon', lineLb: '10-14 lb' }
  }
  if (bt.includes('topwater') || bt.includes('popper') || bt.includes('frog')) {
    return { reel: 'Baitcaster', rod: `7'3" Heavy Fast Action`, lineType: 'Braided', lineLb: '50-65 lb' }
  }
  if (bt.includes('swimbait')) {
    return { reel: 'Baitcaster', rod: `7'6" Heavy Moderate Action`, lineType: 'Fluorocarbon', lineLb: '15-20 lb' }
  }
  if (bt.includes('spinnerbait') || bt.includes('bladed')) {
    return { reel: 'Baitcaster', rod: `7'0" Medium Heavy Moderate Fast Action`, lineType: 'Fluorocarbon', lineLb: '14-17 lb' }
  }
  if (bt.includes('drop shot') || bt.includes('finesse') || bt.includes('ned')) {
    return { reel: 'Spinning', rod: `6'10" Medium Light Fast Action`, lineType: 'Braid to Fluoro leader', lineLb: '10 lb braid / 6-8 lb fluoro' }
  }
  return { reel: 'Baitcaster', rod: `7'0" Medium Heavy Fast Action`, lineType: 'Fluorocarbon', lineLb: '12-17 lb' }
}

function FilterSelect({ label, icon, value, onValueChange, options, placeholder, required, autoFilled }: {
  label: string; icon: React.ReactNode; value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  required?: boolean
  autoFilled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
        {icon}{label}
        {required && <span className="text-red-400 font-bold leading-none">*</span>}
        {autoFilled && (
          <span className="normal-case font-semibold text-[10px] text-green-700 bg-green-50 border border-green-200 px-1 py-0.5 rounded leading-none">auto</span>
        )}
      </label>
      <select
        value={value}
        onChange={e => onValueChange(e.target.value)}
        className={`text-slate-800 h-9 text-sm rounded-md px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          autoFilled
            ? 'bg-green-50 border border-green-300'
            : 'bg-white border border-slate-200'
        }`}
      >
        <option value="all">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function WeatherBar({ weather }: { weather: Weather }) {
  const moon = weather.moon
  const solunarColors = moon ? solunarRatingColor(moon.solunarRating) : ''
  const [showSolunar, setShowSolunar] = useState(true)

  return (
    <div className="space-y-2">
      {/* Current conditions row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
        <span className="font-bold text-slate-800">{weather.tempF}°F</span>
        <span className="text-slate-400">·</span>
        <span className="capitalize">{weather.skyCondition}</span>
        <span className="text-slate-400">·</span>
        <span className="flex items-center gap-1"><Wind size={13} />{weather.windMph} mph</span>
        {weather.precipitation > 0 && (
          <><span className="text-slate-400">·</span>
          <span className="flex items-center gap-1"><Droplets size={13} />{weather.precipitation}mm</span></>
        )}
        <span className="text-slate-400">·</span>
        <span className="capitalize text-blue-600 font-semibold">{weather.timeOfDay}</span>

        {/* Moon + solunar inline */}
        {moon && (
          <>
            <span className="text-slate-400">·</span>
            <button
              onClick={() => setShowSolunar(o => !o)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${solunarColors}`}
            >
              <span>{moon.emoji}</span>
              <span>{moon.phase}</span>
              <span className="opacity-60">· {moon.illumination}%</span>
              <ChevronDown size={11} className={`transition-transform ${showSolunar ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}
      </div>

      {/* Solunar detail panel */}
      {moon && showSolunar && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Moon Phase</p>
            <p className="font-bold">{moon.emoji} {moon.phase}</p>
            <p className="text-slate-300">{moon.illumination}% illuminated</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Solunar Activity</p>
            <p className={`font-bold capitalize ${moon.solunarRating === 'excellent' ? 'text-green-400' : moon.solunarRating === 'good' ? 'text-blue-400' : moon.solunarRating === 'fair' ? 'text-amber-400' : 'text-slate-400'}`}>
              {moon.solunarLabel}
            </p>
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Major Periods</p>
            {moon.majorPeriods.map((p, i) => <p key={i} className="text-green-300 font-semibold">{p}</p>)}
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Minor Periods</p>
            {moon.minorPeriods.map((p, i) => <p key={i} className="text-blue-300">{p}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}

// Hot search combobox for lake selection
function LakeSearchBox({ lakes, value, onChange }: { lakes: Lake[]; value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.length > 0
    ? lakes.filter(l => `${l.name} ${l.state}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : lakes.slice(0, 12)

  const selectedLake = lakes.find(l => l.name === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectLake(lake: Lake) {
    onChange(lake.name)
    setQuery('')
    setOpen(false)
  }

  function clearSelection() {
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <MapPin size={12} /> Body of Water
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedLake ? `${selectedLake.name} — ${selectedLake.state}` : 'Search lakes, rivers, reservoirs...'}
          value={open ? query : (selectedLake ? `${selectedLake.name} — ${selectedLake.state}` : query)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); if (selectedLake) setQuery('') }}
          className="w-full bg-white border border-slate-200 text-slate-800 h-9 text-sm rounded-md pl-8 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
        />
        {(value || query) && (
          <button onClick={clearSelection} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No lakes found</div>
          ) : (
            filtered.map(l => (
              <button
                key={l.id}
                onMouseDown={() => selectLake(l)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 ${value === l.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800'}`}
              >
                <span>{l.name}</span>
                <span className="text-slate-400 text-xs shrink-0">{l.state}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function BuyButton({ baitName }: { baitName: string }) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(baitName + ' fishing lure buy')}`
  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
    >
      <ShoppingCart size={12} /> Buy This Bait
    </a>
  )
}

export default function SearchPage() {
  const [lakes, setLakes] = useState<Lake[]>([])
  const [selectedLake, setSelectedLake] = useState('')

  // Right-now filters
  const [nowFilters, setNowFilters] = useState({
    baitType: 'all', fishDepth: 'all', locationType: 'all',
    structure: 'all', waterClarity: 'all', style: 'all',
  })
  const [yearRange, setYearRange] = useState([2019, CURRENT_YEAR])

  // Scenario filters (different time / conditions)
  const [scenarioFilters, setScenarioFilters] = useState({
    season: 'all', timeOfDay: 'all', weatherConditions: 'all',
    waterTemp: 'all', waterClarity: 'all', baitType: 'all',
    fishDepth: 'all', locationType: 'all', structure: 'all',
  })

  // Future Trip state
  const [tripDate, setTripDate] = useState('')
  const [futureMoon, setFutureMoon] = useState<MoonData | null>(null)
  const [futureWeatherLoading, setFutureWeatherLoading] = useState(false)
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterTab, setFilterTab] = useState<'now' | 'scenario'>('now')
  const [reportsOpen, setReportsOpen] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [summary, setSummary] = useState<{ intel: string; today: string }>({ intel: '', today: '' })
  const [secondaryRec, setSecondaryRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [milkRunLoading, setMilkRunLoading] = useState(false)
  const [milkRun, setMilkRun] = useState<{ patterns: MilkRunPattern[]; proTip: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(setLakes)
  }, [])

  function setNowFilter(key: string, value: string) {
    setNowFilters(f => ({ ...f, [key]: value }))
  }
  function setScenarioFilter(key: string, value: string) {
    setScenarioFilters(f => ({ ...f, [key]: value }))
  }
  function setScenarioFilterManual(key: string, value: string) {
    setScenarioFilters(f => ({ ...f, [key]: value }))
    setAutoFilled(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleTripDateChange(date: string) {
    setTripDate(date)
    if (!date) {
      setFutureMoon(null)
      setAutoFilled(new Set())
      return
    }

    // Compute season and moon from date locally
    const d = new Date(date + 'T12:00:00Z')
    const month = d.getUTCMonth() + 1
    const season = month >= 3 && month <= 5 ? 'spring'
      : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'fall' : 'winter'

    // Use result coords if available, else 0/0 (moon phase doesn't need lat/lng for phase)
    const lat = result?.coords?.lat ?? 0
    const lng = result?.coords?.lng ?? 0
    const moon = getMoonData(d, lat, lng, 0)
    setFutureMoon(moon)

    const newAutoFilled = new Set<string>(['season'])
    setScenarioFilter('season', season)

    // Fetch forecast weather if coords are available
    if (result?.coords?.lat && result?.coords?.lng) {
      const now = new Date()
      const daysOut = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysOut > 0 && daysOut <= 16) {
        setFutureWeatherLoading(true)
        try {
          const wRes = await fetch(`/api/weather?lat=${lat}&lng=${lng}&date=${date}`)
          const wData = await wRes.json()
          if (wData.forecastAvailable) {
            if (wData.weatherConditions && wData.weatherConditions !== 'all') {
              setScenarioFilter('weatherConditions', wData.weatherConditions)
              newAutoFilled.add('weatherConditions')
            }
          }
        } catch { /* weather optional */ } finally {
          setFutureWeatherLoading(false)
        }
      }
    }

    setAutoFilled(newAutoFilled)
  }

  // Merge active filters for API call
  function buildApiFilters(isScenario = false) {
    if (isScenario) {
      return {
        season: scenarioFilters.season,
        timeOfDay: scenarioFilters.timeOfDay,
        baitType: scenarioFilters.baitType !== 'all' ? scenarioFilters.baitType : nowFilters.baitType,
        fishDepth: scenarioFilters.fishDepth !== 'all' ? scenarioFilters.fishDepth : nowFilters.fishDepth,
        locationType: scenarioFilters.locationType !== 'all' ? scenarioFilters.locationType : nowFilters.locationType,
        structure: scenarioFilters.structure !== 'all' ? scenarioFilters.structure : nowFilters.structure,
        waterClarity: scenarioFilters.waterClarity !== 'all' ? scenarioFilters.waterClarity : nowFilters.waterClarity,
      }
    }
    return {
      baitType: nowFilters.baitType,
      fishDepth: nowFilters.fishDepth,
      locationType: nowFilters.locationType,
      structure: nowFilters.structure,
      waterClarity: nowFilters.waterClarity,
    }
  }

  async function handleSearch() {
    if (!selectedLake) return
    setLoading(true)
    setSummaryLoading(true)
    setError('')
    setResult(null)
    setSummary({ intel: '', today: '' })
    setSecondaryRec('')
    setMilkRun(null)
    setWeather(null)

    try {
      const params = new URLSearchParams({ lake: selectedLake })
      const apiFilters = buildApiFilters()
      Object.entries(apiFilters).forEach(([k, v]) => { if (v !== 'all') params.set(k, v) })
      params.set('yearFrom', String(yearRange[0]))
      params.set('yearTo', String(yearRange[1]))

      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); setSummaryLoading(false); return }
      setResult(data)
      setLoading(false)

      let currentWeather: Weather | null = null
      if (data.coords?.lat && data.coords?.lng) {
        try {
          const wRes = await fetch(`/api/weather?lat=${data.coords.lat}&lng=${data.coords.lng}`)
          currentWeather = await wRes.json()
          setWeather(currentWeather)
        } catch { /* weather is optional */ }
      }

      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: data.water?.state,
          sampleSize: data.sampleSize,
          topBaits: data.topBaits,
          topPatterns: data.topPatterns,
          reports: data.reports,
          weather: currentWeather,
          filters: { ...buildApiFilters(), style: nowFilters.style },
        })
      }).then(r => r.json()).then(d => setSummary({ intel: d.intel || '', today: d.today || '' })).finally(() => setSummaryLoading(false))

    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      setSummaryLoading(false)
    }
  }

  async function handleSecondaryRec() {
    if (!result) return
    setSecondaryLoading(true)
    setSecondaryRec('')
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: result.water?.state,
          sampleSize: result.sampleSize,
          topBaits: result.topBaits,
          topPatterns: result.topPatterns,
          reports: result.reports,
          weather,
          filters: { ...buildApiFilters(), style: nowFilters.style },
          _secondary: true,
        })
      })
      const d = await res.json()
      setSecondaryRec(d.today || '')
    } catch { /* ignore */ } finally {
      setSecondaryLoading(false)
    }
  }

  async function handleMilkRun() {
    if (!result || !summary.intel) return
    setMilkRunLoading(true)
    setMilkRun(null)
    try {
      const res = await fetch('/api/milk-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: result.water?.state,
          intel: summary.intel,
          today: summary.today,
          topBaits: result.topBaits,
          topPatterns: result.topPatterns,
          weather,
          filters: buildApiFilters(),
        })
      })
      const d = await res.json()
      setMilkRun(d)
    } catch { /* ignore */ } finally {
      setMilkRunLoading(false)
    }
  }

  function RenderRecommendation({ text }: { text: string }) {
    const lines = text.split('\n')
    return (
      <div className="text-slate-700 text-sm leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim()
          if (!trimmed) return null
          if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
            return (
              <div key={i} className="flex gap-2 mb-1">
                <span className="text-green-600 font-bold shrink-0">·</span>
                <span>{trimmed.replace(/^[-•]\s*/, '')}</span>
              </div>
            )
          }
          return <p key={i} className="mb-2">{trimmed}</p>
        })}
      </div>
    )
  }

  const BAIT_OPTIONS = [
    { value: 'soft plastic', label: 'Soft Plastic' }, { value: 'jig', label: 'Jig' },
    { value: 'crankbait', label: 'Crankbait' }, { value: 'jerkbait', label: 'Jerkbait' },
    { value: 'topwater', label: 'Topwater' }, { value: 'swimbait', label: 'Swimbait' },
    { value: 'bladed jig', label: 'Bladed Jig' }, { value: 'spinnerbait', label: 'Spinnerbait' },
    { value: 'spoon', label: 'Spoon' }, { value: 'drop shot', label: 'Drop Shot' },
    { value: 'ned rig', label: 'Ned Rig' },
  ]
  const DEPTH_OPTIONS = [
    { value: 'surface', label: 'Surface' }, { value: 'suspended', label: 'Suspended' }, { value: 'bottom', label: 'Bottom' },
  ]
  const LOCATION_OPTIONS = [
    { value: 'shoreline', label: 'Shoreline' }, { value: 'nearshore', label: 'Near Shore' }, { value: 'offshore', label: 'Offshore' },
  ]
  const STRUCTURE_OPTIONS = [
    { value: 'grass', label: 'Grass' }, { value: 'dock', label: 'Docks' }, { value: 'laydown', label: 'Laydowns' },
    { value: 'point', label: 'Points' }, { value: 'hump', label: 'Humps' }, { value: 'channel', label: 'Channel' },
    { value: 'timber', label: 'Standing Timber' }, { value: 'rock', label: 'Rock' },
  ]
  const CLARITY_OPTIONS = [
    { value: 'clear', label: 'Clear' }, { value: 'stained', label: 'Stained' }, { value: 'muddy', label: 'Muddy' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href="/"><Logo className="h-7 w-auto" /></Link>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
          Get Started Free
        </Button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fishing Intel Search</h1>
          <p className="text-slate-500 text-sm mt-1">Tournament-proven techniques and top baits by body of water.</p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          {/* Top row: lake search + actions */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
            <LakeSearchBox lakes={lakes} value={selectedLake} onChange={setSelectedLake} />
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(o => !o)}
                className="text-slate-500 hover:text-slate-700 text-xs h-9 gap-1">
                Filters {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
              <Button onClick={handleSearch} disabled={!selectedLake || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-6 rounded-lg text-sm">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div>
              {/* Tab bar */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setFilterTab('now')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${filterTab === 'now' ? 'border-green-500 text-green-700 bg-green-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <Zap size={14} className={filterTab === 'now' ? 'text-green-600' : 'text-slate-400'} />
                  Right Now
                </button>
                <button
                  onClick={() => setFilterTab('scenario')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${filterTab === 'scenario' ? 'border-purple-500 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <Calendar size={14} className={filterTab === 'scenario' ? 'text-purple-600' : 'text-slate-400'} />
                  Future Trip
                </button>
              </div>

              {/* Right Now tab */}
              {filterTab === 'now' && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-400">Refine the intel and recommendation for your current conditions.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <FilterSelect label="Bait Type" icon={<Fish size={12} />} value={nowFilters.baitType} onValueChange={v => setNowFilter('baitType', v)} placeholder="All baits" options={BAIT_OPTIONS} />
                    <FilterSelect label="Fish Depth" icon={<Layers size={12} />} value={nowFilters.fishDepth} onValueChange={v => setNowFilter('fishDepth', v)} placeholder="Any depth" options={DEPTH_OPTIONS} />
                    <FilterSelect label="Location" icon={<Anchor size={12} />} value={nowFilters.locationType} onValueChange={v => setNowFilter('locationType', v)} placeholder="Any location" options={LOCATION_OPTIONS} />
                    <FilterSelect label="Structure" icon={<Layers size={12} />} value={nowFilters.structure} onValueChange={v => setNowFilter('structure', v)} placeholder="Any structure" options={STRUCTURE_OPTIONS} />
                    <FilterSelect label="Water Clarity" icon={<Droplets size={12} />} value={nowFilters.waterClarity} onValueChange={v => setNowFilter('waterClarity', v)} placeholder="Any clarity" options={CLARITY_OPTIONS} />
                    <FilterSelect label="Style" icon={<Feather size={12} />} value={nowFilters.style} onValueChange={v => setNowFilter('style', v)} placeholder="Any style"
                      options={[{ value: 'power', label: '💪 Power Fishing' }, { value: 'finesse', label: '🪶 Finesse Fishing' }]} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={12} /> Year Range: {yearRange[0]} – {yearRange[1]}
                      <span className="ml-1 normal-case font-normal text-slate-400">— adjusts which historical reports are used</span>
                    </label>
                    <div className="px-1">
                      <Slider min={2015} max={CURRENT_YEAR} step={1} value={yearRange}
                        onValueChange={(v: number | readonly number[]) => setYearRange(Array.isArray(v) ? [...v] : [v as number, v as number])}
                        className="w-full" />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>2015</span><span>{CURRENT_YEAR}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Future Trip tab */}
              {filterTab === 'scenario' && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-400">
                    Plan intel for a future trip. Select a date and we&apos;ll auto-fill season, moon phase, and — if your trip is within 16 days — forecast weather conditions.
                    Fields marked <span className="text-red-400 font-bold">*</span> are required for the best intel.
                  </p>

                  {/* Date Picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={12} /> Trip Date
                    </label>
                    <div className="flex items-center flex-wrap gap-3">
                      <input
                        type="date"
                        value={tripDate}
                        onChange={e => handleTripDateChange(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-white border border-slate-200 text-slate-800 h-9 text-sm rounded-md px-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      {futureWeatherLoading && (
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <RefreshCw size={11} className="animate-spin" /> Fetching forecast…
                        </span>
                      )}
                      {tripDate && !futureWeatherLoading && autoFilled.size > 0 && (
                        <span className="text-xs text-green-700 font-semibold flex items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded-md">
                          ✓ Conditions auto-filled from {autoFilled.has('weatherConditions') ? 'forecast' : 'date'}
                        </span>
                      )}
                      {tripDate && !result?.coords && (
                        <span className="text-xs text-slate-400 italic">Select a lake and search to auto-fill weather</span>
                      )}
                    </div>
                  </div>

                  {/* Moon Phase Panel (auto-shown when date selected) */}
                  {futureMoon && tripDate && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Moon size={12} /> Moon &amp; Solunar — {new Date(tripDate + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="bg-slate-900 text-white rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Moon Phase</p>
                          <p className="font-bold">{futureMoon.emoji} {futureMoon.phase}</p>
                          <p className="text-slate-300">{futureMoon.illumination}% illuminated</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Solunar Activity</p>
                          <p className={`font-bold capitalize ${futureMoon.solunarRating === 'excellent' ? 'text-green-400' : futureMoon.solunarRating === 'good' ? 'text-blue-400' : futureMoon.solunarRating === 'fair' ? 'text-amber-400' : 'text-slate-400'}`}>
                            {futureMoon.solunarLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Major Periods</p>
                          {futureMoon.majorPeriods.map((p, i) => <p key={i} className="text-green-300 font-semibold">{p}</p>)}
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Minor Periods</p>
                          {futureMoon.minorPeriods.map((p, i) => <p key={i} className="text-blue-300">{p}</p>)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Condition Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <FilterSelect label="Season" icon={<Sun size={12} />} required
                      autoFilled={autoFilled.has('season')}
                      value={scenarioFilters.season}
                      onValueChange={v => setScenarioFilterManual('season', v)}
                      placeholder="All seasons"
                      options={[{ value: 'spring', label: 'Spring' }, { value: 'summer', label: 'Summer' }, { value: 'fall', label: 'Fall' }, { value: 'winter', label: 'Winter' }]} />
                    <FilterSelect label="Weather" icon={<Cloud size={12} />} required
                      autoFilled={autoFilled.has('weatherConditions')}
                      value={scenarioFilters.weatherConditions}
                      onValueChange={v => setScenarioFilterManual('weatherConditions', v)}
                      placeholder="Any weather"
                      options={[{ value: 'sunny', label: 'Sunny / Clear' }, { value: 'overcast', label: 'Overcast / Cloudy' }, { value: 'rainy', label: 'Rainy / Post-Rain' }, { value: 'windy', label: 'Windy' }, { value: 'cold-front', label: 'Cold Front' }]} />
                    <FilterSelect label="Water Temp" icon={<Thermometer size={12} />} required
                      value={scenarioFilters.waterTemp}
                      onValueChange={v => setScenarioFilterManual('waterTemp', v)}
                      placeholder="Any temp"
                      options={[{ value: 'cold', label: 'Cold (< 50°F)' }, { value: 'cool', label: 'Cool (50–60°F)' }, { value: 'warm', label: 'Warm (60–70°F)' }, { value: 'hot', label: 'Hot (70°F+)' }]} />
                    <FilterSelect label="Time of Day" icon={<Clock size={12} />}
                      value={scenarioFilters.timeOfDay}
                      onValueChange={v => setScenarioFilterManual('timeOfDay', v)}
                      placeholder="Any time"
                      options={[{ value: 'morning', label: 'Morning' }, { value: 'midday', label: 'Midday' }, { value: 'evening', label: 'Evening' }, { value: 'night', label: 'Night' }]} />
                    <FilterSelect label="Water Clarity" icon={<Droplets size={12} />}
                      value={scenarioFilters.waterClarity}
                      onValueChange={v => setScenarioFilterManual('waterClarity', v)}
                      placeholder="Any clarity" options={CLARITY_OPTIONS} />
                    <FilterSelect label="Bait Type" icon={<Fish size={12} />}
                      value={scenarioFilters.baitType}
                      onValueChange={v => setScenarioFilterManual('baitType', v)}
                      placeholder="All baits" options={BAIT_OPTIONS} />
                    <FilterSelect label="Location" icon={<Anchor size={12} />}
                      value={scenarioFilters.locationType}
                      onValueChange={v => setScenarioFilterManual('locationType', v)}
                      placeholder="Any location" options={LOCATION_OPTIONS} />
                    <FilterSelect label="Structure" icon={<Layers size={12} />}
                      value={scenarioFilters.structure}
                      onValueChange={v => setScenarioFilterManual('structure', v)}
                      placeholder="Any structure" options={STRUCTURE_OPTIONS} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{result.water.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{result.water.state} · {result.water.type} · {result.water.species?.join(', ')}</p>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-semibold">{result.sampleSize} tournament reports</Badge>
            </div>

            {weather && <WeatherBar weather={weather} />}

            {/* AI Summary card */}
            <Card className="border-blue-100 shadow-none overflow-hidden">
              {result.coords?.lat && result.coords?.lng && (
                <LakeMap lat={result.coords.lat} lng={result.coords.lng} name={result.water.name} />
              )}
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-blue-800 text-sm font-bold flex items-center gap-2">
                  <Sparkles size={15} /> AnglerIQ Intelligence Report
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {summaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-blue-50" />
                    <Skeleton className="h-4 w-5/6 bg-blue-50" />
                    <Skeleton className="h-4 w-4/6 bg-blue-50" />
                    <div className="pt-3">
                      <Skeleton className="h-4 w-full bg-blue-50" />
                      <Skeleton className="h-4 w-3/4 bg-blue-50 mt-2" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tournament Intel</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{summary.intel}</p>
                    </div>
                    {summary.today && (
                      <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Today&apos;s Recommendation</p>
                          <button
                            onClick={handleSecondaryRec}
                            disabled={secondaryLoading}
                            className="flex items-center gap-1.5 bg-white border border-green-300 text-green-800 hover:bg-green-100 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                          >
                            <RefreshCw size={11} className={secondaryLoading ? 'animate-spin' : ''} />
                            {secondaryLoading ? 'Generating...' : 'Another Approach'}
                          </button>
                        </div>
                        <RenderRecommendation text={summary.today} />
                        {secondaryRec && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Try Something Different</p>
                            </div>
                            <RenderRecommendation text={secondaryRec} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Milk Run */}
                    {!milkRun && summary.intel && (
                      <div className="pt-1">
                        <Button
                          onClick={handleMilkRun}
                          disabled={milkRunLoading}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Route size={15} className={milkRunLoading ? 'animate-pulse' : ''} />
                          {milkRunLoading ? 'Building Your Milk Run...' : 'Generate Milk Run Plan'}
                          <Badge className="bg-blue-600 text-white border-0 text-xs ml-1">PRO</Badge>
                        </Button>
                        <p className="text-xs text-slate-400 text-center mt-1.5">Get a prioritized 3–5 pattern game plan for a full day on the water</p>
                      </div>
                    )}

                    {/* Milk Run Results */}
                    {milkRun && milkRun.patterns.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Route size={15} className="text-white" />
                            <span className="text-white font-bold text-sm">Milk Run Plan</span>
                            <Badge className="bg-blue-600 text-white border-0 text-xs">PRO</Badge>
                          </div>
                          <button onClick={() => setMilkRun(null)} className="text-slate-400 hover:text-white text-xs">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                          {milkRun.patterns.map(p => (
                            <div key={p.number} className="px-4 py-3 flex gap-3">
                              <div className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">{p.number}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm leading-snug mb-1">{p.name}</p>
                                <div className="space-y-0.5 text-xs text-slate-600">
                                  <div className="flex gap-2"><span className="text-slate-400 font-semibold uppercase tracking-wide w-14 shrink-0">Why</span><span>{p.why}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 font-semibold uppercase tracking-wide w-14 shrink-0">How</span><span>{p.how}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 font-semibold uppercase tracking-wide w-14 shrink-0">Where</span><span>{p.where}</span></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {milkRun.proTip && (
                            <div className="px-4 py-3 bg-amber-50 flex items-start gap-2">
                              <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-800"><span className="font-bold">Pro Tip:</span> {milkRun.proTip}</p>
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                          <Button
                            variant="ghost" size="sm"
                            onClick={handleMilkRun}
                            disabled={milkRunLoading}
                            className="text-slate-500 hover:text-slate-700 text-xs h-7 gap-1"
                          >
                            <RefreshCw size={11} className={milkRunLoading ? 'animate-spin' : ''} />
                            Regenerate Plan
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Top Patterns */}
              {result.topPatterns.length > 0 && (
                <Card className="border-slate-200 shadow-none bg-white">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                      <Trophy size={15} className="text-blue-600" /> Winning Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {result.topPatterns.map(p => (
                      <div key={p.pattern} className="flex items-center gap-3">
                        <span className="text-slate-700 text-sm capitalize flex-1 leading-tight">{p.pattern}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.max(p.count * 14, 14)}px` }} />
                          <span className="text-slate-400 text-xs w-5 text-right">{p.count}x</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Top Baits Summary */}
              {result.topBaits.length > 0 && (
                <Card className="border-slate-200 shadow-none bg-white">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                      <Fish size={15} className="text-blue-600" /> Top Producing Baits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {result.topBaits.slice(0, 6).map(b => {
                      const baitData = result.reports.flatMap((r: any) => r.bait_used || []).find((bu: BaitRecord) => bu.bait_name === b.name && bu.product_url)
                      const shopUrl = baitData?.product_url || `https://www.google.com/search?q=${encodeURIComponent(b.name + ' fishing lure buy')}`
                      return (
                        <div key={b.name} className="flex items-center justify-between gap-2">
                          <span className="text-slate-700 text-sm flex-1 leading-tight truncate">{b.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-slate-100 text-slate-600 border-0 text-xs font-semibold">{b.count}x</Badge>
                            <a href={shopUrl} target="_blank" rel="noopener noreferrer"
                              className="text-orange-500 hover:text-orange-700" title="Buy this bait">
                              <ShoppingCart size={13} />
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Bait Breakdown */}
            {result.topBaits.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Top Bait Breakdown</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.topBaits.slice(0, 5).map(b => {
                    const baitRecords: BaitRecord[] = result.reports.flatMap((r: any) => (r.bait_used || []).filter((bu: BaitRecord) => bu.bait_name === b.name))
                    const colors = [...new Set(baitRecords.map((br: BaitRecord) => br.color).filter(Boolean))]
                    const presentationCounts: Record<string, number> = {}
                    result.reports.forEach((r: any) => {
                      if ((r.bait_used || []).some((bu: BaitRecord) => bu.bait_name === b.name) && r.presentation) {
                        presentationCounts[r.presentation] = (presentationCounts[r.presentation] || 0) + 1
                      }
                    })
                    const topStoredPresentation = Object.entries(presentationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
                    const cardBaitType = baitRecords[0]?.bait_type || ''
                    const technique = inferTechnique(b.name, cardBaitType, topStoredPresentation)
                    const structureCounts: Record<string, number> = {}
                    result.reports.forEach((r: any) => {
                      if ((r.bait_used || []).some((bu: BaitRecord) => bu.bait_name === b.name) && r.structure) {
                        structureCounts[r.structure] = (structureCounts[r.structure] || 0) + 1
                      }
                    })
                    const structure = Object.entries(structureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
                    const lineRecord = baitRecords.find(br => br.line_type)
                    const baitType = baitRecords[0]?.bait_type || b.name
                    const weightOz = baitRecords[0]?.weight_oz || 0
                    const tackle = getTackleSetup(baitType, weightOz)
                    const lineDisplay = lineRecord
                      ? `${lineRecord.line_type}${lineRecord.line_lb_test ? ` · ${lineRecord.line_lb_test} lb` : ''}`
                      : `${tackle.lineType} · ${tackle.lineLb}`
                    const productUrl = baitRecords.find(br => br.product_url)?.product_url

                    return (
                      <Card key={b.name} className="border-slate-200 shadow-none bg-white flex flex-col">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-slate-900 text-sm font-bold flex items-start justify-between gap-2">
                            <span className="break-words leading-snug min-w-0 capitalize">{b.name}</span>
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs font-semibold shrink-0 mt-0.5">{b.count}x</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 flex flex-col flex-1">
                          <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center mb-3 border border-slate-100 p-2">
                            <BaitIcon baitName={b.name} baitType={baitRecords[0]?.bait_type} />
                          </div>
                          {colors.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Top Colors</p>
                              <div className="flex flex-wrap gap-1">
                                {colors.slice(0, 5).map(c => (
                                  <Badge key={c} variant="outline" className="border-slate-200 text-slate-600 text-xs capitalize">{c}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-1 text-xs mb-3">
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-semibold w-20 shrink-0 uppercase tracking-wide">Technique</span>
                              <span className="text-slate-700 capitalize">{technique}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-semibold w-20 shrink-0 uppercase tracking-wide">Best For</span>
                              <span className="text-slate-700 capitalize">{structure}</span>
                            </div>
                          </div>
                          <Separator className="bg-slate-100 mb-3" />
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Suggested Setup</p>
                          <div className="space-y-1 text-xs flex-1">
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-semibold w-20 shrink-0 uppercase tracking-wide">Reel</span>
                              <span className="text-slate-700">{tackle.reel}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-semibold w-20 shrink-0 uppercase tracking-wide">Rod</span>
                              <span className="text-slate-700">{tackle.rod}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-semibold w-20 shrink-0 uppercase tracking-wide">Line</span>
                              <span className="text-slate-700">{lineDisplay}</span>
                            </div>
                          </div>
                          <BuyButton baitName={b.name} />
                          {productUrl && (
                            <a href={productUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-1.5 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                              <ExternalLink size={11} /> View Product Page
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            <Separator className="bg-slate-200" />

            {/* Technique Reports */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Technique Reports</h3>
                <button
                  onClick={() => setReportsOpen(o => !o)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  {reportsOpen ? <><ChevronUp size={14} /> Collapse</> : <><ChevronDown size={14} /> Show {result.reports.length} Reports</>}
                </button>
              </div>
              {reportsOpen && <div className="grid sm:grid-cols-2 gap-3">
                {result.reports.slice(0, 20).map((r: any) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {r.tournament_result?.angler_name && <p className="font-bold text-slate-900 text-sm">{r.tournament_result.angler_name}</p>}
                        {r.tournament_result?.tournament?.name && <p className="text-slate-400 text-xs mt-0.5 leading-tight">{r.tournament_result.tournament.name}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {r.tournament_result?.place && <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold">#{r.tournament_result.place}</Badge>}
                        {r.season && <Badge variant="outline" className="border-slate-200 text-slate-400 text-xs capitalize">{r.season}</Badge>}
                      </div>
                    </div>
                    <Separator className="bg-slate-100" />
                    <div className="space-y-1.5 text-sm">
                      {r.pattern && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Pattern</span><span className="text-slate-700 leading-tight">{r.pattern}</span></div>}
                      {r.presentation && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Technique</span><span className="text-slate-700 leading-tight">{r.presentation}</span></div>}
                      {r.structure && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Structure</span><span className="text-slate-700 leading-tight">{r.structure}</span></div>}
                      {r.depth_range_ft && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Depth</span><span className="text-slate-700">{r.depth_range_ft} ft</span></div>}
                      {r.conditions?.[0]?.water_temp_f && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Water Temp</span><span className="text-slate-700">{r.conditions[0].water_temp_f}°F</span></div>}
                      {r.conditions?.[0]?.water_clarity && <div className="flex gap-2"><span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Clarity</span><span className="text-slate-700 capitalize">{r.conditions[0].water_clarity}</span></div>}
                    </div>
                    {r.bait_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.bait_used.map((b: BaitRecord, j: number) => (
                          b.product_url ? (
                            <a key={j} href={b.product_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-xs font-semibold hover:bg-blue-100 transition-colors">
                              {b.bait_name || b.bait_type}{b.color ? <span className="text-blue-400">· {b.color}</span> : null}
                              <ExternalLink size={10} className="opacity-60" />
                            </a>
                          ) : (
                            <span key={j} className="inline-flex items-center bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-xs font-semibold">
                              {b.bait_name || b.bait_type}{b.color ? <span className="text-slate-400 ml-1">· {b.color}</span> : null}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                    {r.notes && <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-100 pt-2">{r.notes}</p>}
                  </div>
                ))}
              </div>}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center text-slate-400 py-20">
            <Fish size={48} className="mx-auto mb-4 text-slate-200" strokeWidth={1} />
            <p className="text-base font-semibold text-slate-500">Select a lake to see what&apos;s working.</p>
            <p className="text-sm mt-1">Currently covering Texas bass fisheries · More lakes coming soon.</p>
          </div>
        )}
      </div>
    </main>
  )
}
