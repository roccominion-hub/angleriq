import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Permanently deletes the angler's account: cancels any active Stripe
// subscription, then removes the auth.users row. profiles and saved_reports
// cascade-delete automatically via `on delete cascade` foreign keys.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()

  // Best-effort: cancel any active Stripe subscription before deleting the account
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.stripe_customer_id) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active' })
      await Promise.all(subs.data.map(s => stripe.subscriptions.cancel(s.id)))
    }
  } catch {
    // Don't block account deletion on a Stripe hiccup — worst case the
    // subscription is cancelled manually; the user record is still removed.
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
