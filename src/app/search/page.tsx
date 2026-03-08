'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface Lake { id: string; name: string; state: string; type: string; species: string[] }
interface Bait { bait_type: string; bait_name: string; color: string; weight_oz: number; product_url: string; retailer: string }
interface SearchResult {
  water: Lake
  sampleSize: number
  topBaits: { name: string; count: number }[]
  topPatterns: { pattern: string; count: number }[]
  reports: any[]
}

export default function SearchPage() {
  const [lakes, setLakes] = useState<Lake[]>([])
  const [selectedLake, setSelectedLake] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(setLakes)
  }, [])

  async function handleSearch() {
    if (!selectedLake) return
    setLoading(true)
    setSummaryLoading(true)
    setError('')
    setResult(null)
    setSummary('')

    try {
      const params = new URLSearchParams({ lake: selectedLake })
      if (selectedSeason !== 'all') params.set('season', selectedSeason)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)

      // Fetch AI summary in parallel
      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake: selectedLake,
          state: data.water?.state,
          season: selectedSeason !== 'all' ? selectedSeason : null,
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎣</span>
          <span className="text-xl font-bold text-blue-700">AnglerIQ</span>
        </Link>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started Free</Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-1 text-slate-900">Fishing Intel Search</h1>
        <p className="text-slate-500 mb-8">Tournament-proven techniques and top baits by body of water.</p>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Select onValueChange={(v: string | null) => setSelectedLake(v || '')}>
            <SelectTrigger className="bg-white border-slate-300 text-slate-800 flex-1">
              <SelectValue placeholder="Select a body of water..." />
            </SelectTrigger>
            <SelectContent>
              {lakes.map(l => (
                <SelectItem key={l.id} value={l.name}>
                  {l.name} — {l.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v: string | null) => setSelectedSeason(v || 'all')} defaultValue="all">
            <SelectTrigger className="bg-white border-slate-300 text-slate-800 w-44">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="winter">Winter</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleSearch}
            disabled={!selectedLake || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && <p className="text-red-500 mb-6">{error}</p>}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Water header */}
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-bold text-blue-700">{result.water.name}</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {result.water.state} · {result.water.type} · {result.water.species?.join(', ')}
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm px-3 py-1">
                {result.sampleSize} tournament reports
              </Badge>
            </div>

            {/* AI Summary */}
            <Card className="border-blue-200 bg-blue-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 text-base flex items-center gap-2">
                  🤖 AnglerIQ Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-blue-100" />
                    <Skeleton className="h-4 w-5/6 bg-blue-100" />
                    <Skeleton className="h-4 w-4/6 bg-blue-100" />
                  </div>
                ) : (
                  <p className="text-slate-700 leading-relaxed">{summary}</p>
                )}
              </CardContent>
            </Card>

            <Separator className="bg-slate-200" />

            {/* Top Baits */}
            {result.topBaits.length > 0 && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-slate-900 text-base">🎯 Top Producing Baits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.topBaits.map(b => {
                      // Find product URL for this bait from reports
                      const baitData = result.reports
                        .flatMap((r: any) => r.bait_used || [])
                        .find((bu: Bait) => bu.bait_name === b.name && bu.product_url)
                      return (
                        <div key={b.name} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2.5 bg-slate-50">
                          <div className="flex flex-col">
                            <span className="text-slate-800 text-sm font-medium">{b.name}</span>
                            {baitData?.retailer && (
                              <span className="text-slate-400 text-xs">{baitData.retailer}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700 text-xs">{b.count}x</Badge>
                            {baitData?.product_url && (
                              <a
                                href={baitData.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                Buy →
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Patterns */}
            {result.topPatterns.length > 0 && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-slate-900 text-base">🗺️ Winning Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.topPatterns.map(p => (
                      <div key={p.pattern} className="flex items-center gap-3">
                        <span className="text-slate-700 text-sm capitalize flex-1">{p.pattern}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.max(p.count * 16, 16)}px` }} />
                          <span className="text-slate-400 text-xs w-6 text-right">{p.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technique Reports */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 text-base">📋 Technique Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.reports.slice(0, 15).map((r: any) => (
                  <div key={r.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.tournament_result?.angler_name && (
                          <span className="font-semibold text-slate-800">{r.tournament_result.angler_name}</span>
                        )}
                        {r.tournament_result?.place && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">#{r.tournament_result.place}</Badge>
                        )}
                        {r.season && (
                          <Badge variant="outline" className="border-slate-300 text-slate-500 text-xs capitalize">{r.season}</Badge>
                        )}
                      </div>
                      {r.tournament_result?.tournament?.name && (
                        <span className="text-slate-400 text-xs">{r.tournament_result.tournament.name}</span>
                      )}
                    </div>
                    {r.pattern && <p className="text-slate-700 text-sm"><span className="text-slate-400 font-medium">Pattern:</span> {r.pattern}</p>}
                    {r.presentation && <p className="text-slate-700 text-sm"><span className="text-slate-400 font-medium">Presentation:</span> {r.presentation}</p>}
                    {r.structure && <p className="text-slate-700 text-sm"><span className="text-slate-400 font-medium">Structure:</span> {r.structure}</p>}
                    {r.depth_range_ft && <p className="text-slate-700 text-sm"><span className="text-slate-400 font-medium">Depth:</span> {r.depth_range_ft} ft</p>}
                    {r.bait_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {r.bait_used.map((b: Bait, j: number) => (
                          b.product_url ? (
                            <a key={j} href={b.product_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs hover:bg-blue-100 transition-colors">
                              {b.bait_name || b.bait_type}{b.color ? ` · ${b.color}` : ''} ↗
                            </a>
                          ) : (
                            <Badge key={j} variant="outline" className="border-slate-200 text-slate-600 text-xs">
                              {b.bait_name || b.bait_type}{b.color ? ` · ${b.color}` : ''}
                            </Badge>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center text-slate-400 py-20">
            <p className="text-5xl mb-4">🎣</p>
            <p className="text-lg font-medium text-slate-500">Select a lake to see what&apos;s working.</p>
            <p className="text-sm mt-2">Currently covering Texas bass fisheries · More lakes coming soon.</p>
          </div>
        )}
      </div>
    </main>
  )
}
