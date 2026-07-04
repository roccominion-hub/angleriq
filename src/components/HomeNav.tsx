'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { LogOut, BookOpen, MessageCircle, Compass } from 'lucide-react'
import { ChatDrawer } from '@/components/ChatDrawer'

// Load the signed-in user's home state so Ask AnglerIQ can tailor its
// starter prompts to where they fish. Empty string when logged out / unset.
function useHomeState(): string {
  const [homeState, setHomeState] = useState('')
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('home_state').eq('id', user.id).maybeSingle()
        .then(({ data }) => { if (data?.home_state) setHomeState(data.home_state) })
    })
  }, [])
  return homeState
}

// ── HomeNav ───────────────────────────────────────────────────────────────

export function HomeNav() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const homeState = useHomeState()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  const initials = user
    ? (user.user_metadata?.full_name || user.email || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  function handleAskClick() {
    if (!user) {
      router.push('/auth/login?next=/search')
      return
    }
    setChatOpen(true)
  }

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-50">
        <Logo className="h-8 w-auto" variant="light" />
        <div className="flex gap-3 items-center">
          {/* Ask AnglerIQ — always visible */}
          {/* Icon-only on mobile, full label on sm+ */}
          <button
            onClick={handleAskClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full transition-all shadow-sm shadow-blue-500/30"
            aria-label="Ask AnglerIQ"
          >
            <MessageCircle size={15} />
            <span className="hidden sm:inline">Ask AnglerIQ</span>
          </button>

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
                      <Link href="/log" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Compass size={14} /> My Fishing Log
                      </Link>
                      <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <BookOpen size={14} /> Account
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

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={{ mode: 'homepage', homeState }}
      />
    </>
  )
}

// ── HomeCTA ───────────────────────────────────────────────────────────────

export function HomeCTA({ isLoggedIn, variant = 'dark' }: { isLoggedIn?: boolean; variant?: 'dark' | 'light' }) {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(isLoggedIn ? true : null)
  const [chatOpen, setChatOpen] = useState(false)
  const homeState = useHomeState()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  function handleAskClick() {
    if (!user) {
      router.push('/auth/login?next=/search')
      return
    }
    setChatOpen(true)
  }

  const searchBtnClass = variant === 'light'
    ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 h-12 rounded-xl'
    : 'bg-white hover:bg-blue-50 text-blue-700 font-bold text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-white/20'

  const searchHref = user ? '/search' : '/auth/signup'

  return (
    <>
      <Link href={searchHref}>
        <Button size="lg" className={searchBtnClass}>
          Search a Lake
          <span className="ml-1">›</span>
        </Button>
      </Link>

      <button
        onClick={handleAskClick}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-bold text-base px-7 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-400/40 hover:-translate-y-px"
      >
        <MessageCircle size={18} />
        Ask AnglerIQ
      </button>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={{ mode: 'homepage', homeState }}
      />
    </>
  )
}
