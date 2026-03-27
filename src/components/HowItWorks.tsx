'use client'
import { useState } from 'react'
import { Search, SlidersHorizontal, Brain, FileText, MapPin, BarChart3, Target } from 'lucide-react'

// ── Step mockups ─────────────────────────────────────────────────────────────

function LakeSearchMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 text-left space-y-4">
      <div className="flex items-center gap-2 border border-blue-300 rounded-lg px-3 py-2.5 bg-blue-50">
        <Search size={15} className="text-blue-400 shrink-0" />
        <span className="text-sm font-semibold text-slate-700">Lake Fork, TX</span>
        <span className="ml-auto w-2 h-4 bg-blue-400 rounded-sm animate-pulse" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal size={13} className="text-slate-400" />
        {['Spring', 'Morning', 'Clear Water', 'Offshore'].map(f => (
          <span key={f} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">{f}</span>
        ))}
      </div>
      <div className="space-y-2 pt-1">
        {[
          { rank: 1, label: 'Football Jig — 3/4oz', sub: 'Deep ledge, 18–24ft' },
          { rank: 2, label: 'Swimbait — Keitech 4.8"', sub: 'Open water, 12–18ft' },
          { rank: 3, label: 'Drop Shot — 6" Roboworm', sub: 'Points, 15–22ft' },
        ].map(b => (
          <div key={b.rank} className="flex items-center gap-3 border border-slate-100 rounded-lg px-3 py-2 bg-slate-50">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">{b.rank}</span>
            <div>
              <div className="text-xs font-bold text-slate-800">{b.label}</div>
              <div className="text-[11px] text-slate-400">{b.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DataCrunchMockup() {
  const sources = [
    { label: 'B.A.S.S. Tournaments', active: true },
    { label: 'MLF Results', active: true },
    { label: 'Local Circuit Data', active: true },
    { label: 'Forum Reports', active: true },
    { label: 'Weather Conditions', active: false },
    { label: 'Moon Phase / Solunar', active: false },
  ]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 text-left space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {sources.map((s) => (
          <div key={s.label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.active ? 'bg-green-400' : 'bg-blue-400'}`} />
            <span className="text-[11px] font-semibold text-slate-600 leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">AI Synthesis in Progress</span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full w-4/5" />
        </div>
        <div className="flex justify-between text-[10px] text-blue-400 font-semibold">
          <span>Analyzing 847 reports</span>
          <span>Matching conditions…</span>
        </div>
      </div>
      <div className="flex gap-1.5 items-end pt-1">
        {[55, 80, 45, 90, 65, 70, 40, 85, 60, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-blue-200" style={{ height: h * 0.5 }}>
            <div className="rounded-sm bg-blue-500 w-full" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 text-left space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-blue-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Today's Game Plan — Lake Fork</span>
        <span className="ml-auto text-[10px] bg-green-50 text-green-600 border border-green-100 font-bold px-2 py-0.5 rounded-full">Live</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 bg-slate-100 rounded-full w-full" />
        <div className="h-2.5 bg-slate-100 rounded-full w-5/6" />
        <div className="h-2.5 bg-slate-100 rounded-full w-3/4" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Jig', color: 'bg-blue-100' },
          { label: 'Swimbait', color: 'bg-indigo-100' },
          { label: 'Crank', color: 'bg-sky-100' },
        ].map((b) => (
          <div key={b.label} className="border border-slate-100 rounded-lg p-2.5 text-center bg-slate-50">
            <div className={`w-8 h-8 ${b.color} rounded-lg mx-auto mb-1.5`} />
            <span className="text-[11px] font-bold text-slate-600">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-1.5">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2">Top Colors</div>
        {[
          { name: 'Green Pumpkin', swatch: '#4a7c3f' },
          { name: 'Black & Blue', swatch: '#1e3a5f' },
          { name: 'Sexy Shad', swatch: '#8fa8c0' },
        ].map(c => (
          <div key={c.name} className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: c.swatch }} />
            <span className="text-[11px] font-semibold text-slate-600">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    icon: <MapPin size={16} className="text-blue-600" />,
    title: 'Pick Your Lake',
    desc: 'Search any named bass fishery. AnglerIQ pulls every tournament result, technique report, and winning pattern on record for that water.',
    mockup: <LakeSearchMockup />,
  },
  {
    num: '02',
    icon: <BarChart3 size={16} className="text-blue-600" />,
    title: 'We Crunch the Data',
    desc: 'Tournament results from B.A.S.S., MLF, and local circuits are cross-referenced against real conditions — temp, sky, season, and moon phase.',
    mockup: <DataCrunchMockup />,
  },
  {
    num: '03',
    icon: <Target size={16} className="text-blue-600" />,
    title: 'Get Your Game Plan',
    desc: 'A clear, AI-generated fishing report tells you exactly what to throw, where to fish it, what color, and why it works right now.',
    mockup: <ReportMockup />,
  },
]

export function HowItWorks() {
  const [active, setActive] = useState(0)

  return (
    <section className="bg-slate-50 border-y border-slate-100 px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600 mb-12">How It Works</p>
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">

          {/* Left — tab list */}
          <div className="flex flex-col gap-2 md:w-2/5 w-full">
            {STEPS.map((s, i) => (
              <button
                key={s.num}
                onClick={() => setActive(i)}
                className={`text-left rounded-xl px-5 py-4 border transition-all ${
                  active === i
                    ? 'bg-white border-blue-200 shadow-md'
                    : 'bg-transparent border-transparent hover:bg-white/60 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`text-3xl font-black leading-none select-none transition-colors ${active === i ? 'text-blue-200' : 'text-slate-200'}`}>
                    {s.num}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${active === i ? 'bg-blue-50 border border-blue-100' : 'bg-slate-100'}`}>
                    {s.icon}
                  </div>
                  <span className={`font-bold text-sm transition-colors ${active === i ? 'text-slate-900' : 'text-slate-500'}`}>
                    {s.title}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed transition-colors pl-0.5 ${active === i ? 'text-slate-500' : 'text-slate-400'}`}>
                  {s.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Right — mockup panel */}
          <div className="md:w-3/5 w-full">
            {STEPS[active].mockup}
          </div>

        </div>
      </div>
    </section>
  )
}
