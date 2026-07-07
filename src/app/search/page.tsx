'use client'

import { useState, useEffect, useRef, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Logo } from '@/components/Logo'
import { LakeMap } from '@/components/LakeMap'
import { LakeLevel } from '@/components/LakeLevel'
import { ConditionsPanel } from '@/components/ConditionsPanel'
import {
  MapPin, Trophy, Sparkles, Fish, Layers, Anchor,
  Sun, Clock, Thermometer, ExternalLink, ChevronDown, ChevronUp, Wind, Droplets, Waves,
  ShoppingCart, RefreshCw, Route, Zap, Feather, Cloud, Search, X, Calendar, History, Navigation,
  MessageCircle, Compass, Save, Map
} from 'lucide-react'
import { BaitIcon } from '@/components/BaitIcon'
import { solunarRatingColor, type MoonData } from '@/lib/moonphase'
import { NavUserMenu } from '@/components/NavUserMenu'
import { createClient } from '@/lib/supabase/client'
import { ChatDrawer } from '@/components/ChatDrawer'
import dynamic from 'next/dynamic'
const LakePickerMap = dynamic(() => import('@/components/LakePickerMap').then(m => ({ default: m.LakePickerMap })), { ssr: false })
import { LogEntryForm, type LogDraft } from '@/components/LogEntryForm'

interface Lake { id: string; name: string; state: string; type: string; species: string[]; lat?: number; lng?: number }

// Lakes that should appear as a single search entry — secondary is hidden, primary is used for data
const MERGED_LAKE_PAIRS: Record<string, string> = {
  'Lake Eddleman': 'Lake Graham',   // hide Eddleman, show under Graham
  'Lake Tyler East': 'Lake Tyler',  // hide Tyler East, show under Tyler
}
// Display labels for merged primaries
const MERGED_LAKE_LABELS: Record<string, string> = {
  'Lake Graham': 'Lake Graham / Lake Eddleman',
  'Lake Tyler':  'Lake Tyler / Lake Tyler East',
}
interface BaitRecord { bait_type: string; bait_name: string; color: string; weight_oz: number; product_url: string; retailer: string; line_type: string; line_lb_test: number }
interface Weather { tempF?: number; feelsLikeF?: number; tempLowF?: number; cloudCoverPct?: number; windMph?: number; windDirection?: number; precipitation?: number; skyCondition?: string; timeOfDay?: string; season?: string; weatherDesc?: string; moon?: MoonData; forecastDate?: string; weatherConditions?: string }
interface SearchResult {
  water: Lake & { lat: number; lng: number }
  sampleSize: number
  topBaits: { name: string; count: number }[]
  topPatterns: { pattern: string; count: number }[]
  reports: any[]
  coords?: { lat: number; lng: number }
}
interface MilkRunPattern { number: number; name: string; why: string; how: string; where: string }
interface MyIntelTrip {
  trip_date: string
  fish_count: number | null
  big_fish_lbs: number | null
  rating: number | null
  techniques: string[]
  baits: string[]
  structure: string[]
  depth: string[] | null
  water_temp_f: number | null
  water_clarity: string | null
  pattern_notes: string | null
  notes: string | null
  similar: boolean
}
interface MyIntelData {
  tripCount: number
  similarCount: number
  totalFish: number
  bestTrip: MyIntelTrip | null
  topTechniques: string[]
  topBaits: string[]
  trips: MyIntelTrip[]
}

const CURRENT_YEAR = new Date().getFullYear()
const TODAY = new Date().toISOString().split('T')[0]

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

// Derive the spawn/season stage bucket from water temp.
// Mirrors the thresholds in summary/route.ts inferSpawnStage().
type StageBucket = 'winter' | 'prespawn' | 'spawn' | 'postspawn' | 'summer'
function stageFromTemp(tempF: number): StageBucket {
  if (tempF < 55) return 'winter'
  if (tempF < 62) return 'prespawn'
  if (tempF < 68) return 'spawn'
  if (tempF < 75) return 'postspawn'
  return 'summer'
}

// Detect which stage keywords appear in a pattern/notes string.
// Checked in specificity order so "pre-spawn" doesn't bleed into "spawn".
function detectPatternStage(text: string): StageBucket | null {
  const t = text.toLowerCase()
  if (/pre.?spawn|prespawn|staging/i.test(t))                          return 'prespawn'
  if (/post.?spawn|postspawn|fry.?guard/i.test(t))                     return 'postspawn'
  if (/\bspawn\b|spawning|bed.?fish|sight.?fish|bedding|on.?beds/i.test(t)) return 'spawn'
  if (/summer.?pattern|summer.?ledge|offshore.?ledge|deep.?ledge/i.test(t)) return 'summer'
  if (/winter.?pattern|cold.?water.?pattern|deep.?winter/i.test(t))   return 'winter'
  return null
}

// Score a technique report by relevance to current fishing conditions.
// Higher score = more relevant. Used to re-order reports after water temp is available.
function scoreReportRelevance(report: any, waterTempF: number | null, season?: string | null): number {
  let score = 0
  const wt = report.conditions?.[0]?.water_temp_f

  // Water temp proximity — primary signal (reports within a few degrees of current temp are most useful)
  if (wt != null && waterTempF != null) {
    const diff = Math.abs(wt - waterTempF)
    if (diff <= 3)       score += 10
    else if (diff <= 7)  score += 7
    else if (diff <= 12) score += 4
    else if (diff <= 20) score += 2
    // > 20°F apart: 0
  } else {
    score += 2 // no water temp in report: neutral, don't penalise
  }

  // Pattern text stage alignment — catches reports without a recorded water temp.
  // Compare the stage implied by the pattern text against the stage implied by current water temp.
  if (waterTempF != null) {
    const currentStage = stageFromTemp(waterTempF)
    const patternText  = `${report.pattern || ''} ${report.notes || ''}`
    const patternStage = detectPatternStage(patternText)

    if (patternStage != null) {
      if (patternStage === currentStage) {
        // Pattern explicitly matches the current stage — strong bonus, especially for
        // reports without a water temp (the only stage signal we have for those)
        score += wt == null ? 8 : 4
      } else {
        // Pattern conflicts with current stage — penalty scaled by how far apart the stages are
        const ORDER: StageBucket[] = ['winter', 'prespawn', 'spawn', 'postspawn', 'summer']
        const dist = Math.abs(ORDER.indexOf(patternStage) - ORDER.indexOf(currentStage))
        score -= dist <= 1 ? 2 : 5  // adjacent stage: mild demotion; 2+ stages away: stronger
      }
    }
  }

  // Season match
  if (season && report.season && report.season.toLowerCase() === season.toLowerCase()) {
    score += 5
  }

  // Confidence
  if (report.confidence === 'high')        score += 3
  else if (report.confidence === 'medium') score += 1

  // Recency (newer reports slightly favoured within the same relevance band)
  if (report.reported_date) {
    const age = new Date().getFullYear() - new Date(report.reported_date).getFullYear()
    if (age <= 1)      score += 2
    else if (age <= 3) score += 1
  }

  return score
}

// Multi-tier lake name matcher — handles AI-generated names that differ from DB names.
// Tiers (most → least strict): exact → normalized → prefix/startsWith → keyword intersection.
function findMatchingLake(lakes: Lake[], rawParam: string): Lake | undefined {
  if (!rawParam || lakes.length === 0) return undefined

  // Strip state suffix the AI may append: "Lake Fork, TX" → "Lake Fork"
  const term = rawParam.split(',')[0].trim()
  const termLower = term.toLowerCase()

  // 1. Exact match (case-insensitive)
  const exact = lakes.find(l => l.name.toLowerCase() === termLower)
  if (exact) return exact

  // 2. Normalized match — collapse apostrophes, special punctuation, extra spaces
  //    Handles: "Lake O the Pines" ↔ "Lake O' the Pines", "Bois dArc" ↔ "Bois d'Arc"
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/['''`']/g, '')  // apostrophes
      .replace(/\./g, '')        // periods
      .replace(/\s+/g, ' ')
      .trim()
  const normTerm = norm(termLower)
  const normalized = lakes.find(l => norm(l.name) === normTerm)
  if (normalized) return normalized

  // 3. Prefix / starts-with — AI name is a shorter version of the full DB name.
  //    Handles: "Grand Lake" → "Grand Lake o' the Cherokees"
  //             "Sam Rayburn" → "Sam Rayburn Reservoir"
  //             "Toledo Bend" → "Toledo Bend Reservoir"
  //             "Possum Kingdom" → "Possum Kingdom Lake"
  const prefixed = lakes.find(l => {
    const lLower = norm(l.name)
    return lLower.startsWith(normTerm + ' ') || normTerm.startsWith(lLower + ' ')
  })
  if (prefixed) return prefixed

  // 4. Keyword intersection — compare sets of significant words.
  //    Handles cases where word order differs or minor words are dropped.
  const STOP = new Set(['lake', 'reservoir', 'the', 'of', "o", 'and', 'state', 'park', 'creek'])
  const keywords = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))

  const termKeys = keywords(termLower)
  if (termKeys.length > 0) {
    const wordMatch = lakes.find(l => {
      const lakeKeys = keywords(l.name)
      if (lakeKeys.length === 0) return false
      const shared = termKeys.filter(w => lakeKeys.includes(w))
      // All term keywords found in lake name, or all lake keywords found in term
      return shared.length === termKeys.length || shared.length === lakeKeys.length
    })
    if (wordMatch) return wordMatch
  }

  return undefined
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
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 rounded-lg px-4 py-2.5 border bg-slate-50 border-slate-200">
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

// Haversine distance in miles between two lat/lng points
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const RECENT_LAKES_KEY = 'angleriq_recent_lakes'
const MAX_RECENT = 5

function getRecentLakes(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_LAKES_KEY) || '[]') } catch { return [] }
}

function addRecentLake(lakeName: string) {
  try {
    const prev = getRecentLakes().filter(n => n !== lakeName)
    localStorage.setItem(RECENT_LAKES_KEY, JSON.stringify([lakeName, ...prev].slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

// Hot search combobox for lake selection
function LakeSearchBox({ lakes, value, onChange, userCoords, onMapClick }: { lakes: Lake[]; value: string; onChange: (lake: Lake | null) => void; userCoords: { lat: number; lng: number } | null; onMapClick?: () => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [recentNames, setRecentNames] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive nearby lakes reactively from parent-owned coords + lakes list
  const nearbyLakes = userCoords && lakes.length > 0
    ? lakes
        .filter(l => l.lat != null && l.lng != null)
        .map(l => ({ lake: l, dist: distanceMiles(userCoords.lat, userCoords.lng, l.lat!, l.lng!) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
        .map(x => x.lake)
    : []

  // Load recent searches from localStorage on mount
  useEffect(() => {
    setRecentNames(getRecentLakes())
  }, [])

  const recentLakes = recentNames.map(n => lakes.find(l => l.name === n)).filter(Boolean) as Lake[]

  // Remove secondary merged lakes (e.g. Lake Eddleman hidden behind Lake Graham)
  const visibleLakes = lakes.filter(l => !MERGED_LAKE_PAIRS[l.name])

  // Display label — show merged name for primaries
  function lakeLabel(l: Lake) { return MERGED_LAKE_LABELS[l.name] ?? l.name }

  const filtered = query.length > 0
    ? visibleLakes.filter(l => lakeLabel(l).toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : null

  // `value` is the selected lake's id (names aren't unique across states, e.g. Lake Murray OK/SC).
  const selectedLake = lakes.find(l => l.id === value)

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
    addRecentLake(lake.name)
    setRecentNames(getRecentLakes())
    onChange(lake)
    setQuery('')
    setOpen(false)
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  function LakeRow({ lake, isSelected }: { lake: Lake; isSelected: boolean }) {
    return (
      <button
        onMouseDown={() => selectLake(lake)}
        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 ${isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800'}`}
      >
        <span>{lakeLabel(lake)}</span>
        <span className="text-slate-400 text-xs shrink-0">{lake.state}</span>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5"><MapPin size={12} /> Body of Water</span>
        {onMapClick && (
          <button type="button" onClick={onMapClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold normal-case tracking-normal text-[11px] transition-colors">
            <Map size={11} /> Search on a Map
          </button>
        )}
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedLake ? `${lakeLabel(selectedLake)} — ${selectedLake.state}` : 'Search lakes, rivers, reservoirs...'}
          value={open ? query : (selectedLake ? `${lakeLabel(selectedLake)} — ${selectedLake.state}` : query)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); if (selectedLake) setQuery('') }}
          className="w-full bg-white border border-slate-200 text-slate-800 h-9 text-base rounded-md pl-8 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
        />
        {(value || query) && (
          <button onClick={clearSelection} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {filtered ? (
            // Typing mode — show filtered results
            filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No lakes found</div>
            ) : (
              filtered.map(l => <LakeRow key={l.id} lake={l} isSelected={value === l.id} />)
            )
          ) : (
            // Empty state — show recent + nearby sections
            <>
              {recentLakes.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <History size={11} /> Recently Searched
                  </div>
                  {recentLakes.map(l => <LakeRow key={l.id} lake={l} isSelected={value === l.id} />)}
                  <div className="border-t border-slate-100 my-1" />
                </>
              )}
              <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Navigation size={11} /> Near You
              </div>
              {nearbyLakes.length > 0
                ? nearbyLakes.map(l => <LakeRow key={l.id} lake={l} isSelected={value === l.id} />)
                : <div className="px-3 py-2 text-sm text-slate-400">{userCoords ? 'No nearby lakes found' : 'Allow location for nearby suggestions'}</div>
              }
            </>
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
  style: { power: 'Power Fishing', finesse: 'Finesse' },
}
const SCENARIO_FILTER_LABELS: Record<string, Record<string, string>> = {
  season: { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' },
  timeOfDay: { morning: 'Morning', midday: 'Midday', evening: 'Evening', night: 'Night' },
  weatherConditions: { sunny: 'Sunny', overcast: 'Overcast', rainy: 'Rainy', windy: 'Windy', 'cold-front': 'Cold Front' },
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
  const chips: { label: ReactNode; onRemove: () => void; auto?: boolean }[] = []

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

  if (tripDate && tripDate !== TODAY) {
    chips.push({ label: <span className="inline-flex items-center gap-1"><Calendar size={11} />{tripDate}</span>, onRemove: () => onRemoveScenario('_tripDate') })
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

function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lakes, setLakes] = useState<Lake[]>([])
  const [selectedLake, setSelectedLake] = useState('')
  const [selectedLakeId, setSelectedLakeId] = useState('')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Request geolocation once on page mount
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* permission denied or unavailable — silent fail */ },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }, [])
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logModalInitial, setLogModalInitial] = useState<Partial<LogDraft> | null>(null)
  const [logSavedNotice, setLogSavedNotice] = useState(false)

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
  const [tripDate, setTripDate] = useState(TODAY)
  const [futureWeatherLoading, setFutureWeatherLoading] = useState(false)
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())

  const [filtersOpen, setFiltersOpen] = useState(false)
  const isScenario = tripDate > TODAY
  const [reportsOpen, setReportsOpen] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [waterTempF, setWaterTempF] = useState<number | null>(null)
  const [waterTempSource, setWaterTempSource] = useState<'measured' | 'estimated' | null>(null)
  const [summary, setSummary] = useState<{ intel: string; today: string; myIntel?: MyIntelData | null }>({ intel: '', today: '' })
  const [secondaryRec, setSecondaryRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [milkRunLoading, setMilkRunLoading] = useState(false)
  const [milkRun, setMilkRun] = useState<{ patterns: MilkRunPattern[]; proTip: string } | null>(null)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(setLakes)
  }, [])

  // Pre-select a lake when arriving via ?lake=Name (e.g. from AnglerIQ Chat "Run Report" button).
  // Uses useSearchParams so it re-runs on client-side navigation (same-page router.push) too.
  // findMatchingLake handles AI name variations: "Sam Rayburn" → "Sam Rayburn Reservoir", etc.
  useEffect(() => {
    if (lakes.length === 0) return
    const param = searchParams.get('lake')
    if (!param) return
    const matched = findMatchingLake(lakes, param)
    if (matched) { setSelectedLake(matched.name); setSelectedLakeId(matched.id) }
  }, [lakes, searchParams])

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
    setTripDate(date || TODAY)
    if (!date || date <= TODAY) {
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
    setTripDate(TODAY)
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
      if (selectedLakeId) params.set('lakeId', selectedLakeId)
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
      let currentWaterTempF: number | null = null
      if (data.coords?.lat && data.coords?.lng) {
        try {
          // Fetch weather + water temp in parallel
          const weatherUrl = isScenario
            ? `/api/weather?lat=${data.coords.lat}&lng=${data.coords.lng}&date=${tripDate}`
            : `/api/weather?lat=${data.coords.lat}&lng=${data.coords.lng}`
          const [wRes, condRes] = await Promise.all([
            fetch(weatherUrl),
            data.water?.id ? fetch(`/api/lake-conditions?lakeId=${data.water.id}`) : Promise.resolve(null),
          ])
          currentWeather = await wRes.json()
          if (condRes) {
            const condData = await condRes.json()
            currentWaterTempF = condData?.conditions?.waterTempF ?? null
            setWaterTempSource(condData?.conditions?.waterTempSource ?? null)
          }

          // For future trips, use user-selected timeOfDay (or omit if not set)
          if (isScenario) {
            const selectedTime = scenarioFilters.timeOfDay !== 'all' ? scenarioFilters.timeOfDay : undefined
            currentWeather = { ...currentWeather, timeOfDay: selectedTime }
          }

          setWeather(currentWeather)
          setWaterTempF(currentWaterTempF)
        } catch { /* weather is optional */ }
      }

      // Re-order reports by relevance to current conditions (water temp proximity + season match).
      // Done here, after water temp is known, since temp isn't available at search time.
      const sortedReports = [...(data.reports || [])].sort((a, b) =>
        scoreReportRelevance(b, currentWaterTempF, currentWeather?.season) -
        scoreReportRelevance(a, currentWaterTempF, currentWeather?.season)
      )
      // Update result so the UI and secondary rec path both use the relevance-sorted list
      setResult((prev: any) => prev ? { ...prev, reports: sortedReports } : prev)

      // Build filters: use scenario filters for future trips, now filters for today
      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: data.water?.state,
          lakeId: data.water?.id,
          sampleSize: data.sampleSize,
          topBaits: data.topBaits,
          topPatterns: data.topPatterns,
          reports: sortedReports,
          weather: currentWeather,
          waterTempF: currentWaterTempF,
          waterTempSource: waterTempSource,
          filters: { ...buildApiFilters(isScenario), style: nowFilters.style },
        })
      }).then(r => r.json()).then(async d => {
        const intel = d.intel || ''
        setSummary({ intel, today: '', myIntel: d.myIntel ?? null })
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
          lakeId: result.water?.id,
          sampleSize: result.sampleSize,
          topBaits: result.topBaits,
          topPatterns: result.topPatterns,
          reports: result.reports,
          weather,
          waterTempF,
          waterTempSource,
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
    <main className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href="/"><Logo className="h-7 w-auto" /></Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white text-sm font-bold px-3.5 py-1.5 rounded-full transition-all shadow-sm shadow-blue-500/20"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">Ask AnglerIQ</span>
          </button>
          <NavUserMenu />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fishing Intel Search</h1>
          <p className="text-slate-500 text-sm mt-1">Tournament-proven techniques and top baits by body of water.</p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          {/* Top row: lake search + date + actions */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
            <LakeSearchBox lakes={lakes} value={selectedLakeId} onChange={(lake) => { setSelectedLake(lake?.name ?? ''); setSelectedLakeId(lake?.id ?? '') }} userCoords={userCoords} onMapClick={() => setShowMapPicker(v => !v)} />
            <div className="flex items-end gap-2 shrink-0">
              {/* Date input — always visible, defaults to today */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Date
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={e => handleTripDateChange(e.target.value)}
                  min={TODAY}
                  className="h-9 text-base rounded-md px-2.5 border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
              {/* Right Now filters — today's date selected */}
              {!isScenario && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-400">Refine the intel and recommendation for your current conditions.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <MultiFilterSelect label="Bait Type" icon={<Fish size={12} />} value={nowFilters.baitType} onToggle={v => toggleMultiFilter(setNowFilters, 'baitType', v)} placeholder="All baits" options={BAIT_OPTIONS} />
                    <FilterSelect label="Fish Depth" icon={<Layers size={12} />} value={nowFilters.fishDepth} onValueChange={v => setNowFilter('fishDepth', v)} placeholder="Any depth" options={DEPTH_OPTIONS} />
                    <MultiFilterSelect label="Location" icon={<Anchor size={12} />} value={nowFilters.locationType} onToggle={v => toggleMultiFilter(setNowFilters, 'locationType', v)} placeholder="Any location" options={LOCATION_OPTIONS} />
                    <MultiFilterSelect label="Structure" icon={<Layers size={12} />} value={nowFilters.structure} onToggle={v => toggleMultiFilter(setNowFilters, 'structure', v)} placeholder="Any structure" options={STRUCTURE_OPTIONS} />
                    <FilterSelect label="Water Clarity" icon={<Droplets size={12} />} value={nowFilters.waterClarity} onValueChange={v => setNowFilter('waterClarity', v)} placeholder="Any clarity" options={CLARITY_OPTIONS} />
                    <FilterSelect label="Style" icon={<Feather size={12} />} value={nowFilters.style} onValueChange={v => setNowFilter('style', v)} placeholder="Any style"
                      options={[{ value: 'power', label: 'Power Fishing' }, { value: 'finesse', label: 'Finesse Fishing' }]} />
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

              {/* Future Trip filters — future date selected */}
              {isScenario && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center flex-wrap gap-3">
                    <p className="text-xs text-slate-400">
                      Conditions auto-filled from your trip date. Adjust any field to override.
                    </p>
                    {futureWeatherLoading && (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <RefreshCw size={11} className="animate-spin" /> Fetching forecast…
                      </span>
                    )}
                    {!futureWeatherLoading && autoFilled.size > 0 && (
                      <span className="text-xs text-green-700 font-semibold flex items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded-md">
                        ✓ Auto-filled from {autoFilled.has('weatherConditions') ? 'forecast' : 'date'}
                      </span>
                    )}
                    {!result?.coords && (
                      <span className="text-xs text-slate-400 italic">Search a lake to auto-fill forecast weather</span>
                    )}
                  </div>
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

        {/* Map-based lake picker */}
        {showMapPicker && (
          <div className="mb-6">
            <LakePickerMap
              lakes={lakes}
              onSelect={lake => {
                setSelectedLake(lake.name)
                setSelectedLakeId(lake.id)
                setShowMapPicker(false)
              }}
              onClose={() => setShowMapPicker(false)}
            />
          </div>
        )}

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

            {weather && (
              <ConditionsPanel
                weather={weather}
                waterTempF={waterTempF}
                waterTempSource={waterTempSource}
                lakeId={result.water.id}
              />
            )}

            {result && !loading && (
              <div className="flex justify-end items-center gap-2 mb-1 flex-wrap">
                <Button
                  onClick={() => setLogModalInitial({
                    lake_id: result.water.id,
                    lake_name: result.water.name,
                    lake_state: result.water.state,
                    lat: result.coords?.lat ?? null,
                    lng: result.coords?.lng ?? null,
                    trip_date: tripDate || TODAY,
                    water_temp_f: waterTempF ?? undefined,
                    air_temp_f: weather?.tempF != null ? Math.round(weather.tempF) : undefined,
                    sky: weather?.skyCondition || undefined,
                    time_of_day: weather?.timeOfDay ? [weather.timeOfDay] : undefined,
                  })}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs h-8 gap-1.5"
                >
                  <Compass size={13} /> Log a Trip
                </Button>
                <Button
                  onClick={() => setLogModalInitial({
                    lake_id: result.water.id,
                    lake_name: result.water.name,
                    lake_state: result.water.state,
                    lat: result.coords?.lat ?? null,
                    lng: result.coords?.lng ?? null,
                    trip_date: tripDate || TODAY,
                    water_temp_f: waterTempF ?? undefined,
                    air_temp_f: weather?.tempF != null ? Math.round(weather.tempF) : undefined,
                    sky: weather?.skyCondition || undefined,
                    time_of_day: weather?.timeOfDay ? [weather.timeOfDay] : undefined,
                    fish_count: 1,
                  })}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs h-8 gap-1.5"
                >
                  <Fish size={13} /> Log a Catch
                </Button>
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
                    {saving ? 'Saving...' : <span className="inline-flex items-center gap-1.5"><Save size={13} /> Save Report</span>}
                  </Button>
                )}
              </div>
            )}

            {logSavedNotice && (
              <div className="flex items-center gap-1.5 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                ✓ Trip logged — <Link href="/log" className="underline underline-offset-2">view in My Fishing Log</Link>
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
                    {/* Recommended Plan (auto-generated) — the hero: the actionable call for right now */}
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
                      <div className="border-2 border-blue-500 rounded-xl overflow-hidden">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Route size={15} className="text-white" />
                            <span className="text-white font-bold text-sm">Today's Plan</span>
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

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tournament &amp; technique intel</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{summary.intel}</p>
                    </div>

                    {/* My Intel — the angler's own logged history on this lake */}
                    {summary.myIntel && summary.myIntel.tripCount > 0 && (
                      <div className="border border-blue-100 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                          <History size={14} className="text-blue-600" />
                          <span className="text-blue-900 font-bold text-sm">My Intel</span>
                          <span className="text-xs text-blue-500">— your logged history on this lake</span>
                        </div>
                        <div className="px-4 py-3 bg-white space-y-3">
                          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
                            <span><span className="font-bold text-slate-900">{summary.myIntel.tripCount}</span> trip{summary.myIntel.tripCount === 1 ? '' : 's'} logged</span>
                            <span><span className="font-bold text-slate-900">{summary.myIntel.totalFish}</span> fish caught</span>
                            {summary.myIntel.bestTrip && (
                              <span>best day: <span className="font-bold text-slate-900">{summary.myIntel.bestTrip.fish_count} fish</span> on {summary.myIntel.bestTrip.trip_date}</span>
                            )}
                            {summary.myIntel.similarCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                                <Zap size={11} /> {summary.myIntel.similarCount} trip{summary.myIntel.similarCount === 1 ? '' : 's'} in similar conditions to today
                              </span>
                            )}
                          </div>

                          {(summary.myIntel.topTechniques.length > 0 || summary.myIntel.topBaits.length > 0) && (
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                              {summary.myIntel.topTechniques.length > 0 && (
                                <span>your go-to techniques here: <span className="font-semibold text-slate-700">{summary.myIntel.topTechniques.join(', ')}</span></span>
                              )}
                              {summary.myIntel.topBaits.length > 0 && (
                                <span>your go-to baits here: <span className="font-semibold text-slate-700">{summary.myIntel.topBaits.join(', ')}</span></span>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            {summary.myIntel.trips.map((t, i) => (
                              <div key={i} className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${t.similar ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-100'}`}>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="font-bold text-slate-800">{t.trip_date}</span>
                                  {t.similar && (
                                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
                                      <Zap size={9} /> Similar conditions to today
                                    </span>
                                  )}
                                  {t.fish_count != null && <span className="text-slate-600">{t.fish_count} fish</span>}
                                  {t.big_fish_lbs != null && <span className="text-slate-600">{t.big_fish_lbs} lb kicker</span>}
                                  {t.water_temp_f != null && <span className="text-slate-500">{t.water_temp_f}°F water</span>}
                                  {t.water_clarity && <span className="text-slate-500">{t.water_clarity} water</span>}
                                  {t.depth?.length ? <span className="text-slate-500">{t.depth.join(', ')}</span> : null}
                                  {t.rating != null && <span className="text-amber-600">{'★'.repeat(t.rating)}{'☆'.repeat(Math.max(0, 5 - t.rating))}</span>}
                                </div>
                                {(t.techniques.length > 0 || t.baits.length > 0 || t.structure.length > 0) && (
                                  <p className="text-slate-500 mt-1">
                                    {t.techniques.length > 0 && <>techniques: <span className="text-slate-700">{t.techniques.join(', ')}</span>{(t.baits.length > 0 || t.structure.length > 0) && ' · '}</>}
                                    {t.baits.length > 0 && <>baits: <span className="text-slate-700">{t.baits.join(', ')}</span>{t.structure.length > 0 && ' · '}</>}
                                    {t.structure.length > 0 && <>structure: <span className="text-slate-700">{t.structure.join(', ')}</span></>}
                                  </p>
                                )}
                                {(t.pattern_notes || t.notes) && (
                                  <p className="text-slate-500 italic mt-1">&ldquo;{t.pattern_notes || t.notes}&rdquo;</p>
                                )}
                              </div>
                            ))}
                          </div>

                          {summary.myIntel.similarCount > 0 && (
                            <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
                              <span className="font-bold">Worth noting:</span> conditions today look similar to {summary.myIntel.similarCount} of your past trip{summary.myIntel.similarCount === 1 ? '' : 's'} here — Today's Plan above leans on what's worked for you in the past when it lines up with today.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Ask AnglerIQ ──────────────────────────────────────── */}
            {summary.intel && (
              <div className="flex items-center justify-between bg-slate-900 rounded-xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Fish size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Have questions about this report?</p>
                    <p className="text-xs text-slate-400 leading-tight">Ask AnglerIQ for deeper analysis or alternative approaches</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-500/30 shrink-0 ml-4"
                >
                  <MessageCircle size={14} />
                  Ask
                </button>
              </div>
            )}

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
                const allReports = result.reports
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
          <div className="py-12 px-4 max-w-2xl mx-auto">
            <p className="text-base font-semibold text-slate-500 mb-1">Search for a lake to see what&apos;s working.</p>
            <p className="text-sm text-slate-400 mb-8">Covering TX, OK, LA, AR, TN, MS, MO, CA, AL, GA, FL, NY &amp; MI · More states coming soon.</p>
            {/* Content skeleton preview */}
            <div className="space-y-5 opacity-40 pointer-events-none select-none">
              {/* Map skeleton */}
              <div className="h-36 rounded-xl bg-slate-100 flex items-center justify-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-2.5 w-28 rounded bg-slate-200" />
                  <div className="h-2 w-20 rounded bg-slate-200" />
                </div>
              </div>
              {/* Summary text skeleton */}
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-5/6 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
              {/* Technique card skeletons */}
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3 flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-md bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-2.5 w-full rounded bg-slate-100" />
                      <div className="h-2.5 w-3/4 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AnglerIQ Chat Drawer ──────────────────────────────────── */}
      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={{
          mode: 'report',
          lakeId: result?.water?.id,
          lake: result?.water?.name ?? selectedLake,
          state: result?.water?.state,
          season: weather?.season,
          waterTempF: waterTempF,
          topBaits: result?.topBaits,
          topPatterns: result?.topPatterns,
          intel: summary.intel,
          today: summary.today,
        }}
      />

      {/* ── Log a Trip / Log a Catch modal ───────────────────────── */}
      {logModalInitial && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogModalInitial(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Compass size={16} className="text-blue-600" /> Log a New Trip</h2>
              <button onClick={() => setLogModalInitial(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <LogEntryForm
                initial={logModalInitial}
                onCancel={() => setLogModalInitial(null)}
                onSaved={() => {
                  setLogModalInitial(null)
                  setLogSavedNotice(true)
                  setTimeout(() => setLogSavedNotice(false), 6000)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// useSearchParams() requires a Suspense boundary for Next.js static prerendering.
export default function SearchPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  )
}
