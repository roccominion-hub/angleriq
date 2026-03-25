'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, BookOpen } from 'lucide-react'

export function NavUserMenu() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Sign In</Link>
        <Link href="/auth/signup" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
          Start Free Trial
        </Link>
      </div>
    )
  }

  const initials = (user.user_metadata?.full_name || user.email || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center hover:bg-blue-700 transition-colors">
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-lg w-48 py-1">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.user_metadata?.full_name || user.email}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <BookOpen size={14} /> My Reports
            </Link>
            <button onClick={async () => { await supabase.auth.signOut(); setOpen(false); router.push('/') }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
