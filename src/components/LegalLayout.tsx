import Link from 'next/link'
import { Logo } from '@/components/Logo'

// Shared chrome + typography for the legal pages (/privacy, /terms).
export function LegalLayout({ title, effectiveDate, intro, children }: {
  title: string
  effectiveDate: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo className="h-7 w-auto" /></Link>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to home</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-400 mb-8">Effective date: {effectiveDate}</p>
        {intro && <div className="text-slate-600 text-[15px] leading-relaxed mb-6">{intro}</div>}
        <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
          {children}
        </div>
      </article>

      <footer className="border-t border-slate-100 text-center py-6 text-slate-400 text-sm font-medium">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
        </div>
        © 2026 AnglerIQ · getangleriq.com
      </footer>
    </main>
  )
}

// Section heading + list helpers for consistent legal typography.
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 pt-2">{heading}</h2>
      {children}
    </section>
  )
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}
