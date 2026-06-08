'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { NavUserMenu } from '@/components/NavUserMenu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Fish, Bookmark, BookmarkCheck, Trash2, Download, Crown,
  Pencil, Camera, KeyRound, ShieldCheck, MapPin, Compass, AlertTriangle, Check, X, Loader2,
  Zap, Feather, Scale, Sailboat, Waves, Anchor, PartyPopper, Pin,
} from 'lucide-react'

const STATES = ['TX', 'OK']
const BAIT_TYPE_OPTIONS = ['soft plastic', 'jig', 'crankbait', 'jerkbait', 'topwater', 'swimbait', 'bladed jig', 'spinnerbait', 'spoon', 'drop shot', 'ned rig']
const FISHING_STYLES = [
  { value: 'power', label: 'Power Fishing', icon: Zap },
  { value: 'finesse', label: 'Finesse', icon: Feather },
  { value: 'balanced', label: 'Balanced', icon: Scale },
]
const BOAT_ACCESS_OPTIONS = [
  { value: 'boat', label: 'Boat', icon: Sailboat },
  { value: 'kayak', label: 'Kayak', icon: Waves },
  { value: 'bank', label: 'Bank / Dock', icon: Anchor },
]

function AccountPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'
  const trialJustExpired = searchParams.get('expired') === 'true'
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)

  // Profile editing (name + avatar)
  const [editingProfile, setEditingProfile] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Security — password reset
  const [resetSent, setResetSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  // Preferences
  const [prefHomeState, setPrefHomeState] = useState('')
  const [prefBaitTypes, setPrefBaitTypes] = useState<string[]>([])
  const [prefStyle, setPrefStyle] = useState('')
  const [prefBoat, setPrefBoat] = useState('')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsMsg, setPrefsMsg] = useState('')

  // Danger zone — account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?next=/account'); return }
      setUser(user)
      const [{ data: prof }, { data: reps }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('saved_reports').select('*').eq('user_id', user.id).order('pinned', { ascending: false }).order('created_at', { ascending: false })
      ])
      setProfile(prof)
      setReports(reps || [])
      setNameDraft(prof?.full_name || user.user_metadata?.full_name || '')
      setAvatarPreview(prof?.avatar_url || user.user_metadata?.avatar_url || null)
      setPrefHomeState(prof?.home_state || '')
      setPrefBaitTypes(prof?.preferred_bait_types || [])
      setPrefStyle(prof?.fishing_style || '')
      setPrefBoat(prof?.boat_access || '')
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trialDaysLeft = profile?.trial_started_at
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.trial_started_at).getTime()) / 86400000))
    : 7
  const isTrialExpired = profile?.subscription_status === 'trial' && trialDaysLeft === 0

  async function togglePin(id: string, pinned: boolean) {
    await supabase.from('saved_reports').update({ pinned: !pinned }).eq('id', id)
    setReports(rs => rs.map(r => r.id === id ? { ...r, pinned: !pinned } : r).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }))
  }

  async function deleteReport(id: string) {
    if (!confirm('Remove this report from your history?')) return
    await supabase.from('saved_reports').delete().eq('id', id)
    setReports(rs => rs.filter(r => r.id !== id))
  }

  function exportPDF(report: any) {
    const win = window.open('', '_blank')
    if (!win) return
    const result = report.result_data || {}
    const summary = report.summary_data || {}
    const weather = report.weather_data || {}
    const topBaits = (result.topBaits || []).slice(0, 5).map((b: any) => `<li>${b.name} (${b.count}x)</li>`).join('')
    const topPatterns = (result.topPatterns || []).slice(0, 4).map((p: any) => `<li>${p.pattern} (${p.count}x)</li>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><title>AnglerIQ Report — ${report.lake_name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 8px; color: #1d4ed8; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
  .weather { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; }
  ul { padding-left: 20px; margin: 0; }
  li { margin-bottom: 4px; }
  .intel { white-space: pre-wrap; }
  .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>🎣 ${report.lake_name}</h1>
<div class="meta">${result.water?.state || ''} · ${result.water?.type || ''} · ${report.trip_date ? 'Trip: ' + report.trip_date : 'Report date: ' + new Date(report.created_at).toLocaleDateString()} · ${result.sampleSize < 15 ? 'Adequate' : result.sampleSize < 50 ? 'Substantial' : 'Exhaustive'} Data Coverage</div>
${weather.tempF ? `<div class="weather">⛅ ${weather.tempF}°F · ${weather.skyCondition || ''} · ${weather.windMph || 0} mph wind · ${weather.season || ''}</div>` : ''}
${summary.intel ? `<h2>Tournament Intel</h2><div class="intel">${summary.intel}</div>` : ''}
${summary.milkRun && summary.milkRun.patterns?.length > 0 ? `
<h2>Recommended Plan</h2>
<ol style="padding-left:20px">
${summary.milkRun.patterns.map((p: any) => `<li style="margin-bottom:12px"><strong>${p.name}</strong><br><span style="color:#64748b;font-size:13px"><b>Why:</b> ${p.why}<br><b>How:</b> ${p.how}<br><b>Where:</b> ${p.where}</span></li>`).join('')}
</ol>
${summary.milkRun.proTip ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-top:12px;font-size:13px"><strong>⭐ Pro Tip:</strong> ${summary.milkRun.proTip}</div>` : ''}
` : ''}
<h2>Additional Intel from Articles</h2>
<h3 style="font-size:14px;color:#64748b;margin-top:16px">Top Baits</h3><ul>${topBaits || '<li>No bait data</li>'}</ul>
<h3 style="font-size:14px;color:#64748b;margin-top:12px">Winning Patterns</h3><ul>${topPatterns || '<li>No pattern data</li>'}</ul>
<div class="footer">Generated by AnglerIQ · getangleriq.com · ${new Date().toLocaleDateString()}</div>
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  // ── Provider detection ──────────────────────────────────────────────────
  const provider: string = user?.app_metadata?.provider || (user?.identities?.[0]?.provider) || 'email'
  const isGoogleUser = provider === 'google'

  // ── Profile editing (name + avatar) ─────────────────────────────────────
  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setProfileMsg('Image must be under 2MB.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    if (!user) return
    setSavingProfile(true)
    setProfileMsg('')
    try {
      let avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, cacheControl: '3600' })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${pub.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: nameDraft.trim(), avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error

      setProfile((p: any) => ({ ...p, full_name: nameDraft.trim(), avatar_url: avatarUrl }))
      setAvatarFile(null)
      setEditingProfile(false)
      setProfileMsg('Profile updated.')
      setTimeout(() => setProfileMsg(''), 3000)
    } catch (err: any) {
      setProfileMsg(err.message || 'Something went wrong saving your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  function cancelEditProfile() {
    setEditingProfile(false)
    setAvatarFile(null)
    setNameDraft(profile?.full_name || user?.user_metadata?.full_name || '')
    setAvatarPreview(profile?.avatar_url || user?.user_metadata?.avatar_url || null)
    setProfileMsg('')
  }

  // ── Security — password reset ────────────────────────────────────────────
  async function handlePasswordReset() {
    if (!user?.email) return
    setSendingReset(true)
    try {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      setResetSent(true)
    } catch {
      setResetSent(true) // Don't leak whether the email exists either way
    } finally {
      setSendingReset(false)
    }
  }

  // ── Preferences ───────────────────────────────────────────────────────────
  function toggleBaitType(bt: string) {
    setPrefBaitTypes(prev => prev.includes(bt) ? prev.filter(b => b !== bt) : [...prev, bt])
  }

  async function savePreferences() {
    if (!user) return
    setSavingPrefs(true)
    setPrefsMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          home_state: prefHomeState || null,
          preferred_bait_types: prefBaitTypes,
          fishing_style: prefStyle || null,
          boat_access: prefBoat || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
      setProfile((p: any) => ({ ...p, home_state: prefHomeState || null, preferred_bait_types: prefBaitTypes, fishing_style: prefStyle || null, boat_access: prefBoat || null }))
      setPrefsMsg('Preferences saved.')
      setTimeout(() => setPrefsMsg(''), 3000)
    } catch (err: any) {
      setPrefsMsg(err.message || 'Something went wrong saving your preferences.')
    } finally {
      setSavingPrefs(false)
    }
  }

  // ── Billing portal ────────────────────────────────────────────────────────
  async function handleManageBilling() {
    setManagingBilling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'No billing account found yet — upgrade to Pro first.')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setManagingBilling(false)
    }
  }

  // ── Account deletion ──────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteTyped !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert(err.message || 'Something went wrong deleting your account. Please contact support.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
        <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <Link href="/"><Logo className="h-7 w-auto" /></Link>
        </nav>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Angler'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href="/"><Logo className="h-7 w-auto" /></Link>
        <NavUserMenu />
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {!editingProfile ? (
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shrink-0 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={displayName} className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold text-slate-900">{displayName}</h1>
                <p className="text-slate-500 text-sm">{user?.email}</p>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                title="Edit profile"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
              >
                <Pencil size={16} />
              </button>
              <Link href="/search">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">New Report</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm">
                    <Camera size={12} className="text-slate-500" />
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarSelect} className="hidden" />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Display name</label>
                  <Input value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Your name" className="h-9 max-w-xs" />
                  <p className="text-slate-400 text-xs mt-1.5">{user?.email}</p>
                </div>
              </div>
              {profileMsg && <p className={`text-xs font-medium ${profileMsg.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>{profileMsg}</p>}
              <div className="flex items-center gap-2">
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-9">
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </Button>
                <Button onClick={cancelEditProfile} disabled={savingProfile} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm h-9">
                  <X size={14} /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Trial expired banner */}
        {trialJustExpired && !justUpgraded && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-amber-500 text-xl">⏰</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Your free trial has ended</p>
              <p className="text-amber-700 text-xs mt-0.5">Upgrade to Pro to continue accessing fishing intel reports.</p>
            </div>
          </div>
        )}

        {/* Upgrade success banner */}
        {justUpgraded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-green-600"><PartyPopper size={20} /></span>
            <div>
              <p className="font-bold text-green-800 text-sm">You&apos;re now a Pro member!</p>
              <p className="text-green-700 text-xs mt-0.5">Full access to all AnglerIQ features is now unlocked.</p>
            </div>
          </div>
        )}

        {/* Subscription status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={16} className="text-amber-500" />
                <span className="font-bold text-slate-900 text-sm">Subscription</span>
                {profile?.subscription_status === 'trial' && !isTrialExpired && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">Free Trial</Badge>
                )}
                {profile?.subscription_status === 'active' && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">Pro Active</Badge>
                )}
                {isTrialExpired && (
                  <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold">Trial Expired</Badge>
                )}
                {!profile && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">Free Trial</Badge>
                )}
              </div>
              {(profile?.subscription_status === 'trial' || !profile) && !isTrialExpired && (
                <p className="text-slate-500 text-sm">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial</p>
              )}
              {isTrialExpired && (
                <p className="text-slate-500 text-sm">Your trial has ended. Upgrade to continue accessing reports.</p>
              )}
              {profile?.subscription_status === 'active' && (
                <p className="text-slate-500 text-sm">Pro plan · Full access</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {profile?.subscription_status === 'active' && profile?.stripe_customer_id && (
                <Button
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm"
                >
                  {managingBilling ? 'Redirecting...' : 'Manage Billing'}
                </Button>
              )}
              {profile?.subscription_status !== 'active' && (
                <Button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm"
                >
                  {upgrading ? 'Redirecting...' : 'Upgrade to Pro — $2.99/mo'}
                </Button>
              )}
            </div>
          </div>
          {profile?.subscription_status === 'active' && (
            <p className="text-slate-400 text-xs mt-3">Manage your payment method, view invoices, or cancel your subscription anytime via Manage Billing — handled securely by Stripe.</p>
          )}
        </div>

        {/* Account & Security */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-blue-600" /> Account &amp; Security
          </h2>

          <div className="flex items-center justify-between flex-wrap gap-3 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email</p>
              <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-3">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <KeyRound size={14} className="text-slate-400" /> Password
              </p>
              {isGoogleUser ? (
                <p className="text-slate-500 text-xs mt-0.5">
                  You signed in with <span className="font-semibold text-slate-700">Google</span> — there&apos;s no AnglerIQ password to reset.
                  Manage your Google account password at{' '}
                  <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                    myaccount.google.com
                  </a>.
                </p>
              ) : resetSent ? (
                <p className="text-green-600 text-xs mt-0.5 font-semibold">Check your inbox — we sent a password reset link to {user?.email}.</p>
              ) : (
                <p className="text-slate-500 text-xs mt-0.5">Send a password reset link to your email.</p>
              )}
            </div>
            {!isGoogleUser && !resetSent && (
              <Button
                onClick={handlePasswordReset}
                disabled={sendingReset}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm shrink-0"
              >
                {sendingReset ? 'Sending...' : 'Reset Password'}
              </Button>
            )}
          </div>
        </div>

        {/* Fishing Preferences */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1">
            <Compass size={16} className="text-blue-600" /> Fishing Preferences
          </h2>
          <p className="text-slate-400 text-xs mb-4">Helps us personalize reports and recommendations as we expand to new states and add logging features.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5"><MapPin size={12} /> Home state</label>
              <div className="flex flex-wrap gap-2">
                {STATES.map(s => (
                  <button
                    key={s}
                    onClick={() => setPrefHomeState(prev => prev === s ? '' : s)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${prefHomeState === s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    {s}
                  </button>
                ))}
                <span className="text-slate-400 text-xs self-center ml-1">More states coming soon</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Preferred bait types</label>
              <div className="flex flex-wrap gap-1.5">
                {BAIT_TYPE_OPTIONS.map(bt => (
                  <button
                    key={bt}
                    onClick={() => toggleBaitType(bt)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${prefBaitTypes.includes(bt) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Fishing style</label>
              <div className="flex flex-wrap gap-2">
                {FISHING_STYLES.map(fs => (
                  <button
                    key={fs.value}
                    onClick={() => setPrefStyle(prev => prev === fs.value ? '' : fs.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${prefStyle === fs.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    <fs.icon size={14} />
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">How do you fish?</label>
              <div className="flex flex-wrap gap-2">
                {BOAT_ACCESS_OPTIONS.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setPrefBoat(prev => prev === b.value ? '' : b.value)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${prefBoat === b.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    <b.icon size={14} />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {prefsMsg && <p className={`text-xs font-medium ${prefsMsg.includes('saved') ? 'text-green-600' : 'text-red-500'}`}>{prefsMsg}</p>}

            <Button onClick={savePreferences} disabled={savingPrefs} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-9">
              {savingPrefs ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Preferences
            </Button>
          </div>
        </div>

        {/* Report history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Fish size={14} /> Saved Reports ({reports.length})
            </h2>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Fish size={36} className="mx-auto mb-3 text-slate-200" strokeWidth={1} />
              <p className="text-slate-500 font-semibold">No saved reports yet</p>
              <p className="text-slate-400 text-sm mt-1">Run a search and save your first report.</p>
              <Link href="/search" className="mt-4 inline-block">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm mt-4">Run a Report</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => {
                const result = report.result_data || {}
                const topBaits = (result.topBaits || []).slice(0, 2)
                return (
                  <div key={report.id} className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-4 ${report.pinned ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        {report.pinned && <span title="Pinned" className="text-amber-500"><Pin size={14} /></span>}
                        <div>
                          <p className="font-bold text-slate-900">{report.lake_name}</p>
                          <p className="text-slate-400 text-xs">{report.lake_state} · {report.trip_date ? `Trip: ${report.trip_date}` : 'Right Now report'} · Saved {new Date(report.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {topBaits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {topBaits.map((b: any) => (
                            <Badge key={b.name} variant="outline" className="border-slate-200 text-slate-600 text-xs">{b.name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePin(report.id, report.pinned)}
                        title={report.pinned ? 'Unpin' : 'Pin to top'}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${report.pinned ? 'text-amber-500' : 'text-slate-400'}`}
                      >
                        {report.pinned ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                      <button
                        onClick={() => exportPDF(report)}
                        title="Export to PDF"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        title="Remove report"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-100 rounded-xl p-5">
          <h2 className="font-bold text-red-600 text-sm flex items-center gap-2 mb-1">
            <AlertTriangle size={16} /> Danger Zone
          </h2>
          <p className="text-slate-400 text-xs mb-4">Permanently delete your account, saved reports, and subscription. This cannot be undone.</p>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-sm"
            >
              <Trash2 size={14} /> Delete Account
            </Button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-800 font-semibold">Are you absolutely sure?</p>
              <p className="text-red-700 text-xs leading-relaxed">
                This will permanently delete your account, all saved reports, and cancel any active subscription.
                {profile?.subscription_status === 'active' && ' Your Pro subscription will be cancelled immediately.'}
                {' '}There is no way to recover this data. Type <strong>DELETE</strong> below to confirm.
              </p>
              <Input
                value={deleteTyped}
                onChange={e => setDeleteTyped(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="h-9 max-w-xs bg-white"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleteTyped !== 'DELETE' || deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm h-9 disabled:opacity-40"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting...' : 'Permanently Delete My Account'}
                </Button>
                <Button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteTyped('') }}
                  disabled={deleting}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  )
}
