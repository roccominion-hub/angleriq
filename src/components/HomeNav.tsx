'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { LogOut, BookOpen } from 'lucide-react'

export function HomeNav() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  const initials = user
    ? (user.user_metadata?.full_name || user.email || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
      <Logo className="h-8 w-auto" />
      <div className="flex gap-3 items-center">
        {user ? (
          <>
            <Link href="/search" className="text-sm font-semibold text-slate-300 hover:text-blue-400 transition-colors">
              Search
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                {initials}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-lg w-48 py-1">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user.user_metadata?.full_name || user.email}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <BookOpen size={14} /> My Reports
                    </Link>
                    <button
                      onClick={async () => { await supabase.auth.signOut(); setMenuOpen(false); setUser(null) }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-sm font-semibold text-slate-300 hover:text-blue-400 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-5">
                Get Started Free
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export function HomeCTA({ isLoggedIn, variant = 'dark' }: { isLoggedIn?: boolean; variant?: 'dark' | 'light' }) {
  const supabase = createClient()
  const [user, setUser] = useState<any>(isLoggedIn ? true : null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const btnClass = variant === 'light'
    ? 'bg-white hover:bg-blue-50 text-blue-600 font-bold text-base px-8 rounded-lg'
    : 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 rounded-lg'

  const href = user ? '/search' : '/auth/signup'

  return (
    <Link href={href}>
      <Button size="lg" className={btnClass}>
        Search a Lake
        <span className="ml-1">›</span>
      </Button>
    </Link>
  )
}
