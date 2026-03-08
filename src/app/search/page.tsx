'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Logo } from '@/components/Logo'
import {
  MapPin, Trophy, Sparkles, Fish, Layers, Anchor,
  Sun, SunMedium, Moon, Clock, Thermometer, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'

interface Lake { id: string; name: string; state: string; type: string; species: string[] }
interface BaitRecord { bait_type: string; bait_name: string; color: string; weight_oz: number; product_url: string; retailer: string; line_type: string; line_lb_test: number }
interface SearchResult {
  water: Lake
  sampleSize: number
  topBaits: { name: string; count: number }[]
  topPatterns: { pattern: string; count: number }[]
  reports: any[]
}

const CURRENT_YEAR = new Date().getFullYear()

function FilterSelect({ label, icon, value, onValueChange, options, placeholder }: {
  label: string; icon: React.ReactNode; value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon}{label}
      </label>
      <Select onValueChange={(v: string | null) => onValueChange(v || 'all')} value={value}>
        <SelectTrigger className="bg-white border-slate-200 text-slate-800 h-9 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function SearchPage() {
  const [lakes, setLakes] = useState<Lake[]>([])
  const [selectedLake, setSelectedLake] = useState('')
  const [filters, setFilters] = useState({
    season: 'all',
    timeOfDay: 'all',
    baitType: 'all',
    fishDepth: 'all',
    locationType: 'all',
    structure: 'all',
    waterClarity: 'all',
  })
  const [yearRange, setYearRange] = useState([2019, CURRENT_YEAR])
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(setLakes)
  }, [])

  function setFilter(key: string, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  async function handleSearch() {
    if (!selectedLake) return
    setLoading(true)
    setSummaryLoading(true)
    setError('')
    setResult(null)
    setSummary('')

    try {
      const params = new URLSearchParams({ lake: selectedLake })
      Object.entries(filters).forEach(([k, v]) => { if (v !== 'all') params.set(k, v) })
      params.set('yearFrom', String(yearRange[0]))
      params.set('yearTo', String(yearRange[1]))

      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)

      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: data.water?.state,
          season: filters.season !== 'all' ? filters.season : null,
          sampleSize: data.sampleSize,
          topBaits: data.topBaits,
          topPatterns: data.topPatterns,
          reports: data.reports,
        })
      }).then(r => r.json()).then(d => setSummary(d.summary)).finally(() => setSummaryLoading(false))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      {/* Nav */}
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
          {/* Primary search row */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} /> Body of Water
              </label>
              <Select onValueChange={(v: string | null) => setSelectedLake(v || '')}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-800 h-9 text-sm">
                  <SelectValue placeholder="Select a lake, river, or reservoir..." />
                </SelectTrigger>
                <SelectContent>
                  {lakes.map(l => (
                    <SelectItem key={l.id} value={l.name}>{l.name} — {l.state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersOpen(o => !o)}
                className="text-slate-500 hover:text-slate-700 text-xs h-9 gap-1"
              >
                Filters {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
              <Button
                onClick={handleSearch}
                disabled={!selectedLake || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-6 rounded-lg text-sm"
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <FilterSelect label="Season" icon={<Sun size={12} />} value={filters.season} onValueChange={v => setFilter('season', v)}
                  placeholder="All seasons" options={[
                    { value: 'spring', label: 'Spring' },
                    { value: 'summer', label: 'Summer' },
                    { value: 'fall', label: 'Fall' },
                    { value: 'winter', label: 'Winter' },
                  ]} />
                <FilterSelect label="Time of Day" icon={<Clock size={12} />} value={filters.timeOfDay} onValueChange={v => setFilter('timeOfDay', v)}
                  placeholder="Any time" options={[
                    { value: 'morning', label: 'Morning' },
                    { value: 'midday', label: 'Midday' },
                    { value: 'evening', label: 'Evening' },
                    { value: 'night', label: 'Night' },
                  ]} />
                <FilterSelect label="Bait Type" icon={<Fish size={12} />} value={filters.baitType} onValueChange={v => setFilter('baitType', v)}
                  placeholder="All baits" options={[
                    { value: 'soft plastic', label: 'Soft Plastic' },
                    { value: 'jig', label: 'Jig' },
                    { value: 'crankbait', label: 'Crankbait' },
                    { value: 'jerkbait', label: 'Jerkbait' },
                    { value: 'topwater', label: 'Topwater' },
                    { value: 'swimbait', label: 'Swimbait' },
                    { value: 'bladed jig', label: 'Bladed Jig' },
                    { value: 'spinnerbait', label: 'Spinnerbait' },
                    { value: 'spoon', label: 'Spoon' },
                  ]} />
                <FilterSelect label="Fish Depth" icon={<Layers size={12} />} value={filters.fishDepth} onValueChange={v => setFilter('fishDepth', v)}
                  placeholder="Any depth" options={[
                    { value: 'surface', label: 'Surface' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'bottom', label: 'Bottom' },
                  ]} />
                <FilterSelect label="Location" icon={<Anchor size={12} />} value={filters.locationType} onValueChange={v => setFilter('locationType', v)}
                  placeholder="Any location" options={[
                    { value: 'shoreline', label: 'Shoreline' },
                    { value: 'nearshore', label: 'Near Shore' },
                    { value: 'offshore', label: 'Offshore' },
                  ]} />
                <FilterSelect label="Structure" icon={<Layers size={12} />} value={filters.structure} onValueChange={v => setFilter('structure', v)}
                  placeholder="Any structure" options={[
                    { value: 'grass', label: 'Grass' },
                    { value: 'dock', label: 'Docks' },
                    { value: 'laydown', label: 'Laydowns' },
                    { value: 'point', label: 'Points' },
                    { value: 'hump', label: 'Humps' },
                    { value: 'channel', label: 'Channel' },
                    { value: 'timber', label: 'Standing Timber' },
                    { value: 'rock', label: 'Rock' },
                  ]} />
                <FilterSelect label="Water Clarity" icon={<Thermometer size={12} />} value={filters.waterClarity} onValueChange={v => setFilter('waterClarity', v)}
                  placeholder="Any clarity" options={[
                    { value: 'clear', label: 'Clear' },
                    { value: 'stained', label: 'Stained' },
                    { value: 'muddy', label: 'Muddy' },
                  ]} />
              </div>

              {/* Year range slider */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Year Range: {yearRange[0]} – {yearRange[1]}
                </label>
                <div className="px-1">
                  <Slider
                    min={2015}
                    max={CURRENT_YEAR}
                    step={1}
                    value={yearRange}
                    onValueChange={(v: number | readonly number[]) => setYearRange(Array.isArray(v) ? [...v] : [v as number, v as number])}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>2015</span><span>{CURRENT_YEAR}</span>
                </div>
              </div>
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
                <p className="text-slate-400 text-sm mt-0.5">
                  {result.water.state} · {result.water.type} · {result.water.species?.join(', ')}
                </p>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-semibold">
                {result.sampleSize} tournament reports
              </Badge>
            </div>

            {/* AI Summary */}
            <Card className="border-blue-100 bg-blue-50 shadow-none">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-blue-800 text-sm font-bold flex items-center gap-2">
                  <Sparkles size={15} /> AnglerIQ Report
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {summaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-blue-100" />
                    <Skeleton className="h-4 w-5/6 bg-blue-100" />
                    <Skeleton className="h-4 w-4/6 bg-blue-100" />
                  </div>
                ) : (
                  <p className="text-slate-700 text-sm leading-relaxed">{summary}</p>
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

              {/* Top Baits summary */}
              {result.topBaits.length > 0 && (
                <Card className="border-slate-200 shadow-none bg-white">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                      <Fish size={15} className="text-blue-600" /> Top Producing Baits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {result.topBaits.slice(0, 6).map(b => {
                      const baitData = result.reports
                        .flatMap((r: any) => r.bait_used || [])
                        .find((bu: BaitRecord) => bu.bait_name === b.name && bu.product_url)
                      return (
                        <div key={b.name} className="flex items-center justify-between gap-2">
                          <span className="text-slate-700 text-sm flex-1 leading-tight truncate">{b.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-slate-100 text-slate-600 border-0 text-xs font-semibold">{b.count}x</Badge>
                            {baitData?.product_url && (
                              <a href={baitData.product_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800">
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator className="bg-slate-200" />

            {/* Technique / Bait Cards */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Technique Reports</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.reports.slice(0, 20).map((r: any) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {r.tournament_result?.angler_name && (
                          <p className="font-bold text-slate-900 text-sm">{r.tournament_result.angler_name}</p>
                        )}
                        {r.tournament_result?.tournament?.name && (
                          <p className="text-slate-400 text-xs mt-0.5 leading-tight">{r.tournament_result.tournament.name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {r.tournament_result?.place && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold">
                            #{r.tournament_result.place}
                          </Badge>
                        )}
                        {r.season && (
                          <Badge variant="outline" className="border-slate-200 text-slate-400 text-xs capitalize">
                            {r.season}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Technique details */}
                    <div className="space-y-1.5 text-sm">
                      {r.pattern && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Pattern</span>
                          <span className="text-slate-700 leading-tight">{r.pattern}</span>
                        </div>
                      )}
                      {r.presentation && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Technique</span>
                          <span className="text-slate-700 leading-tight">{r.presentation}</span>
                        </div>
                      )}
                      {r.structure && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Structure</span>
                          <span className="text-slate-700 leading-tight">{r.structure}</span>
                        </div>
                      )}
                      {r.depth_range_ft && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Depth</span>
                          <span className="text-slate-700">{r.depth_range_ft} ft</span>
                        </div>
                      )}
                      {r.conditions?.[0]?.water_temp_f && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Water Temp</span>
                          <span className="text-slate-700">{r.conditions[0].water_temp_f}°F</span>
                        </div>
                      )}
                      {r.conditions?.[0]?.water_clarity && (
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-semibold w-20 shrink-0 text-xs uppercase tracking-wide pt-0.5">Clarity</span>
                          <span className="text-slate-700 capitalize">{r.conditions[0].water_clarity}</span>
                        </div>
                      )}
                    </div>

                    {/* Bait chips */}
                    {r.bait_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.bait_used.map((b: BaitRecord, j: number) => (
                          b.product_url ? (
                            <a key={j} href={b.product_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-xs font-semibold hover:bg-blue-100 transition-colors">
                              {b.bait_name || b.bait_type}
                              {b.color ? <span className="text-blue-400">· {b.color}</span> : null}
                              <ExternalLink size={10} className="opacity-60" />
                            </a>
                          ) : (
                            <span key={j} className="inline-flex items-center bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-xs font-semibold">
                              {b.bait_name || b.bait_type}
                              {b.color ? <span className="text-slate-400 ml-1">· {b.color}</span> : null}
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    {r.notes && (
                      <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-100 pt-2">{r.notes}</p>
                    )}
                  </div>
                ))}
              </div>
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
