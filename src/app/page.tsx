import { MapPin, Trophy, Sparkles, Fish, Target, BarChart3, Search, SlidersHorizontal, Brain, FileText, ChevronRight } from 'lucide-react'
import { HomeNav, HomeCTA } from '@/components/HomeNav'

// ── Step mockup components ───────────────────────────────────────────────────

function LakeSearchMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 text-left space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2 border border-blue-300 rounded-lg px-3 py-2 bg-blue-50">
        <Search size={14} className="text-blue-400 shrink-0" />
        <span className="text-sm font-semibold text-slate-700">Lake Fork, TX</span>
        <span className="ml-auto w-2 h-4 bg-blue-400 rounded-sm animate-pulse" />
      </div>
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SlidersHorizontal size={12} className="text-slate-400" />
        {['Spring', 'Morning', 'Clear Water', 'Offshore'].map(f => (
          <span key={f} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{f}</span>
        ))}
      </div>
      {/* Result rows */}
      {['Jig — Football, 3/4oz', 'Swimbait — Keitech 4.8"', 'Dropshot — 6" Roboworm'].map((b, i) => (
        <div key={b} className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-50 pt-2">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
          {b}
        </div>
      ))}
    </div>
  )
}

function DataCrunchMockup() {
  const sources = ['B.A.S.S. Results', 'MLF Data', 'Local Circuits', 'Forum Reports', 'YouTube Intel', 'Weather + Moon']
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 text-left space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {sources.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < 4 ? 'bg-green-400' : 'bg-blue-400'}`} />
            <span className="text-[11px] font-semibold text-slate-600 leading-tight">{s}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        <Brain size={14} className="text-blue-500 shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">AI Synthesis</div>
          <div className="flex gap-0.5 mt-1">
            {[90, 65, 80, 45, 70, 55, 85].map((w, i) => (
              <div key={i} className="bg-blue-400 rounded-sm" style={{ width: 6, height: w / 10 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportMockup() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 text-left space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText size={13} className="text-blue-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Today's Game Plan</span>
        <span className="ml-auto text-[10px] bg-green-50 text-green-600 border border-green-100 font-bold px-1.5 py-0.5 rounded-full">Live</span>
      </div>
      {/* Skeleton lines */}
      <div className="space-y-2">
        <div className="h-2.5 bg-slate-100 rounded-full w-full" />
        <div className="h-2.5 bg-slate-100 rounded-full w-5/6" />
        <div className="h-2.5 bg-slate-100 rounded-full w-4/6" />
      </div>
      {/* Bait cards */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {['Jig', 'Swimbait', 'Crank'].map((b) => (
          <div key={b} className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
            <div className="w-6 h-6 bg-blue-200 rounded-md mx-auto mb-1" />
            <span className="text-[10px] font-bold text-blue-700">{b}</span>
          </div>
        ))}
      </div>
      {/* Color row */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Colors</span>
        {['#2d4a1e', '#7c6b4a', '#3b5998', '#c0392b'].map(c => (
          <span key={c} className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <HomeNav />

      {/* Hero */}
      <section className="relative px-6 py-28 text-center overflow-hidden">

        {/* Water photo background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504198266287-1659872e6590?w=1600&q=80&auto=format&fit=crop)' }}
        />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Gradient cover — lighter at top, darker at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-900/80" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm text-blue-200 font-semibold mb-8 tracking-wide uppercase">
            <Trophy size={13} />
            Tournament-Proven Bass Fishing Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] max-w-4xl mx-auto text-white mb-4 tracking-tight">
            Intel Over{' '}
            <span className="text-blue-400">Instinct.</span>
          </h1>

          <p className="text-xl md:text-2xl text-blue-200 font-bold mb-4 tracking-tight">
            Ditch the Guesswork. Fish the Intel.
          </p>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            AnglerIQ aggregates tournament results, winning techniques, baits, and conditions
            — then delivers an actionable plan for your day on the water.
          </p>

          <div className="flex gap-3 justify-center">
            <HomeCTA />
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-slate-300 text-sm font-semibold">
            <span className="flex items-center gap-2"><MapPin size={15} className="text-blue-400" /> Texas Lakes Now, Expanding Soon</span>
            <span className="text-slate-500">·</span>
            <span className="flex items-center gap-2"><BarChart3 size={15} className="text-blue-400" /> 1000s of Data Sources</span>
            <span className="text-slate-500">·</span>
            <span className="flex items-center gap-2"><Fish size={15} className="text-blue-400" /> Bass Fishing Focused</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600 mb-12">How It Works</p>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Pick Your Lake',
                desc: 'Search any named bass fishery. AnglerIQ pulls every tournament result, technique report, and winning pattern on record for that water.',
                mockup: <LakeSearchMockup />,
              },
              {
                step: '02',
                title: 'We Crunch the Data',
                desc: 'Tournament results from B.A.S.S., MLF, and local circuits are analyzed against real conditions — temp, sky, season, moon phase.',
                mockup: <DataCrunchMockup />,
              },
              {
                step: '03',
                title: 'Get Your Game Plan',
                desc: 'A clear, AI-generated fishing report tells you exactly what to throw, where to fish it, and why it works right now.',
                mockup: <ReportMockup />,
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-4xl font-black text-blue-100 leading-none select-none">{s.step}</span>
                  <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                </div>
                {s.mockup}
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600 mb-10">What You Get</p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: <Fish size={22} className="text-blue-600" />,
              title: 'Lake-Specific Patterns',
              desc: 'Not generic advice — patterns proven on your exact fishery, filtered by season, conditions, and structure type.',
            },
            {
              icon: <Trophy size={22} className="text-blue-600" />,
              title: 'Real Tournament Data',
              desc: 'Every report comes from actual tournament results. Real pros, real places, real winning baits.',
            },
            {
              icon: <Sparkles size={22} className="text-blue-600" />,
              title: 'AI Fishing Reports',
              desc: 'Raw data becomes a clear action plan. What to throw, what color, what depth — built for today\'s conditions.',
            },
          ].map((f) => (
            <div key={f.title} className="border border-slate-100 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-blue-600 px-6 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
          Ready to fish smarter?
        </h2>
        <p className="text-blue-100 font-medium mb-8 text-lg">
          Search your lake. Get your game plan. Win more.
        </p>
        <div className="flex gap-3 justify-center">
          <HomeCTA variant="light" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 text-center py-6 text-slate-400 text-sm font-medium">
        © 2026 AnglerIQ · getangleriq.com
      </footer>
    </main>
  )
}
