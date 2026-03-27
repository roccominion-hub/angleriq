import { MapPin, Trophy, Sparkles, Fish, Target, BarChart3 } from 'lucide-react'
import { HomeNav, HomeCTA } from '@/components/HomeNav'
import { HowItWorks } from '@/components/HowItWorks'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <HomeNav />

      {/* Hero */}
      <section className="relative px-6 py-28 text-center overflow-hidden">

        {/* Water photo background — rippled lake surface */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero-lake.jpg)' }}
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

      <HowItWorks />

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
