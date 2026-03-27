import { MapPin, Trophy, Sparkles, Fish, Target, BarChart3 } from 'lucide-react'
import { HomeNav, HomeCTA } from '@/components/HomeNav'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <HomeNav />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-slate-950 to-slate-800 px-6 py-28 text-center overflow-hidden">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 text-sm text-blue-300 font-semibold mb-8 tracking-wide uppercase">
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

          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            AnglerIQ aggregates tournament results, winning techniques, baits, and conditions
            — then delivers an actionable plan for your day on the water.
          </p>

          <div className="flex gap-3 justify-center">
            <HomeCTA />
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-slate-400 text-sm font-semibold">
            <span className="flex items-center gap-2"><BarChart3 size={15} className="text-blue-400" /> 500+ Tournament Reports</span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-2"><MapPin size={15} className="text-blue-400" /> 50+ Texas Lakes</span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-2"><Fish size={15} className="text-blue-400" /> Bass Only. Artificial Only.</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600 mb-10">How It Works</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <MapPin size={20} className="text-blue-600" />,
                title: 'Pick Your Lake',
                desc: 'Search any named bass fishery. AnglerIQ pulls every tournament result, technique report, and winning pattern on record for that water.',
              },
              {
                step: '02',
                icon: <BarChart3 size={20} className="text-blue-600" />,
                title: 'We Crunch the Data',
                desc: 'Tournament results from B.A.S.S., MLF, and local circuits are analyzed against real conditions — temp, sky, season, moon phase.',
              },
              {
                step: '03',
                icon: <Target size={20} className="text-blue-600" />,
                title: 'Get Your Game Plan',
                desc: 'A clear, AI-generated fishing report tells you exactly what to throw, where to fish it, and why it works right now.',
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-100 leading-none">{s.step}</span>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
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
