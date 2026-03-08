import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎣</span>
          <span className="text-xl font-bold text-blue-700">AnglerIQ</span>
        </div>
        <div className="flex gap-3">
          <Link href="/search">
            <Button variant="outline" className="border-slate-300 text-slate-700">Search Lakes</Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started Free</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-full px-4 py-1 text-sm text-blue-700 mb-6">
          🏆 Tournament-proven intel, now searchable
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto text-slate-900 mb-4">
          What&apos;s working on{' '}
          <span className="text-blue-600">your water</span>?
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          AnglerIQ aggregates tournament results, winning techniques, baits, and conditions
          — then tells you exactly what&apos;s producing on your body of water.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/search">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8">
              Search a Lake
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 text-lg px-8">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 py-16">
        {[
          {
            icon: '📍',
            title: 'Lake-Specific Intel',
            desc: 'Search any body of water. Get patterns, baits, and techniques proven on that exact fishery.',
          },
          {
            icon: '🏆',
            title: 'Tournament Data',
            desc: 'Aggregated from B.A.S.S., MLF, and local events. Real results from real pros.',
          },
          {
            icon: '🤖',
            title: 'AI Fishing Reports',
            desc: 'Not raw data — AnglerIQ synthesizes the intel into clear, actionable fishing reports.',
          },
        ].map((f) => (
          <div key={f.title} className="border border-slate-200 rounded-xl p-6 flex flex-col gap-3 bg-white shadow-sm">
            <span className="text-3xl">{f.icon}</span>
            <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
            <p className="text-slate-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 text-center py-6 text-slate-400 text-sm">
        © 2026 AnglerIQ · getangleriq.com
      </footer>
    </main>
  )
}
