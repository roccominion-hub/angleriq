import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/set-admin-account.ts <email>')
    process.exit(1)
  }

  // Look up auth user by email
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) { console.error('Error listing users:', userErr.message); process.exit(1) }

  const user = users.find(u => u.email === email)
  if (!user) { console.error(`No user found with email: ${email}`); process.exit(1) }

  // Set subscription_status to 'active' and subscription_tier to 'pro'
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_tier: 'pro',
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error.message)
    process.exit(1)
  }

  console.log(`✅ ${email} → subscription_status: active, subscription_tier: pro`)
  console.log('   This account will never hit trial expiration.')
}

main().catch(console.error)
