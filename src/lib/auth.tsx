'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  profile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isTrialExpired: boolean
  trialDaysLeft: number
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
  isTrialExpired: false, trialDaysLeft: 7,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadProfile(user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trialDaysLeft = profile?.trial_started_at
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.trial_started_at).getTime()) / 86400000))
    : 7
  const isTrialExpired = profile?.subscription_status === 'trial' && trialDaysLeft === 0

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isTrialExpired, trialDaysLeft }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
