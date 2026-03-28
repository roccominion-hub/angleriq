'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Logo } from '@/components/Logo'
import { LakeMap } from '@/components/LakeMap'
import { LakeLevel } from '@/components/LakeLevel'
import {
  MapPin, Trophy, Sparkles, Fish, Layers, Anchor,
  Sun, Clock, Thermometer, ExternalLink, ChevronDown, ChevronUp, Wind, Droplets, Waves,
  ShoppingCart, RefreshCw, Route, Zap, Feather, Cloud, Search, X, Calendar
} from 'lucide-react'
import { BaitIcon } from '@/components/BaitIcon'
import { solunarRatingColor, type MoonData } from '@/lib/moonphase'
import { NavUserMenu } from '@/components/NavUserMenu'
import { createClient } from '@/lib/supabase/client'

interface Lake { id: string; name: string; state: string; type: string; species: string[]; lat?: number; lng?: number }
interface BaitRecord { bait_type: string; bait_name: string; color: string; weight_oz: number; product_url: string; retailer: string; line_type: string; line_lb_test: number }
interface Weather { tempF?: number; feelsLikeF?: number; tempLowF?: number; cloudCoverPct?: number; windMph?: number; precipitation?: number; skyCondition?: string; timeOfDay?: string; season?: string; weatherDesc?: string; moon?: MoonData; forecastDate?: string; weatherConditions?: string }
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
  if (combined.match(/swimbait|swim bait|paddle tail|keitech|round jighead|round jig head/)) return 'Swimbaiting'
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
  if (combined.match(/creature|brush hog|beaver|pit boss|rage bug|bruiser|chunk|lobster|craw chunk|twin tail/)) return 'Flipping & pitching'
  if (combined.match(/tube/)) return 'Tube fishing'
  if (combined.match(/grub/)) return 'Grub fishing'

  // Dice / fuzzy
  if (combined.match(/dice|tumbleweed|nuki|cue bomb|fuzzy/)) return 'Dice bait — finesse'

  // Spoon
  if (combined.match(/spoon/)) return 'Spooning'

  // Fall back to stored presentation — but clean up multi-technique strings
  const rigs = ['texas rig', 'carolina rig', 'drop shot', 'ned rig', 'shaky head']
  const isPresentationRig = rigs.some(r => storedPresentation?.toLowerCase().includes(r))
  const isBaitHardware = combined.match(/crank|jerk|spinner|topwater|bladed|swimbait|frog|buzzbait/)
  if (isPresentationRig && isBaitHardware) return '—' // mismatch — don't show bad data

  // If presentation lists multiple comma-separated techniques, pick the first one
  // that is plausible for a soft plastic (avoid surfacing "jerkbait" for a creature bait, etc.)
  if (storedPresentation && storedPresentation.includes(',')) {
    const parts = storedPresentation.split(',').map(p => p.trim()).filter(Boolean)
    const softPlasticFriendly = ['flipping', 'pitching', 'texas', 'carolina', 'worm', 'drop shot', 'ned', 'shaky', 'punching', 'swim']
    const isSoftPlastic = baitType.toLowerCase().includes('soft') || baitType.toLowerCase().includes('plastic')
    if (isSoftPlastic) {
      const best = parts.find(p => softPlasticFriendly.some(k => p.toLowerCase().includes(k)))
      if (best) return best
    }
    return parts[0] // default to first technique listed
  }

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

function toggleMultiFilter(
  setter: React.Dispatch<React.SetStateAction<any>>,
  key: string,
  value: string
) {
  setter((f: any) => {
    const current = f[key] === 'all' ? [] : (f[key] as string).split(',').filter(Boolean)
    const updated = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value]
    return { ...f, [key]: updated.length === 0 ? 'all' : updated.join(',') }
  })
}

function MultiFilterSelect({ label, icon, value, onToggle, options, placeholder }: {
  label: string; icon: React.ReactNode; value: string
  onToggle: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = value === 'all' || !value ? [] : value.split(',').filter(Boolean)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`

  return (
    <div ref={ref} className="flex flex-col gap-1.5 relative">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon}{label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-slate-800 h-9 text-sm rounded-md px-2.5 text-left flex items-center justify-between gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          selected.length > 0 ? 'bg-blue-50 border border-blue-300' : 'bg-white border border-slate-200'
        }`}
      >
        <span className={selected.length > 0 ? 'text-blue-800 font-semibold' : 'text-slate-500'}>{displayText}</span>
        <ChevronDown size={13} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
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

function WeatherBar({ weather, lakeId }: { weather: Weather; lakeId?: string }) {
  const moon = weather.moon
  const solunarColors = moon ? solunarRatingColor(moon.solunarRating) : ''
  const [showSolunar, setShowSolunar] = useState(true)
  const [showLevel, setShowLevel] = useState(true)
  const [lakeLevel, setLakeLevel] = useState<any>(null)
  const isForecast = !!weather.forecastDate

  // Async lake level fetch — loads independently after conditions row renders
  useEffect(() => {
    if (!lakeId) return
    fetch(`/api/lake-conditions?lakeId=${lakeId}`)
      .then(r => r.json())
      .then(d => setLakeLevel(d?.conditions?.waterLevel ?? null))
      .catch(() => {})
  }, [lakeId])

  // Format trip date for display
  const formattedTripDate = weather.forecastDate
    ? new Date(weather.forecastDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null

  return (
    <div className="space-y-2">
      {/* Conditions row */}
      <div className={`flex flex-wrap items-center gap-3 text-sm text-slate-600 rounded-lg px-4 py-2.5 border ${isForecast ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
        {/* Forecast badge + date */}
        {isForecast && (
          <>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Trip Forecast</span>
            <span className="font-semibold text-purple-800">{formattedTripDate}</span>
            <span className="text-slate-400">·</span>
          </>
        )}
        <span className="font-bold text-slate-800">
          {weather.tempF}°F{weather.tempLowF != null ? ` / ${weather.tempLowF}°F` : ''}
        </span>
        <span className="text-slate-400">·</span>
        <span className="capitalize">{weather.skyCondition}</span>
        <span className="text-slate-400">·</span>
        <span className="flex items-center gap-1"><Wind size={13} />{weather.windMph} mph</span>
        {(weather.precipitation ?? 0) > 0 && (
          <><span className="text-slate-400">·</span>
          <span className="flex items-center gap-1"><Droplets size={13} />{weather.precipitation}mm</span></>
        )}
        {/* Only show timeOfDay for current conditions or if explicitly set */}
        {!isForecast && weather.timeOfDay && (
          <>
            <span className="text-slate-400">·</span>
            <span className="capitalize text-blue-600 font-semibold">{weather.timeOfDay}</span>
          </>
        )}
        {isForecast && weather.timeOfDay && (
          <>
            <span className="text-slate-400">·</span>
            <span className="capitalize text-purple-700 font-semibold">{weather.timeOfDay}</span>
          </>
        )}

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

        {/* Lake level pill — loads async, appears once data arrives */}
        {lakeLevel && (
          <>
            <span className="text-slate-400">·</span>
            <button
              onClick={() => setShowLevel(o => !o)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${
                lakeLevel.trend === 'rising'  ? 'border-green-400 text-green-700' :
                lakeLevel.trend === 'falling' ? 'border-red-400 text-red-700'    :
                                                'border-slate-300 text-slate-600'
              }`}
            >
              <Waves size={11} />
              <span>{lakeLevel.valueFt.toLocaleString()} ft</span>
              <span className="opacity-60">· {lakeLevel.percentFull}% full</span>
              <ChevronDown size={11} className={`transition-transform ${showLevel ? 'rotate-180' : ''}`} />
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

      {/* Lake level detail panel */}
      {lakeLevel && showLevel && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Current Level</p>
            <p className="font-bold">{lakeLevel.valueFt.toLocaleString()} <span className="text-slate-400 font-normal">ft</span></p>
            {lakeLevel.date && <p className="text-slate-500 mt-0.5">as of {lakeLevel.date}</p>}
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Trend</p>
            <p className={`font-bold capitalize ${lakeLevel.trend === 'rising' ? 'text-green-400' : lakeLevel.trend === 'falling' ? 'text-red-400' : 'text-slate-400'}`}>
              {lakeLevel.trend === 'rising' ? '↑' : lakeLevel.trend === 'falling' ? '↓' : '—'} {lakeLevel.trend}
            </p>
            <p className="text-slate-300 mt-0.5">{lakeLevel.deltaFt >= 0 ? '+' : ''}{lakeLevel.deltaFt?.toFixed(2)} ft / 24h</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Pool Status</p>
            <p className="font-bold">{lakeLevel.percentFull}% full</p>
            {lakeLevel.abovePoolFt !== undefined && lakeLevel.abovePoolFt !== 0 && (
              <p className={`mt-0.5 ${lakeLevel.abovePoolFt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {lakeLevel.abovePoolFt >= 0 ? '+' : ''}{lakeLevel.abovePoolFt.toFixed(2)} ft vs. pool
              </p>
            )}
          </div>
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Capacity</p>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-1.5">
              <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, lakeLevel.percentFull))}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
              <span>0%</span><span>100%</span>
            </div>
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
  const searchUrl = `https://www.basspro.com/SearchDisplay#q=${encodeURIComponent(baitName)}`
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

// Label maps for filter breadcrumbs
const NOW_FILTER_LABELS: Record<string, Record<string, string>> = {
  baitType: { 'soft plastic': 'Soft Plastic', jig: 'Jig', crankbait: 'Crankbait', jerkbait: 'Jerkbait', topwater: 'Topwater', swimbait: 'Swimbait', 'bladed jig': 'Bladed Jig', spinnerbait: 'Spinnerbait', spoon: 'Spoon', 'drop shot': 'Drop Shot', 'ned rig': 'Ned Rig' },
  fishDepth: { surface: 'Surface', suspended: 'Suspended', bottom: 'Bottom' },
  locationType: { shoreline: 'Shoreline', nearshore: 'Near Shore', offshore: 'Offshore' },
  structure: { grass: 'Grass', dock: 'Docks', laydown: 'Laydowns', point: 'Points', hump: 'Humps', channel: 'Channel', timber: 'Timber', rock: 'Rock' },
  waterClarity: { clear: 'Clear Water', stained: 'Stained', muddy: 'Muddy' },
  style: { power: '💪 Power Fishing', finesse: '🪶 Finesse' },
}
const SCENARIO_FILTER_LABELS: Record<string, Record<string, string>> = {
  season: { spring: '🌱 Spring', summer: '☀️ Summer', fall: '🍂 Fall', winter: '❄️ Winter' },
  timeOfDay: { morning: '🌅 Morning', midday: '☀️ Midday', evening: '🌇 Evening', night: '🌙 Night' },
  weatherConditions: { sunny: '☀️ Sunny', overcast: '☁️ Overcast', rainy: '🌧️ Rainy', windy: '💨 Windy', 'cold-front': '🥶 Cold Front' },
  airTemp: { cold: 'Air: Cold', cool: 'Air: Cool', mild: 'Air: Mild', warm: 'Air: Warm', hot: 'Air: Hot' },
  wind: { calm: 'Wind: Calm', light: 'Wind: Light', moderate: 'Wind: Moderate', heavy: 'Wind: Heavy' },
  waterTemp: { cold: 'Water: Cold', cool: 'Water: Cool', warm: 'Water: Warm', hot: 'Water: Hot' },
  waterClarity: { clear: 'Clear Water', stained: 'Stained', muddy: 'Muddy' },
  baitType: { 'soft plastic': 'Soft Plastic', jig: 'Jig', crankbait: 'Crankbait', jerkbait: 'Jerkbait', topwater: 'Topwater', swimbait: 'Swimbait', 'bladed jig': 'Bladed Jig', spinnerbait: 'Spinnerbait', spoon: 'Spoon', 'drop shot': 'Drop Shot', 'ned rig': 'Ned Rig' },
  locationType: { shoreline: 'Shoreline', nearshore: 'Near Shore', offshore: 'Offshore' },
  structure: { grass: 'Grass', dock: 'Docks', laydown: 'Laydowns', point: 'Points', hump: 'Humps', channel: 'Channel', timber: 'Timber', rock: 'Rock' },
}

function FilterBreadcrumbs({
  nowFilters, scenarioFilters, yearRange, tripDate, autoFilled,
  onRemoveNow, onRemoveScenario, onClearAll,
}: {
  nowFilters: Record<string, string>
  scenarioFilters: Record<string, string>
  yearRange: number[]
  tripDate: string
  autoFilled: Set<string>
  onRemoveNow: (key: string) => void
  onRemoveScenario: (key: string) => void
  onClearAll: () => void
}) {
  const chips: { label: string; onRemove: () => void; auto?: boolean }[] = []

  Object.entries(nowFilters).forEach(([key, val]) => {
    if (val === 'all' || !val) return
    const values = val.includes(',') ? val.split(',') : [val]
    values.forEach(v => {
      const label = NOW_FILTER_LABELS[key]?.[v] ?? v
      chips.push({ label, onRemove: () => {
        if (val.includes(',')) {
          onRemoveNow(key + ':' + v)
        } else {
          onRemoveNow(key)
        }
      }})
    })
  })

  if (tripDate) {
    chips.push({ label: `📅 ${tripDate}`, onRemove: () => onRemoveScenario('_tripDate') })
  }

  Object.entries(scenarioFilters).forEach(([key, val]) => {
    if (val === 'all' || !val) return
    const values = val.includes(',') ? val.split(',') : [val]
    values.forEach(v => {
      const label = SCENARIO_FILTER_LABELS[key]?.[v] ?? v
      chips.push({ label, onRemove: () => {
        if (val.includes(',')) {
          onRemoveScenario(key + ':' + v)
        } else {
          onRemoveScenario(key)
        }
      }, auto: autoFilled.has(key) })
    })
  })

  if (yearRange[0] !== 2019 || yearRange[1] !== CURRENT_YEAR) {
    chips.push({ label: `${yearRange[0]}–${yearRange[1]}`, onRemove: () => onRemoveNow('_yearRange') })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50 rounded-b-xl">
      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide shrink-0">Filters:</span>
      {chips.map((chip, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${chip.auto ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-700'}`}>
          {chip.label}
          {chip.auto && <span className="text-[9px] text-green-500 font-bold uppercase leading-none">auto</span>}
          <button onClick={chip.onRemove} className="ml-0.5 text-slate-400 hover:text-slate-700 leading-none">
            <X size={10} />
          </button>
        </span>
      ))}
      <button onClick={onClearAll} className="text-xs text-red-500 hover:text-red-700 font-semibold ml-1 underline underline-offset-2">
        Clear All
      </button>
    </div>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const [lakes, setLakes] = useState<Lake[]>([])
  const [selectedLake, setSelectedLake] = useState('')
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Right-now filters
  const [nowFilters, setNowFilters] = useState({
    baitType: 'all', fishDepth: 'all', locationType: 'all',
    structure: 'all', waterClarity: 'all', style: 'all',
  })
  const [yearRange, setYearRange] = useState([2019, CURRENT_YEAR])

  // Scenario filters (future trip)
  const [scenarioFilters, setScenarioFilters] = useState({
    season: 'all', timeOfDay: 'all', weatherConditions: 'all',
    waterTemp: 'all', waterClarity: 'all', baitType: 'all',
    fishDepth: 'all', locationType: 'all', structure: 'all',
    airTemp: 'all', wind: 'all',
  })

  // Future Trip state
  const [tripDate, setTripDate] = useState('')
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

  useEffect(() => {
    setSavedReportId(null)
  }, [selectedLake])

  function setNowFilter(key: string, value: string) {
    setNowFilters(f => ({ ...f, [key]: value }))
  }
  function removeNowFilter(keyOrKeyVal: string) {
    if (keyOrKeyVal === '_yearRange') { setYearRange([2019, CURRENT_YEAR]); return }
    if (keyOrKeyVal.includes(':')) {
      const [key, val] = keyOrKeyVal.split(':')
      toggleMultiFilter(setNowFilters, key, val)
      return
    }
    setNowFilters(f => ({ ...f, [keyOrKeyVal]: 'all' }))
  }
  function removeScenarioFilter(keyOrKeyVal: string) {
    if (keyOrKeyVal === '_tripDate') { setTripDate(''); setAutoFilled(new Set()); return }
    if (keyOrKeyVal.includes(':')) {
      const [key, val] = keyOrKeyVal.split(':')
      toggleMultiFilter(setScenarioFilters, key, val)
      setAutoFilled(prev => { const n = new Set(prev); n.delete(key); return n })
      return
    }
    setScenarioFilters(f => ({ ...f, [keyOrKeyVal]: 'all' }))
    setAutoFilled(prev => { const n = new Set(prev); n.delete(keyOrKeyVal); return n })
  }
  function setScenarioFilter(key: string, value: string) {
    setScenarioFilters(f => ({ ...f, [key]: value }))
  }
  function setScenarioFilterManual(key: string, value: string) {
    setScenarioFilters(f => ({ ...f, [key]: value }))
    setAutoFilled(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  function handleTripDateChange(date: string) {
    setTripDate(date)
    if (!date) {
      setAutoFilled(new Set())
      return
    }
    // Immediately auto-fill season + baseline water temp from date
    const d = new Date(date + 'T12:00:00Z')
    const month = d.getUTCMonth() + 1
    const season = month >= 3 && month <= 5 ? 'spring'
      : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'fall' : 'winter'
    const seasonWaterTemp = season === 'winter' ? 'cold'
      : season === 'spring' ? 'cool'
      : season === 'summer' ? 'hot'
      : 'warm'
    setScenarioFilters(f => ({ ...f, season, waterTemp: seasonWaterTemp }))
    setAutoFilled(new Set(['season', 'waterTemp']))
    // Forecast fetch (weather/air temp/wind) is handled by useEffect below
  }

  // Fetch forecast whenever tripDate + coords are both available
  useEffect(() => {
    if (!tripDate || !result?.coords?.lat || !result?.coords?.lng) return
    const d = new Date(tripDate + 'T12:00:00Z')
    const now = new Date()
    const daysOut = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysOut <= 0) return

    setFutureWeatherLoading(true)
    fetch(`/api/weather?lat=${result.coords.lat}&lng=${result.coords.lng}&date=${tripDate}`)
      .then(r => r.json())
      .then(wData => {
        if (wData.forecastAvailable) {
          // Use real forecast data
          const updates: Record<string, string> = {}
          if (wData.weatherConditions) updates.weatherConditions = wData.weatherConditions
          if (wData.tempF != null) {
            updates.airTemp = wData.tempF < 40 ? 'cold'
              : wData.tempF < 55 ? 'cool'
              : wData.tempF < 70 ? 'mild'
              : wData.tempF < 85 ? 'warm' : 'hot'
            updates.waterTemp = wData.tempF < 45 ? 'cold'
              : wData.tempF < 60 ? 'cool'
              : wData.tempF < 75 ? 'warm' : 'hot'
          }
          if (wData.windMph != null) {
            updates.wind = wData.windMph < 5 ? 'calm'
              : wData.windMph < 15 ? 'light'
              : wData.windMph < 25 ? 'moderate' : 'heavy'
          }
          if (Object.keys(updates).length > 0) {
            setScenarioFilters(f => ({ ...f, ...updates }))
            setAutoFilled(prev => new Set([...prev, ...Object.keys(updates)]))
          }
        } else if (wData.seasonalAverages) {
          // Use seasonal averages for far-out dates (only fill if not already manually set)
          const avgs = wData.seasonalAverages
          setScenarioFilters(f => ({
            ...f,
            airTemp: f.airTemp === 'all' ? avgs.airTemp : f.airTemp,
            wind: f.wind === 'all' ? avgs.wind : f.wind,
            waterTemp: f.waterTemp === 'all' ? avgs.waterTemp : f.waterTemp,
          }))
          setAutoFilled(prev => new Set([...prev, 'airTemp', 'wind', 'waterTemp']))
        }
      })
      .catch(() => {})
      .finally(() => setFutureWeatherLoading(false))
  }, [tripDate, result?.coords?.lat, result?.coords?.lng])

  // Merge active filters for API call
  function buildApiFilters(isScenario = false) {
    if (isScenario) {
      return {
        season: scenarioFilters.season,
        timeOfDay: scenarioFilters.timeOfDay,
        weatherConditions: scenarioFilters.weatherConditions,
        airTemp: scenarioFilters.airTemp,
        wind: scenarioFilters.wind,
        waterTemp: scenarioFilters.waterTemp,
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

  function clearAllFilters() {
    setNowFilters({ baitType: 'all', fishDepth: 'all', locationType: 'all', structure: 'all', waterClarity: 'all', style: 'all' })
    setScenarioFilters({ season: 'all', timeOfDay: 'all', weatherConditions: 'all', waterTemp: 'all', waterClarity: 'all', baitType: 'all', fishDepth: 'all', locationType: 'all', structure: 'all', airTemp: 'all', wind: 'all' })
    setYearRange([2019, CURRENT_YEAR])
    setTripDate('')
    setAutoFilled(new Set())
  }

  async function saveReport() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?next=/search'); return }
    setSaving(true)
    const { data } = await supabase.from('saved_reports').insert({
      user_id: user.id,
      lake_name: selectedLake,
      lake_state: result?.water?.state,
      lake_type: result?.water?.type,
      trip_date: tripDate || null,
      filters: buildApiFilters(!!tripDate),
      result_data: {
        topBaits: result?.topBaits,
        topPatterns: result?.topPatterns,
        sampleSize: result?.sampleSize,
        coords: result?.coords,
        water: result?.water,
      },
      summary_data: {
        ...summary,
        secondaryRec: secondaryRec || null,
        milkRun: milkRun || null,
      },
      weather_data: weather,
    }).select('id').single()
    if (data) setSavedReportId(data.id)
    setSaving(false)
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
    setSavedReportId(null)

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
          // If a trip date is set, fetch forecast for that date; otherwise fetch current conditions
          const weatherUrl = tripDate
            ? `/api/weather?lat=${data.coords.lat}&lng=${data.coords.lng}&date=${tripDate}`
            : `/api/weather?lat=${data.coords.lat}&lng=${data.coords.lng}`
          const wRes = await fetch(weatherUrl)
          currentWeather = await wRes.json()

          // For future trips, use user-selected timeOfDay (or omit if not set)
          if (tripDate) {
            const selectedTime = scenarioFilters.timeOfDay !== 'all' ? scenarioFilters.timeOfDay : undefined
            currentWeather = { ...currentWeather, timeOfDay: selectedTime }
          }

          setWeather(currentWeather)
        } catch { /* weather is optional */ }
      }

      // Build filters: use scenario filters when trip date is set, now filters otherwise
      const isScenario = !!tripDate
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
          filters: { ...buildApiFilters(isScenario), style: nowFilters.style },
        })
      }).then(r => r.json()).then(async d => {
        const intel = d.intel || ''
        setSummary({ intel, today: '' })
        setSummaryLoading(false)
        // Auto-trigger Recommended Plan
        if (intel) {
          setMilkRunLoading(true)
          try {
            const milkRes = await fetch('/api/milk-run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lake: selectedLake,
                state: data.water?.state,
                intel,
                topBaits: data.topBaits,
                topPatterns: data.topPatterns,
                weather: currentWeather,
                filters: buildApiFilters(isScenario),
              })
            })
            const milkData = await milkRes.json()
            setMilkRun(milkData)
          } catch { /* ignore */ } finally {
            setMilkRunLoading(false)
          }
        }
      }).catch(() => setSummaryLoading(false))

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
        <NavUserMenu />
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

          <FilterBreadcrumbs
            nowFilters={nowFilters}
            scenarioFilters={scenarioFilters}
            yearRange={yearRange}
            tripDate={tripDate}
            autoFilled={autoFilled}
            onRemoveNow={removeNowFilter}
            onRemoveScenario={removeScenarioFilter}
            onClearAll={clearAllFilters}
          />

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
                    <MultiFilterSelect label="Bait Type" icon={<Fish size={12} />} value={nowFilters.baitType} onToggle={v => toggleMultiFilter(setNowFilters, 'baitType', v)} placeholder="All baits" options={BAIT_OPTIONS} />
                    <FilterSelect label="Fish Depth" icon={<Layers size={12} />} value={nowFilters.fishDepth} onValueChange={v => setNowFilter('fishDepth', v)} placeholder="Any depth" options={DEPTH_OPTIONS} />
                    <MultiFilterSelect label="Location" icon={<Anchor size={12} />} value={nowFilters.locationType} onToggle={v => toggleMultiFilter(setNowFilters, 'locationType', v)} placeholder="Any location" options={LOCATION_OPTIONS} />
                    <MultiFilterSelect label="Structure" icon={<Layers size={12} />} value={nowFilters.structure} onToggle={v => toggleMultiFilter(setNowFilters, 'structure', v)} placeholder="Any structure" options={STRUCTURE_OPTIONS} />
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
                    <FilterSelect label="Air Temp" icon={<Thermometer size={12} />}
                      autoFilled={autoFilled.has('airTemp')}
                      value={scenarioFilters.airTemp}
                      onValueChange={v => setScenarioFilterManual('airTemp', v)}
                      placeholder="Any temp"
                      options={[{ value: 'cold', label: 'Cold (< 40°F)' }, { value: 'cool', label: 'Cool (40–55°F)' }, { value: 'mild', label: 'Mild (55–70°F)' }, { value: 'warm', label: 'Warm (70–85°F)' }, { value: 'hot', label: 'Hot (85°F+)' }]} />
                    <FilterSelect label="Wind" icon={<Wind size={12} />}
                      autoFilled={autoFilled.has('wind')}
                      value={scenarioFilters.wind}
                      onValueChange={v => setScenarioFilterManual('wind', v)}
                      placeholder="Any wind"
                      options={[{ value: 'calm', label: 'Calm (< 5 mph)' }, { value: 'light', label: 'Light (5–15 mph)' }, { value: 'moderate', label: 'Moderate (15–25 mph)' }, { value: 'heavy', label: 'Heavy (25+ mph)' }]} />
                    <FilterSelect label="Water Temp" icon={<Droplets size={12} />}
                      autoFilled={autoFilled.has('waterTemp')}
                      value={scenarioFilters.waterTemp}
                      onValueChange={v => setScenarioFilterManual('waterTemp', v)}
                      placeholder="Any water temp"
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
                    <MultiFilterSelect label="Bait Type" icon={<Fish size={12} />}
                      value={scenarioFilters.baitType}
                      onToggle={v => toggleMultiFilter(setScenarioFilters, 'baitType', v)}
                      placeholder="All baits" options={BAIT_OPTIONS} />
                    <MultiFilterSelect label="Location" icon={<Anchor size={12} />}
                      value={scenarioFilters.locationType}
                      onToggle={v => toggleMultiFilter(setScenarioFilters, 'locationType', v)}
                      placeholder="Any location" options={LOCATION_OPTIONS} />
                    <MultiFilterSelect label="Structure" icon={<Layers size={12} />}
                      value={scenarioFilters.structure}
                      onToggle={v => toggleMultiFilter(setScenarioFilters, 'structure', v)}
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
              <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-semibold">
                {result.sampleSize < 15 ? 'Adequate' : result.sampleSize < 50 ? 'Substantial' : 'Exhaustive'} Data Coverage
              </Badge>
            </div>

            {weather && <WeatherBar weather={weather} lakeId={result.water.id} />}

            {result && !loading && (
              <div className="flex justify-end mb-1">
                {savedReportId ? (
                  <span className="flex items-center gap-1.5 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                    ✓ Report saved — <Link href="/account" className="underline underline-offset-2">view in My Reports</Link>
                  </span>
                ) : (
                  <Button
                    onClick={saveReport}
                    disabled={saving || !summary.intel}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs h-8 gap-1.5"
                  >
                    {saving ? 'Saving...' : '💾 Save Report'}
                  </Button>
                )}
              </div>
            )}

            {/* AI Summary card */}
            <Card className="border-blue-100 shadow-none overflow-hidden pt-0">
              {result.coords?.lat && result.coords?.lng && (
                <LakeMap lakeId={result.water.id} lakeName={result.water.name} lat={result.coords.lat} lng={result.coords.lng} />
              )}
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-blue-800 text-sm font-bold flex items-center gap-2">
                  <Sparkles size={15} /> AnglerIQ Intelligence Report
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {summaryLoading ? (
                  <div className="space-y-2.5">
                    <Skeleton className="h-3.5 w-full skeleton-shimmer-blue" />
                    <Skeleton className="h-3.5 w-5/6 skeleton-shimmer-blue" />
                    <Skeleton className="h-3.5 w-4/6 skeleton-shimmer-blue" />
                    <Skeleton className="h-3.5 w-full skeleton-shimmer-blue" />
                    <Skeleton className="h-3.5 w-3/4 skeleton-shimmer-blue" />
                    <p className="text-xs text-blue-400 animate-pulse pt-1">Analyzing tournament data…</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tournament Intel</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{summary.intel}</p>
                    </div>
                    {/* Recommended Plan (auto-generated) */}
                    {milkRunLoading && !milkRun && (
                      <div className="space-y-3 pt-1">
                        {[1,2,3].map(n => (
                          <div key={n} className="flex gap-3 items-start">
                            <Skeleton className="w-7 h-7 rounded-full shrink-0 skeleton-shimmer" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3.5 w-3/4 skeleton-shimmer" />
                              <Skeleton className="h-3 w-full skeleton-shimmer" />
                              <Skeleton className="h-3 w-5/6 skeleton-shimmer" />
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-slate-400 animate-pulse pt-1">Building your plan…</p>
                      </div>
                    )}
                    {milkRun && milkRun.patterns.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Route size={15} className="text-white" />
                            <span className="text-white font-bold text-sm">Recommended Plan</span>
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
                            {milkRunLoading ? 'Rebuilding...' : 'Regenerate Plan'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Additional Intel from Articles ─────────────────────── */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy size={14} /> Additional Intel from Articles
              </h3>
              <p className="text-xs text-slate-400 mb-4">Supporting patterns and baits identified from source articles. The Tournament Intel and Recommended Plan above are the primary actionable findings.</p>

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
                      const shopUrl = baitData?.product_url || `https://www.basspro.com/SearchDisplay#q=${encodeURIComponent(b.name)}`
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

            </div>{/* end Additional Intel from Articles */}

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
              {reportsOpen && (() => {
                const allReports = result.reports.slice(0, 20)
                const richReports = allReports.filter((r: any) => r.bait_used?.length > 0 || r.angler_name)
                const thinReports = allReports.filter((r: any) => !r.bait_used?.length && !r.angler_name)
                return (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                {richReports.map((r: any) => (
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
              </div>
              {thinReports.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional Supporting Articles</p>
                  <ul className="space-y-1.5">
                    {thinReports.map((r: any) => (
                      <li key={r.id} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-slate-300 mt-0.5">—</span>
                        <span className="leading-relaxed">
                          {r.notes || r.pattern || (r.source_url ? new URL(r.source_url).hostname.replace('www.', '') : 'Source article')}
                          {r.source_url && (
                            <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 text-blue-500 hover:text-blue-700">↗</a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
              )
              })()}
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
