'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Lake { id: string; name: string; state: string; type: string; species: string[] }
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/lakes').then(r => r.json()).then(setLakes)
  }, [])

  async function handleSearch() {
    if (!selectedLake) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const params = new URLSearchParams({ lake: selectedLake })
      if (selectedSeason !== 'all') params.set('season', selectedSeason)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎣</span>
          <span className="text-xl font-bold text-cyan-400">AnglerIQ</span>
        </Link>
        <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">Get Started</Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Search Fishing Intel</h1>
        <p className="text-slate-400 mb-8">Select a body of water to see tournament-proven techniques and baits.</p>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Select onValueChange={(v: string | null) => setSelectedLake(v || '')}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white flex-1">
              <SelectValue placeholder="Select a body of water..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              {lakes.map(l => (
                <SelectItem key={l.id} value={l.name} className="hover:bg-slate-700">
                  {l.name} — {l.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v: string | null) => setSelectedSeason(v || 'all')} defaultValue="all">
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-40">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
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
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-8"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && <p className="text-red-400 mb-6">{error}</p>}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">{result.water.name}</h2>
                <p className="text-slate-400 text-sm">{result.water.state} · {result.water.type} · {result.water.species?.join(', ')}</p>
              </div>
              <Badge variant="outline" className="border-cyan-700 text-cyan-300 text-sm px-3 py-1">
                {result.sampleSize} data points
              </Badge>
            </div>

            <Separator className="bg-slate-700" />

            {/* Top Baits */}
            {result.topBaits.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">🎯 Top Producing Baits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.topBaits.map(b => (
                      <div key={b.name} className="flex items-center gap-2 bg-slate-700/60 rounded-lg px-3 py-2">
                        <span className="text-white text-sm font-medium">{b.name}</span>
                        <Badge className="bg-cyan-700 text-cyan-100 text-xs">{b.count}x</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Patterns */}
            {result.topPatterns.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">🗺️ Winning Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.topPatterns.map(p => (
                      <div key={p.pattern} className="flex items-center justify-between">
                        <span className="text-slate-200 text-sm capitalize">{p.pattern}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 bg-cyan-600 rounded-full" style={{ width: `${Math.max(p.count * 20, 20)}px` }} />
                          <span className="text-slate-400 text-xs">{p.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Reports */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">📋 Technique Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.reports.slice(0, 10).map((r: any, i: number) => (
                  <div key={r.id} className="border border-slate-700 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {r.tournament_result?.angler_name && (
                          <span className="font-semibold text-white">{r.tournament_result.angler_name}</span>
                        )}
                        {r.tournament_result?.place && (
                          <Badge className="bg-amber-700 text-amber-100 text-xs">#{r.tournament_result.place}</Badge>
                        )}
                        {r.season && (
                          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs capitalize">{r.season}</Badge>
                        )}
                      </div>
                      {r.tournament_result?.tournament?.name && (
                        <span className="text-slate-500 text-xs">{r.tournament_result.tournament.name}</span>
                      )}
                    </div>
                    {r.pattern && <p className="text-slate-300 text-sm"><span className="text-slate-500">Pattern:</span> {r.pattern}</p>}
                    {r.presentation && <p className="text-slate-300 text-sm"><span className="text-slate-500">Presentation:</span> {r.presentation}</p>}
                    {r.structure && <p className="text-slate-300 text-sm"><span className="text-slate-500">Structure:</span> {r.structure}</p>}
                    {r.bait_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.bait_used.map((b: any, j: number) => (
                          <Badge key={j} variant="outline" className="border-cyan-800 text-cyan-300 text-xs">
                            {b.bait_name || b.bait_type}{b.color ? ` · ${b.color}` : ''}
                          </Badge>
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
          <div className="text-center text-slate-500 py-16">
            <p className="text-4xl mb-4">🎣</p>
            <p className="text-lg">Select a lake above to see what&apos;s working.</p>
            <p className="text-sm mt-2">Currently covering Texas bass fisheries.</p>
          </div>
        )}
      </div>
    </main>
  )
}
