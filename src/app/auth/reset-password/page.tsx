'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Loader2 } from 'lucide-react'

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase establishes a recovery session from the URL hash on page load
  // (detectSessionInUrl). Wait for that before allowing the password update.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    // Fallback: if a session already exists (e.g. fast hash processing), allow it
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/account'), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Link href="/"><Logo className="h-8 w-auto" /></Link></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Password updated</h2>
              <p className="text-slate-500 text-sm">Taking you to your account…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-8">
              <Loader2 size={28} className="text-blue-600 mx-auto mb-3 animate-spin" />
              <p className="text-slate-500 text-sm">Verifying your reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-slate-900 mb-1">Set a new password</h1>
              <p className="text-slate-500 text-sm mb-6">Choose a new password for your AnglerIQ account.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input type="password" placeholder="New password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="h-10" />
                <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className="h-10" />
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10">
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}
