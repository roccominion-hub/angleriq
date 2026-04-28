import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'
import Link from 'next/link'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    trial:     'bg-green-50 text-green-700 border-green-200',
    active:    'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
    expired:   'bg-red-50 text-red-600 border-red-200',
  }
  const cls = map[status ?? ''] ?? 'bg-slate-50 text-slate-400 border-slate-200'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

export default async function AdminPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect('/')
  }

  // Fetch all profiles via service role
  const { data: profiles } = await serviceSupabase
    .from('profiles')
    .select('id, email, full_name, subscription_status, subscription_tier, trial_started_at, created_at, last_active_at, reports_run')
    .order('created_at', { ascending: false })

  const rows = profiles ?? []

  // Aggregate stats
  const total = rows.length
  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    const s = r.subscription_status ?? 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const totalReports = rows.reduce((sum, r) => sum + (r.reports_run ?? 0), 0)
  const last30Days = rows.filter(r =>
    r.created_at && new Date(r.created_at) > new Date(Date.now() - 30 * 86400000)
  ).length

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href="/"><Logo className="h-7 w-auto" /></Link>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin</span>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={total} />
          <StatCard label="New (30 days)" value={last30Days} />
          <StatCard label="Total Reports Run" value={totalReports} />
          <StatCard label="Active Subs" value={byStatus.active ?? 0} />
        </div>

        {/* Subscription breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Subscription Breakdown</p>
          <div className="flex flex-wrap gap-4">
            {['trial', 'active', 'cancelled', 'expired', 'unknown'].map(s => (
              byStatus[s] != null && (
                <div key={s} className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">{byStatus[s]}</p>
                  <StatusBadge status={s} />
                </div>
              )
            ))}
          </div>
        </div>

        {/* User table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Users ({total})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Trial Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{r.full_name || '—'}</p>
                      <p className="text-slate-400 text-xs">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.subscription_status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.reports_run ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {r.last_active_at ? new Date(r.last_active_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {r.trial_started_at ? new Date(r.trial_started_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
