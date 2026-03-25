'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push(next)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo className="h-8 w-auto" /></Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-xl font-extrabold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to your AnglerIQ account</p>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/></svg>
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">or</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="h-10" />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            No account? <Link href="/auth/signup" className="text-blue-600 font-semibold hover:underline">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
