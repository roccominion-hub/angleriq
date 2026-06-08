'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LogEntryForm, type LogDraft } from '@/components/LogEntryForm'
import { NavUserMenu } from '@/components/NavUserMenu'
import {
  Plus, MapPin, Calendar, Fish, Star, Trophy, Award, Compass, Trash2, Pencil,
  ChevronDown, ChevronUp, X,
} from 'lucide-react'

const MyWatersMap = dynamic(() => import('@/components/MyWatersMap').then(m => m.MyWatersMap), { ssr: false })

const TIME_LABELS: Record<string, string> = { dawn: 'Dawn', morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' }

function StarRow({ value }: { value: number | null }) {
  if (value == null) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map(n => <Star key={n} size={13} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.75} />)}
    </span>
  )
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-extrabold text-slate-900 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function LogCard({ log, onEdit, onDelete }: { log: any; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = !!(log.water_temp_f || log.air_temp_f || log.sky || log.wind || log.water_clarity || log.water_level
    || (log.techniques?.length) || (log.baits?.length) || (log.structure?.length) || (log.depth?.length) || log.pattern_notes || log.notes || (log.catches?.length))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <p className="font-extrabold text-slate-900 truncate">{log.lake_name}</p>
            {log.lake_state && <span className="text-xs font-semibold text-slate-400">{log.lake_state}</span>}
            {Array.isArray(log.time_of_day) && log.time_of_day.length > 0 && (
              <span className="text-xs text-slate-400">{log.time_of_day.map((t: string) => TIME_LABELS[t] || t).join(' · ')}</span>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtDate(log.trip_date)}</span>
            {log.spot && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {log.spot}</span>}
            {log.rating != null && <StarRow value={log.rating} />}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={13} /></button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>

      {(log.fish_count != null || log.big_fish_lbs != null || log.total_weight_lbs != null) && (
        <div className="flex items-center flex-wrap gap-2 mt-3">
          {log.fish_count != null && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              <Fish size={12} /> {log.fish_count} {log.fish_count === 1 ? 'fish' : 'fish'}
            </span>
          )}
          {Array.isArray(log.big_fish_entries) && log.big_fish_entries.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
              <Trophy size={12} /> {log.big_fish_entries.slice().sort((a: number, b: number) => b - a).map((w: number) => `${w} lb`).join(', ')}
              {log.big_fish_entries.length > 1 ? ' kickers' : ' kicker'}
            </span>
          ) : log.big_fish_lbs != null && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
              <Trophy size={12} /> {log.big_fish_lbs} lb kicker
            </span>
          )}
          {log.total_weight_lbs != null && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {log.total_weight_lbs} lbs total
            </span>
          )}
        </div>
      )}

      {hasDetail && (
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-3">
          {expanded ? <>Hide details <ChevronUp size={13} /></> : <>Show details <ChevronDown size={13} /></>}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-sm text-slate-600">
          {(log.water_temp_f || log.air_temp_f || log.sky || log.wind || log.water_clarity || log.water_level) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {log.water_temp_f != null && <span><strong className="text-slate-700">{log.water_temp_f}°F</strong> water</span>}
              {log.air_temp_f != null && <span><strong className="text-slate-700">{log.air_temp_f}°F</strong> air</span>}
              {log.sky && <span className="capitalize">{log.sky}</span>}
              {log.wind && <span className="capitalize">{log.wind} wind</span>}
              {log.water_clarity && <span className="capitalize">{log.water_clarity} water</span>}
              {log.water_level && <span className="capitalize">{log.water_level} level</span>}
            </div>
          )}
          {(log.techniques?.length > 0 || log.baits?.length > 0 || log.structure?.length > 0 || log.depth?.length > 0) && (
            <div className="space-y-1.5">
              {log.techniques?.length > 0 && <p className="text-xs"><span className="font-semibold text-slate-700">Techniques:</span> {log.techniques.join(', ')}</p>}
              {log.baits?.length > 0 && <p className="text-xs"><span className="font-semibold text-slate-700">Baits:</span> {log.baits.join(', ')}</p>}
              {log.structure?.length > 0 && <p className="text-xs"><span className="font-semibold text-slate-700">Structure:</span> {log.structure.join(', ')}</p>}
              {log.depth?.length > 0 && <p className="text-xs"><span className="font-semibold text-slate-700">Depth:</span> {log.depth.join(', ')}</p>}
            </div>
          )}
          {log.pattern_notes && <p className="text-xs italic text-slate-500">"{log.pattern_notes}"</p>}
          {log.notes && <p className="text-xs text-slate-500">{log.notes}</p>}
          {Array.isArray(log.catches) && log.catches.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Individual catches ({log.catches.length})</p>
              <div className="space-y-1.5">
                {log.catches.map((c: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                    <span className="font-bold text-slate-700">#{i + 1}</span>
                    {c.weight != null && <span>{c.weight} lb</span>}
                    {c.length != null && <span>{c.length}&quot;</span>}
                    {c.bait && <span className="text-slate-500">{c.bait}</span>}
                    {c.technique && <span className="text-slate-500">{c.technique}</span>}
                    {c.time && <span className="text-slate-400">{c.time}</span>}
                    {c.notes && <span className="text-slate-400 italic">&ldquo;{c.notes}&rdquo;</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LogPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<{ lakes: any[]; metrics: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  async function loadAll() {
    const [logsRes, statsRes] = await Promise.all([
      fetch('/api/logs').then(r => r.json()),
      fetch('/api/logs/stats').then(r => r.json()),
    ])
    setLogs(Array.isArray(logsRes) ? logsRes : [])
    setStats(statsRes?.lakes ? statsRes : null)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?next=/log'); return }
      setUser(user)
      await loadAll()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSaved() {
    setShowForm(false)
    setEditing(null)
    loadAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trip log? This can\'t be undone.')) return
    setLogs(ls => ls.filter(l => l.id !== id))
    await fetch(`/api/logs/${id}`, { method: 'DELETE' })
    loadAll()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
        <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <Link href="/"><Logo className="h-7 w-auto" /></Link>
        </nav>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  const m = stats?.metrics
  const lakes = stats?.lakes || []

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href="/"><Logo className="h-7 w-auto" /></Link>
        <div className="flex items-center gap-4">
          <NavUserMenu />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Compass className="text-blue-600" size={24} /> My Fishing Log</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your personal record of trips, conditions, and what worked — like a handicap log for fishing.</p>
          </div>
          {!showForm && !editing && (
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 shrink-0">
              <Plus size={16} className="mr-1.5" /> Log a Trip
            </Button>
          )}
        </div>

        {/* New / edit form */}
        {(showForm || editing) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">{editing ? 'Edit Trip' : 'Log a New Trip'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="text-slate-300 hover:text-slate-500"><X size={18} /></button>
            </div>
            <LogEntryForm
              initial={editing ? {
                id: editing.id, lake_id: editing.lake_id, lake_name: editing.lake_name, lake_state: editing.lake_state,
                lat: editing.lat, lng: editing.lng,
                spot: editing.spot, trip_date: editing.trip_date, time_of_day: editing.time_of_day,
                water_temp_f: editing.water_temp_f, air_temp_f: editing.air_temp_f, sky: editing.sky, wind: editing.wind,
                water_clarity: editing.water_clarity, water_level: editing.water_level,
                techniques: editing.techniques, baits: editing.baits, structure: editing.structure,
                depth: editing.depth, pattern_notes: editing.pattern_notes,
                fish_count: editing.fish_count, big_fish_lbs: editing.big_fish_lbs, big_fish_entries: editing.big_fish_entries,
                catches: editing.catches, total_weight_lbs: editing.total_weight_lbs,
                rating: editing.rating, notes: editing.notes,
              } as LogDraft : undefined}
              onCancel={() => { setShowForm(false); setEditing(null) }}
              onSaved={handleSaved}
            />
          </div>
        )}

        {/* Metrics */}
        {m && m.totalTrips > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={<Compass size={16} />} label="Trips Logged" value={m.totalTrips} />
            <MetricCard icon={<Fish size={16} />} label="Fish Caught" value={m.totalFish} sub={m.avgFishPerTrip ? `${m.avgFishPerTrip}/trip avg` : undefined} />
            <MetricCard icon={<MapPin size={16} />} label="Lakes Fished" value={m.uniqueLakes} sub={m.favoriteLake ? `Top: ${m.favoriteLake.name}` : undefined} />
            <MetricCard icon={<Trophy size={16} />} label="Biggest Fish" value={m.biggestFish ? `${m.biggestFish.lbs} lbs` : '—'} sub={m.biggestFish ? `${m.biggestFish.lake} · ${fmtDate(m.biggestFish.date)}` : undefined} />
          </div>
        )}
        {m && (m.topTechniques?.length > 0 || m.topBaits?.length > 0 || m.avgRating != null) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {m.avgRating != null && (
              <span className="inline-flex items-center gap-1.5 text-slate-600"><Award size={15} className="text-amber-400" /> Avg trip rating: <strong className="text-slate-900">{m.avgRating}/5</strong></span>
            )}
            {m.topTechniques?.length > 0 && (
              <span className="text-slate-600">Go-to technique: <strong className="text-slate-900 capitalize">{m.topTechniques[0].name}</strong> <span className="text-slate-400">({m.topTechniques[0].count}x)</span></span>
            )}
            {m.topBaits?.length > 0 && (
              <span className="text-slate-600">Most-used bait: <strong className="text-slate-900">{m.topBaits[0].name}</strong> <span className="text-slate-400">({m.topBaits[0].count}x)</span></span>
            )}
          </div>
        )}

        {/* Map */}
        {lakes.length > 0 && (
          <div>
            <h2 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5"><MapPin size={16} className="text-blue-600" /> My Waters</h2>
            <MyWatersMap lakes={lakes} />
          </div>
        )}

        {/* Log list */}
        <div>
          <h2 className="font-bold text-slate-800 mb-2.5">Trip History</h2>
          {logs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Compass size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No trips logged yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">Start your log — even just the lake and what you caught builds your personal intel over time.</p>
              {!showForm && (
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5">
                  <Plus size={16} className="mr-1.5" /> Log Your First Trip
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <LogCard key={log.id} log={log} onEdit={() => { setEditing(log); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} onDelete={() => handleDelete(log.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
