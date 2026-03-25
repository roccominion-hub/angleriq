import { MapPin, Trophy, Sparkles } from 'lucide-react'
import { HomeNav, HomeCTA } from '@/components/HomeNav'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <HomeNav />

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-sm text-blue-700 font-semibold mb-8">
          <Trophy size={14} />
          Tournament-proven intel, now searchable
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto text-slate-900 mb-5 tracking-tight">
          What&apos;s working on{' '}
          <span className="text-blue-600">your water</span>?
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 font-medium">
          AnglerIQ aggregates tournament results, winning techniques, baits, and conditions
          — then delivers actionable fishing intelligence for your body of water.
        </p>
        <div className="flex gap-3 justify-center">
          <HomeCTA />
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto px-6 pb-24">
        {[
          {
            icon: <MapPin size={22} className="text-blue-600" />,
            title: 'Lake-Specific Intel',
            desc: 'Search any body of water. Get patterns, baits, and techniques proven on that exact fishery.',
          },
          {
            icon: <Trophy size={22} className="text-blue-600" />,
            title: 'Tournament Data',
            desc: 'Aggregated from B.A.S.S., MLF, and local events. Real results from real pros.',
          },
          {
            icon: <Sparkles size={22} className="text-blue-600" />,
            title: 'AI Fishing Reports',
            desc: 'Not raw data — AnglerIQ synthesizes the intel into clear, actionable fishing reports.',
          },
        ].map((f) => (
          <div key={f.title} className="border border-slate-100 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              {f.icon}
            </div>
            <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 text-center py-6 text-slate-400 text-sm font-medium">
        © 2026 AnglerIQ · getangleriq.com
      </footer>
    </main>
  )
}
