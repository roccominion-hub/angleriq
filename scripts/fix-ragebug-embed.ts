import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const txt = 'Strike King Rage Bug (brand: Strike King, type: soft plastic, sub-type: creature bait): A compact flipping and punching bait with active rage tail appendages that generate vibration and a kicking action on the fall. One of the most popular flipping baits in tournament bass fishing. Rig Texas-style on a 3/0-5/0 heavy flipping hook with a 3/4oz-1oz bullet weight for punching mats. Excellent as a jig trailer. Best colors: black blue, green pumpkin, junebug, watermelon red. Shine in heavy grass mats, dock skipping, and wood cover. Fall rate is moderate, claws flutter on the drop.'

async function fix() {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.VOYAGE_API_KEY },
    body: JSON.stringify({ model: 'voyage-3-lite', input: txt }),
  })
  const data = await res.json() as any
  const embedding = data.data?.[0]?.embedding
  if (!embedding) { console.error('Rate limited or error:', data.detail || data); return }
  const { error } = await supabase.from('lure_catalog').update({ embedding }).match({ brand: 'Strike King', name: 'Strike King Rage Bug' })
  if (error) console.error(error.message)
  else console.log('Fixed Rage Bug embedding. Dim:', embedding.length)
}
fix().catch(console.error)
