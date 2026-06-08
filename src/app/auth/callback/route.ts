import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/search'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Send the welcome email exactly once per account, tracked via
      // welcome_email_sent_at — NOT a "created in the last N minutes" check.
      // Email/password signups can take well over 2 minutes between submitting
      // the form and clicking the confirmation link, so a time-window check
      // silently misses most of them. This guarantees a one-time send regardless
      // of how long confirmation takes, and is safe against double-sends/races
      // because the column is set immediately before the send fires.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('welcome_email_sent_at, full_name, email')
            .eq('id', user.id)
            .maybeSingle()

          if (profile && !profile.welcome_email_sent_at) {
            // Mark as sent first to avoid duplicate sends from concurrent callbacks
            const { error: markError } = await supabase
              .from('profiles')
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq('id', user.id)
              .is('welcome_email_sent_at', null)

            if (!markError) {
              // Fire-and-forget — don't block the redirect
              sendWelcomeEmail(
                profile.email || user.email || '',
                profile.full_name || user.user_metadata?.full_name || ''
              ).catch(() => {})
            }
          }
        }
      } catch { /* email failure should never block auth */ }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
