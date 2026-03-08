import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎣</span>
          <span className="text-xl font-bold text-cyan-400">AnglerIQ</span>
        </div>
        <div className="flex gap-3">
          <Link href="/search">
            <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">Search</Button>
          </Link>
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 bg-cyan-900/40 border border-cyan-700 rounded-full px-4 py-1 text-sm text-cyan-300">
          🏆 Tournament-proven intel, now searchable
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight max-w-3xl">
          What&apos;s working on{' '}
          <span className="text-cyan-400">your water</span> right now?
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl">
          AnglerIQ aggregates tournament results, winning techniques, baits, and conditions
          — then tells you exactly what&apos;s producing on your body of water.
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/search">
            <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8">
              Search a Lake
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-slate-500 text-slate-200 hover:bg-slate-700 text-lg px-8">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 pb-24">
        {[
          {
            icon: '📍',
            title: 'Lake-Specific Intel',
            desc: 'Search by any body of water. Get patterns, baits, and techniques proven on that exact fishery.',
          },
          {
            icon: '🏆',
            title: 'Tournament Data',
            desc: 'Aggregated from B.A.S.S., MLF, and local tournaments. Real results from real pros.',
          },
          {
            icon: '🤖',
            title: 'AI Summaries',
            desc: 'Not just raw data — AnglerIQ synthesizes the intel into clear, actionable fishing reports.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col gap-3">
            <span className="text-3xl">{f.icon}</span>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 text-center py-6 text-slate-500 text-sm">
        © 2026 AnglerIQ · getangleriq.com
      </footer>
    </main>
  )
}
