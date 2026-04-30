import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const TRIAL_DAYS = 7

function isTrialExpired(trialStartedAt: string | null): boolean {
  if (!trialStartedAt) return false
  const elapsed = Date.now() - new Date(trialStartedAt).getTime()
  return elapsed > TRIAL_DAYS * 24 * 60 * 60 * 1000
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Protect /account and /search — must be logged in
  if (!user && (path.startsWith('/account') || path.startsWith('/search'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Protect /admin — must be logged-in admin email
  if (path.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!user || !adminEmail || user.email !== adminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Gate /search — block expired trial users
  if (user && path.startsWith('/search')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_started_at')
      .eq('id', user.id)
      .maybeSingle()

    const status = profile?.subscription_status
    const expired = status === 'trial' && isTrialExpired(profile?.trial_started_at ?? null)
    const blocked = expired || status === 'cancelled' || status === 'expired'

    if (blocked) {
      const url = request.nextUrl.clone()
      url.pathname = '/account'
      url.searchParams.set('expired', 'true')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/account/:path*', '/admin', '/admin/:path*', '/search/:path*', '/search'],
}
