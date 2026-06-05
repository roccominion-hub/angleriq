/**
 * Seed the lure_catalog table with curated brand + product data.
 *
 * Data covers every brand / bait that appears in AnglerIQ technique reports
 * (queried from bait_used), plus important generic technique entries.
 *
 * Run:
 *   npx tsx scripts/seed-lure-catalog.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!

// ── Embedding helpers ────────────────────────────────────────────────────────

// Batch embed multiple texts in a single Voyage API call.
// Voyage supports array input — much faster than one call per text.
// Free tier: 3 RPM, but a single call can embed many texts if total tokens fit.
// Splits into chunks of BATCH_SIZE to stay within token limits.
const BATCH_SIZE = 25  // safe batch size well within Voyage limits

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!VOYAGE_API_KEY) { console.warn('No VOYAGE_API_KEY'); return texts.map(() => null) }

  const results: (number[] | null)[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 8000))
    console.log(`  Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} texts)...`)

    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
      body: JSON.stringify({ model: 'voyage-3-lite', input: batch }),
    })

    if (!res.ok) {
      console.error('Voyage batch error:', await res.text())
      results.push(...batch.map(() => null))
      continue
    }

    const data = await res.json() as any
    // Voyage returns data[] sorted by index
    const embeddings = (data.data ?? []).sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding as number[])
    results.push(...embeddings)

    // Rate-limit pause between batches (free tier: 3 RPM)
    if (i + BATCH_SIZE < texts.length) {
      console.log('  Waiting 21s between batches (Voyage rate limit)...')
      await new Promise(r => setTimeout(r, 21_000))
    }
  }

  return results
}

// ── Lure catalog entries ─────────────────────────────────────────────────────

interface LureEntry {
  brand: string
  name: string
  aliases?: string[]
  bait_type: string
  sub_type?: string
  chunk_text: string
  sizes?: string[]
  colors?: string[]
  depth_ft_min?: number
  depth_ft_max?: number
  techniques?: string[]
  structure?: string[]
  seasons?: string[]
  source_url?: string
}

const LURES: LureEntry[] = [

  // ─────────────────────────────────────────────────────────────────────────
  // STRIKE KING
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Strike King',
    name: 'Strike King 10XD',
    aliases: ['10XD', 'KVD 10XD', 'Strike King KVD 10XD'],
    bait_type: 'crankbait',
    sub_type: 'deep_diving_crankbait',
    sizes: ['3oz, 5 inch'],
    colors: ['sexy shad', 'chartreuse sexy shad', 'green gizzard shad', 'pro blue', 'bluegill', 'ghost'],
    depth_ft_min: 14,
    depth_ft_max: 25,
    techniques: ['ledge cranking', 'deep cranking', 'offshore structure cranking'],
    structure: ['ledge', 'channel', 'hump', 'offshore point', 'road bed'],
    seasons: ['summer', 'fall'],
    source_url: 'https://www.strikeking.com/crankbaits/kvd-square-bill/10xd',
    chunk_text: `Strike King 10XD Deep Diving Crankbait (brand: Strike King, type: crankbait, sub-type: deep diving): The 10XD is a tournament-proven deep-diving crankbait designed to reach 14–25 feet on long casts with 10-12lb fluorocarbon. It is the go-to bait for targeting bass on offshore ledges, submerged road beds, channel swings, and deep humps during the summer and fall transition. The large profile and tight wobble trigger reaction strikes from ledge bass that have seen heavy pressure. Retrieve with a sweeping rod motion and count it down to the bottom. Works best on 8:1 gear ratio reel and 10lb fluorocarbon on a long-cast crankbait rod. Key colors: sexy shad, chartreuse sexy shad, green gizzard shad, pro blue, ghost. Top producer on Sam Rayburn, Toledo Bend, Lake Fork, and other deep impoundments. Available in 3oz, 5-inch profile.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King 6XD',
    aliases: ['6XD', 'Pro Model 6XD', 'Strike King Pro Model 6XD'],
    bait_type: 'crankbait',
    sub_type: 'deep_diving_crankbait',
    sizes: ['1.25oz, 3.75 inch'],
    colors: ['sexy shad', 'chartreuse sexy shad', 'green gizzard shad', 'pro blue', 'citrus shad', 'bluegill'],
    depth_ft_min: 10,
    depth_ft_max: 18,
    techniques: ['deep cranking', 'ledge cranking', 'offshore structure fishing'],
    structure: ['ledge', 'channel', 'hump', 'point'],
    seasons: ['summer', 'fall', 'spring'],
    source_url: 'https://www.strikeking.com/crankbaits/6xd',
    chunk_text: `Strike King 6XD Deep Diving Crankbait (brand: Strike King, type: crankbait, sub-type: deep diving): The 6XD reaches 10–18 feet on standard casts with 10-12lb fluorocarbon. A versatile deep cranker for ledges, channel swings, humps, and submerged points. Slightly smaller profile than the 10XD — good choice when fish want a smaller presentation or in moderate-depth ledge situations (10–16ft). Fish it on 10lb fluorocarbon with a moderate-fast crankbait rod. Colors: sexy shad, chartreuse sexy shad, citrus shad, pro blue, green gizzard shad.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Pro Model 8XD',
    aliases: ['8XD', 'Pro Model 8XD', 'Strike King 8XD'],
    bait_type: 'crankbait',
    sub_type: 'deep_diving_crankbait',
    sizes: ['2oz, 4.5 inch'],
    colors: ['sexy shad', 'chartreuse sexy shad', 'pro blue', 'green gizzard shad', 'ghost'],
    depth_ft_min: 12,
    depth_ft_max: 22,
    techniques: ['deep cranking', 'ledge cranking'],
    structure: ['ledge', 'channel', 'hump', 'road bed'],
    seasons: ['summer', 'fall'],
    source_url: 'https://www.strikeking.com/crankbaits/8xd',
    chunk_text: `Strike King Pro Model 8XD Deep Diving Crankbait (brand: Strike King, type: crankbait, sub-type: deep diving): Intermediate deep diver between the 6XD and 10XD. Reaches 12–22 feet. Same ledge-fishing application — use when bass are staged at mid-depth ledge structure in the 14–20ft range. Large profile swimbait-like wobble. 2oz, 4.5 inch body. Use 12lb fluorocarbon. Colors: sexy shad, chartreuse sexy shad, pro blue, green gizzard shad, ghost minnow.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Red Eye Shad',
    aliases: ['Red Eye Shad', 'Strike King Red Eye', 'Strike King Redeye Shad'],
    bait_type: 'lipless crankbait',
    sub_type: 'lipless_crankbait',
    sizes: ['1/2oz', '3/4oz', '1oz'],
    colors: ['chrome blue', 'sexy shad', 'chartreuse sexy shad', 'gold black', 'red crawfish', 'chrome red', 'natural shad'],
    depth_ft_min: 0,
    depth_ft_max: 15,
    techniques: ['ripping lipless', 'burning lipless', 'yo-yoing', 'swimming through grass'],
    structure: ['grass', 'grass flat', 'channel edge', 'point', 'flat'],
    seasons: ['spring', 'fall', 'winter'],
    source_url: 'https://www.strikeking.com/crankbaits/red-eye-shad',
    chunk_text: `Strike King Red Eye Shad Lipless Crankbait (brand: Strike King, type: lipless crankbait): Tungsten-weighted lipless crankbait with an intense rattle and a flat-sided profile. One of the top-selling lipless crankbaits for bass. Key technique: rip it through grass — let it sink into the grass, then rip it free with a sharp upward rod snap, triggering reaction strikes as it flutters back down. Also deadly burned fast over grass flats, on channel edges, and over points in fall when bass are chasing shad. In winter, yo-yo it along the bottom near channel ledges. Available in 1/2oz, 3/4oz, and 1oz. Colors: chrome blue, sexy shad, chartreuse sexy shad, gold black, red crawfish.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King KVD 1.5 Squarebill',
    aliases: ['KVD 1.5', 'Strike King 1.5', 'squarebill 1.5', 'KVD squarebill'],
    bait_type: 'crankbait',
    sub_type: 'squarebill',
    sizes: ['3/8oz', '1/4oz'],
    colors: ['chartreuse sexy shad', 'green gizzard shad', 'sexy shad', 'hot craw', 'ghost minnow', 'bluegill', 'citrus shad'],
    depth_ft_min: 0,
    depth_ft_max: 3,
    techniques: ['squarebill cranking', 'cover cranking', 'reaction fishing'],
    structure: ['laydown', 'dock', 'rip-rap', 'rock', 'wood', 'shallow flat'],
    seasons: ['spring', 'fall'],
    source_url: 'https://www.strikeking.com/crankbaits/kvd-square-bill/kvd-1-5-square-bill-crankbait',
    chunk_text: `Strike King KVD 1.5 Squarebill Crankbait (brand: Strike King, type: crankbait, sub-type: squarebill): Balsa-style floating shallow crankbait that runs 0–3 feet deep. The square bill causes erratic deflections off hard cover — ideal for burning through laydowns, dock pilings, rip-rap, rock, and wood. One of the most popular shallow crankbaits in tournament bass fishing. Run it on 15-17lb fluorocarbon with a medium-heavy moderate rod. Color key: chartreuse sexy shad in stained/muddy water; sexy shad or ghost minnow in clear water. Available in 3/8oz. Best in pre-spawn and fall when bass are shallow.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Magnum Squarebill 4.0',
    aliases: ['SK Magnum Squarebill', 'Strike King 4.0 Squarebill', 'Strike King Mag Squarebill'],
    bait_type: 'crankbait',
    sub_type: 'squarebill',
    sizes: ['1oz, 4 inch'],
    colors: ['chartreuse sexy shad', 'green gizzard shad', 'bluegill', 'black blue'],
    depth_ft_min: 0,
    depth_ft_max: 5,
    techniques: ['squarebill cranking', 'big-bait cranking'],
    structure: ['laydown', 'dock', 'rip-rap', 'rock', 'wood cover'],
    seasons: ['spring', 'fall'],
    source_url: 'https://www.strikeking.com',
    chunk_text: `Strike King Magnum Squarebill 4.0 (brand: Strike King, type: crankbait, sub-type: squarebill): Oversized 1oz squarebill crankbait — larger profile than the KVD 1.5. Used to target big bass in heavy shallow cover. Same cover-deflection technique as the standard squarebill but with a larger profile that draws bigger bites. Runs 0–5 feet. Ideal on 17-20lb fluorocarbon on a heavy crankbait rod.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Rage Bug',
    aliases: ['Rage Bug', 'SK Rage Bug'],
    bait_type: 'soft_plastic',
    sub_type: 'creature_bait',
    sizes: ['3.5 inch'],
    colors: ['black blue', 'green pumpkin', 'junebug', 'watermelon red', 'green pumpkin blue', 'black red flake'],
    techniques: ['flipping', 'pitching', 'punching mats', 'jig trailer', 'Texas rig'],
    structure: ['grass mat', 'dock', 'laydown', 'heavy cover', 'brush pile'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.strikeking.com/soft-baits/rage-bug',
    chunk_text: `Strike King Rage Bug (brand: Strike King, type: soft plastic, sub-type: creature bait): A compact flipping and punching bait with active "rage tail" appendages that generate vibration and a kicking action on the fall. One of the most popular flipping baits in tournament bass fishing. Rig Texas-style on a 3/0–5/0 heavy flipping hook with a 3/4oz–1oz bullet weight for punching mats. Excellent as a jig trailer. Best colors: black blue, green pumpkin, junebug, watermelon red. Shine in heavy grass mats, dock skipping, and wood cover. Fall rate is moderate — claws flutter on the drop.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Rage Craw',
    aliases: ['Rage Craw', 'SK Rage Craw'],
    bait_type: 'soft_plastic',
    sub_type: 'craw',
    sizes: ['3.5 inch', '4 inch'],
    colors: ['black blue', 'green pumpkin', 'junebug', 'watermelon red', 'magic craw'],
    techniques: ['flipping', 'pitching', 'jig trailer', 'Texas rig', 'Carolina rig'],
    structure: ['dock', 'laydown', 'rock', 'brush pile', 'point'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.strikeking.com/soft-baits/rage-craw',
    chunk_text: `Strike King Rage Craw (brand: Strike King, type: soft plastic, sub-type: craw/creature): Realistic craw profile with large "rage claw" paddle claws that create maximum water displacement and flash on the fall and retrieve. Versatile — use as a jig trailer (pairs perfectly with Strike King Tour Grade Jig), flip Texas-rigged into docks and laydowns, or Carolina-rig it on points. 3.5 and 4 inch sizes. Colors: black blue, green pumpkin, junebug, watermelon red, magic craw.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Rage Anaconda',
    aliases: ['Rage Anaconda', 'SK Rage Anaconda'],
    bait_type: 'soft_plastic',
    sub_type: 'ribbon_tail_worm',
    sizes: ['8 inch', '10 inch'],
    colors: ['black blue', 'green pumpkin', 'junebug', 'red shad', 'watermelon'],
    techniques: ['Texas rig', 'Carolina rig', 'shaky head', 'flipping'],
    structure: ['grass edge', 'channel', 'point', 'dock', 'laydown'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.strikeking.com/soft-baits/rage-anaconda',
    chunk_text: `Strike King Rage Anaconda (brand: Strike King, type: soft plastic, sub-type: ribbon tail worm): A thick-bodied, large-profile worm with a wide paddle ribbon tail. The tail generates heavy thump and undulation on the retrieve. Rig Texas-style with a 4/0–5/0 EWG hook for grass and cover fishing. Works on Carolina rig over channel edges and points. Available in 8 and 10 inch sizes. Colors: black blue, green pumpkin, junebug, red shad.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Tour Grade Swim Jig',
    aliases: ['Strike King Swim Jig', 'SK Tour Grade Swim Jig', 'Strike King swim jig'],
    bait_type: 'jig',
    sub_type: 'swim_jig',
    sizes: ['3/8oz', '1/2oz'],
    colors: ['white', 'chartreuse white', 'green pumpkin', 'bluegill', 'black blue'],
    techniques: ['swimming jig', 'swim jig', 'mid-depth swimming'],
    structure: ['grass', 'grass edge', 'laydown', 'dock', 'shallow flat'],
    seasons: ['spring', 'fall', 'summer'],
    source_url: 'https://www.strikeking.com/jigs/tour-grade-swim-jig',
    chunk_text: `Strike King Tour Grade Swim Jig (brand: Strike King, type: jig, sub-type: swim jig): Arrowhead-style weedguard swim jig designed to be swum through and around grass and wood cover. Pairs well with a swimbait or paddle-tail trailer. Retrieved at a steady mid-speed pace just below the surface or through the top of grass. Highly effective in grass lakes (Rayburn, Toledo Bend) and flooded banks in spring. Available in 3/8oz and 1/2oz. Colors: white, chartreuse white, green pumpkin, bluegill. Swim jig fishing: keep rod up, reel at moderate pace, let the trailer's tail kick.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Tour Grade Football Finesse Jig',
    aliases: ['SK Football Finesse Jig', 'Tour Grade Finesse Football Jig'],
    bait_type: 'jig',
    sub_type: 'football_jig',
    sizes: ['3/8oz', '1/2oz', '3/4oz'],
    colors: ['green pumpkin', 'black blue', 'brown orange', 'watermelon'],
    depth_ft_min: 8,
    depth_ft_max: 25,
    techniques: ['dragging', 'football jig fishing', 'deep structure jigging'],
    structure: ['ledge', 'rock', 'gravel', 'hard bottom', 'offshore point', 'hump'],
    seasons: ['summer', 'fall', 'spring'],
    source_url: 'https://www.strikeking.com/jigs/tour-grade-football-finesse-jig',
    chunk_text: `Strike King Tour Grade Football Finesse Jig (brand: Strike King, type: jig, sub-type: football jig): Football-head jig designed for dragging along hard-bottom structure — ledges, rock, gravel, and offshore humps. The football head rolls naturally over rocks without getting hung and positions the hook up. Drag slowly along the bottom with a medium-heavy rod and fluorocarbon. Pair with a Rage Craw or beaver-style trailer. Effective at 8–25 feet on deep structure. Popular on lakes with rock and hard-bottom ledges like Grand Lake, Tenkiller, and Texoma.`,
  },

  {
    brand: 'Strike King',
    name: 'Strike King Bottom Dweller Spinnerbait',
    aliases: ['Bottom Dweller', 'SK Bottom Dweller'],
    bait_type: 'spinnerbait',
    sub_type: 'single_colorado',
    sizes: ['1/2oz', '3/4oz'],
    colors: ['white', 'chartreuse white', 'black blue'],
    techniques: ['slow rolling', 'bottom dragging', 'spinnerbait fishing'],
    structure: ['channel edge', 'ledge', 'deep flat', 'grass edge'],
    seasons: ['winter', 'spring', 'fall'],
    source_url: 'https://www.strikeking.com/spinnerbaits/bottom-dweller',
    chunk_text: `Strike King Bottom Dweller Spinnerbait (brand: Strike King, type: spinnerbait, sub-type: heavy slow-roll): Heavy spinnerbait designed to be slow-rolled along the bottom in cold or deep water. Unlike standard spinnerbaits fished above the grass, the Bottom Dweller is crawled along the bottom. Works well in cold water (40–55°F) when bass are tight to the bottom near channel edges. Best in 1/2oz and 3/4oz sizes. Colors: white, chartreuse white.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BERKLEY
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Berkley',
    name: 'Berkley PowerBait Pit Boss',
    aliases: ['Pit Boss', 'Berkley Pit Boss', 'PowerBait Pit Boss'],
    bait_type: 'soft_plastic',
    sub_type: 'creature_bait',
    sizes: ['3.8 inch', '4.3 inch'],
    colors: ['green pumpkin', 'black blue', 'watermelon red', 'junebug', 'plum'],
    techniques: ['flipping', 'pitching', 'jig trailer', 'Texas rig', 'punching'],
    structure: ['grass mat', 'dock', 'laydown', 'brush pile', 'heavy cover'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.berkley-fishing.com/products/powerbait-pit-boss',
    chunk_text: `Berkley PowerBait Pit Boss (brand: Berkley, type: soft plastic, sub-type: creature/flipping bait): Compact creature-style flipping bait infused with Berkley PowerBait scent formula. The rounded body with active claw appendages generates kick and vibration on the fall. Excellent punching and flipping bait for dense grass mats and heavy cover. The PowerBait scent holds bass longer before they drop it. Rig Texas-style on a 3/0–5/0 heavy-wire hook with a 3/4oz–1oz punch weight. Colors: green pumpkin, black blue, watermelon red, junebug. Available in 3.8" and 4.3" sizes.`,
  },

  {
    brand: 'Berkley',
    name: 'Berkley PowerBait Power Worm',
    aliases: ['Berkley Power Worm', 'Power Worm', 'PowerBait Power Worm'],
    bait_type: 'soft_plastic',
    sub_type: 'worm',
    sizes: ['7 inch', '10 inch', '4 inch'],
    colors: ['black', 'red shad', 'green pumpkin', 'purple', 'junebug', 'black blue'],
    techniques: ['Texas rig', 'Carolina rig', 'wacky rig', 'shaky head'],
    structure: ['point', 'flat', 'laydown', 'dock', 'grass edge'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.berkley-fishing.com/products/powerbait-power-worm',
    chunk_text: `Berkley PowerBait Power Worm (brand: Berkley, type: soft plastic, sub-type: straight-tail worm): Classic PowerBait-infused straight-tail worm. One of the original scent-enhanced soft plastics for bass. The PowerBait scent formula causes bass to hold on longer. Most commonly rigged Texas-style or Carolina-style. Available in 7-inch (most popular), 10-inch (big worm fishing), and 4-inch finesse size. Colors: black, red shad, green pumpkin, purple, junebug. The scent is the key differentiator — particularly useful in high-pressure situations.`,
  },

  {
    brand: 'Berkley',
    name: 'Berkley PowerBait Hit Worm',
    aliases: ['Hit Worm', 'Berkley Hit Worm', 'PowerBait Hit Worm'],
    bait_type: 'soft_plastic',
    sub_type: 'finesse_worm',
    sizes: ['5.5 inch', '6 inch'],
    colors: ['green pumpkin', 'watermelon red', 'junebug', 'black blue', 'plum'],
    techniques: ['drop shot', 'shaky head', 'Ned rig', 'wacky rig'],
    structure: ['point', 'ledge', 'offshore', 'channel edge'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.berkley-fishing.com',
    chunk_text: `Berkley PowerBait Hit Worm (brand: Berkley, type: soft plastic, sub-type: finesse worm): Slim finesse worm with PowerBait scent. Designed for finesse presentations — drop shot, shaky head, Ned rig, and wacky rig. The narrow profile is effective when bass are pressured or in post-frontal conditions. Use on spinning tackle with 6-10lb fluorocarbon. Colors: green pumpkin, watermelon red, junebug, black blue.`,
  },

  {
    brand: 'Berkley',
    name: 'Berkley MaxScent Flatnose Minnow',
    aliases: ['MaxScent Flatnose', 'Flatnose Minnow', 'Berkley Flatnose Minnow'],
    bait_type: 'soft_plastic',
    sub_type: 'swimbait_paddle_tail',
    sizes: ['3.5 inch', '5 inch'],
    colors: ['pearl', 'gizzard shad', 'pumpkinseed', 'bluegill', 'green pumpkin'],
    techniques: ['drop shot', 'swimbait', 'swim jig trailer', 'shakey head'],
    structure: ['open water', 'point', 'grass edge', 'offshore'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.berkley-fishing.com/products/maxscent-flatnose-minnow',
    chunk_text: `Berkley MaxScent Flatnose Minnow (brand: Berkley, type: soft plastic, sub-type: minnow/swimbait): Flat-nose swimbait profile infused with Berkley's MaxScent formula, which releases scent through micro-pores when squeezed by a fish. Key differentiator: bass hold onto it significantly longer than unscented baits. Primary technique: swim on a lightweight swimbait jighead (1/8–1/4oz) for suspended or finesse fishing. Also works on drop shot or as a swim jig trailer. Colors: pearl, gizzard shad, pumpkinseed. Available in 3.5" and 5". Popular for spotted bass and pressured largemouth.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ZOOM BAIT CO.
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Zoom',
    name: 'Zoom Trick Worm',
    aliases: ['Trick Worm', 'Zoom Trickworm', 'Zoom Super Fluke Jr'],
    bait_type: 'soft_plastic',
    sub_type: 'straight_worm',
    sizes: ['6.5 inch'],
    colors: ['watermelon red seed', 'green pumpkin', 'white pearl', 'plum', 'black red flake', 'junebug'],
    techniques: ['wacky rig', 'Texas rig', 'weightless stickbait', 'shaky head', 'drop shot'],
    structure: ['dock', 'point', 'laydown', 'grass edge', 'open water'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.zoombait.com/products/trick-worm',
    chunk_text: `Zoom Trick Worm (brand: Zoom, type: soft plastic, sub-type: straight finesse worm): Slender, straight-tail worm designed for multiple finesse presentations. Most effective wacky-rigged — hook through the middle and let it fall with a natural seductive wiggle. Also works weightless Texas-style, on a shaky head, or drop shot. The 6.5-inch size is the most popular. On spinning tackle with 10lb braid to 6lb fluorocarbon leader. Key insight: wacky rigging the Trick Worm is devastatingly effective in post-spawn when bass are shallow and pressured. Colors: watermelon red seed, green pumpkin, white pearl, junebug.`,
  },

  {
    brand: 'Zoom',
    name: 'Zoom Ole Monster Worm',
    aliases: ['Ole Monster', 'Zoom Ole Monster', 'Zoom Big Worm'],
    bait_type: 'soft_plastic',
    sub_type: 'worm',
    sizes: ['10.5 inch'],
    colors: ['black', 'plum', 'green pumpkin', 'junebug', 'watermelon red', 'tequila sunrise'],
    techniques: ['Carolina rig', 'Texas rig', 'big worm fishing'],
    structure: ['channel', 'point', 'ledge', 'flat', 'brush pile'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.zoombait.com/products/ole-monster',
    chunk_text: `Zoom Ole Monster Worm (brand: Zoom, type: soft plastic, sub-type: large worm): 10.5-inch ribbon-tail worm with a thick body and active tail action. A classic big-worm bait for Carolina rigging and Texas rigging. The large profile attracts big bass specifically — used by pro anglers targeting kicker fish. Most effective Carolina-rigged over channel edges, points, and flats with a 3/4oz weight. Also Texas-rigged in 1oz for punching. Colors: black, plum, green pumpkin, junebug. Key insight: when bass are on ledges in summer and not responding to crankbaits or jigs, dragging a big worm on a Carolina rig often catches the biggest fish in the school.`,
  },

  {
    brand: 'Zoom',
    name: 'Zoom Finesse Worm',
    aliases: ['Zoom finesse worm', 'Zoom 4-inch worm', 'Zoom tiny worm'],
    bait_type: 'soft_plastic',
    sub_type: 'finesse_worm',
    sizes: ['4.5 inch', '3.5 inch'],
    colors: ['green pumpkin', 'watermelon red', 'junebug', 'black', 'plum', 'bubble gum'],
    techniques: ['drop shot', 'shaky head', 'Ned rig', 'wacky rig'],
    structure: ['point', 'ledge', 'open water', 'dock', 'grass edge'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.zoombait.com/products/finesse-worm',
    chunk_text: `Zoom Finesse Worm (brand: Zoom, type: soft plastic, sub-type: finesse worm): Slender 4.5-inch worm ideal for finesse fishing on spinning gear. Classic drop-shot worm — nose-hook it or Texas-rig it above a 3/16–1/4oz weight. Also works on a shaky head or Ned rig. Use 6-10lb fluorocarbon on a 6'10"–7' medium-light spinning rod. Effective when bass are pressured, post-frontal, or on highly-fished tournament lakes. Colors: green pumpkin, watermelon red, junebug, black.`,
  },

  {
    brand: 'Zoom',
    name: 'Zoom Lizard',
    aliases: ['lizard', 'plastic lizard', 'Zoom plastic lizard', '6-inch lizard'],
    bait_type: 'soft_plastic',
    sub_type: 'creature_bait',
    sizes: ['6 inch'],
    colors: ['green pumpkin', 'watermelon red', 'black', 'junebug', 'black red flake'],
    techniques: ['Texas rig', 'Carolina rig', 'flipping', 'pitching'],
    structure: ['flat', 'point', 'dock', 'grass edge', 'laydown'],
    seasons: ['spring', 'pre-spawn'],
    source_url: 'https://www.zoombait.com/products/lizard',
    chunk_text: `Zoom Lizard (brand: Zoom, type: soft plastic, sub-type: creature/lizard): Classic pre-spawn and spawn bait. Lizards mimic natural forage (salamanders/lizards) that bass encounter near spawning beds. Most effective in spring pre-spawn and spawn phases when bass are territorial. Texas-rig or Carolina-rig on flats, points, and near spawning banks. Carolina rig with a 3/4oz weight, 18-inch leader, and 4/0 hook over sandy or gravel bottoms. Also effective flipped into laydowns and docks in spring. Colors: green pumpkin, watermelon red, black, junebug.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GARY YAMAMOTO CUSTOM BAITS
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Gary Yamamoto',
    name: 'Gary Yamamoto Senko',
    aliases: ['Senko', 'Yamamoto Senko', 'Zoom Senko', '4-inch Senko', '5-inch Senko', 'Yamasenko', 'stick bait'],
    bait_type: 'soft_plastic',
    sub_type: 'stickbait',
    sizes: ['3 inch', '4 inch', '5 inch'],
    colors: ['green pumpkin / black', '297 green pumpkin', 'watermelon', '208 watermelon red', 'black blue', 'junebug', 'natural', '194 smoke purple'],
    techniques: ['wacky rig', 'weightless Texas rig', 'drop shot', 'shaky head', 'Ned rig'],
    structure: ['dock', 'point', 'laydown', 'open water', 'grass edge', 'deep water'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://yamamoto.fishing/products/senko',
    chunk_text: `Gary Yamamoto Senko (brand: Gary Yamamoto, type: soft plastic, sub-type: stickbait): The original high-salt-content stickbait — widely considered one of the most effective bass baits ever made. The Senko's dense salt formula gives it a slow, seductive fall when wacky-rigged (fall rate approximately 1 foot per second). Wacky rig hook through the middle — no weight — and let it flutter to the bottom. Also deadly weightless Texas-rigged parallel to docks and laydowns (skip it back under structures). Use on spinning gear with 10lb braid to 6lb fluorocarbon leader, or 12lb fluorocarbon on baitcaster for heavier cover. 4-inch is the most popular size. 5-inch for big-bass situations. Key colors: 297 green pumpkin/black, 208 watermelon red, natural (clear with flake). Note: "Senko" is sometimes used generically for any stickbait, but the Yamamoto original is distinctly denser and falls differently.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROBOWORM
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Roboworm',
    name: 'Roboworm Straight Tail Worm',
    aliases: ['Roboworm', 'Robo worm', 'Roboworm finesse worm', 'drop shot worm'],
    bait_type: 'soft_plastic',
    sub_type: 'finesse_worm',
    sizes: ['4.5 inch', '6 inch'],
    colors: ['oxblood', 'june bug', 'morning dawn', 'aarons magic', 'hologram shad', 'fat daddy'],
    techniques: ['drop shot', 'shaky head', 'wacky rig', 'Ned rig'],
    structure: ['point', 'ledge', 'open water', 'channel edge', 'dock'],
    seasons: ['spring', 'summer', 'fall', 'winter'],
    source_url: 'https://www.roboworm.com/products/straight-tail-worm',
    chunk_text: `Roboworm Straight Tail Worm (brand: Roboworm, type: soft plastic, sub-type: finesse worm): Premium hand-poured finesse worm famous for its consistent fall rate and premium scent formula. The go-to drop-shot worm in tournament bass fishing — particularly on highly-pressured Western reservoirs, but equally effective on TX/OK lakes when fish are finicky. Nose-hook it on a drop-shot rig with 1/4oz drop-shot weight, 10-12 inch leader, on 6-8lb fluorocarbon spinning tackle. The straight tail quivers with any rod movement. Top colors: oxblood (brown/red), june bug, morning dawn (pink/white), aarons magic (purple flake). 4.5 inch is the most common tournament size.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MEGABASS
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Megabass',
    name: 'Megabass Vision 110',
    aliases: ['Vision 110', 'Megabass jerkbait', 'Vision110'],
    bait_type: 'hardlure',
    sub_type: 'jerkbait',
    sizes: ['4.25 inch, 1/2oz'],
    colors: ['ito tennessee shad', 'ito clear', 'pro blue', 'hite chart', 'bass riser'],
    depth_ft_min: 2,
    depth_ft_max: 6,
    techniques: ['jerkbait', 'suspending jerkbait', 'twitch-pause'],
    structure: ['open water', 'point', 'flat', 'suspended fish', 'channel edge'],
    seasons: ['winter', 'spring', 'fall'],
    source_url: 'https://www.megabassamerica.com/products/vision-110',
    chunk_text: `Megabass Vision 110 Jerkbait (brand: Megabass, type: hard lure, sub-type: suspending jerkbait): Japanese precision jerkbait widely regarded as the most effective suspending jerkbait for cold-water bass. Runs 2–6 feet deep with a side-to-side dart action on jerk-jerk-pause sequences. Key technique: on cold water (45–58°F), pause 3–10 seconds between jerks — suspended bass will inhale it on a dead-stop pause. Neutral buoyancy allows it to suspend perfectly. Use on 10-12lb fluorocarbon on a 6'10" medium-action jerkbait rod. Colors: ito tennessee shad, pro blue, hite chart (chartreuse). Particularly effective on clear lakes in late winter and pre-spawn.`,
  },

  {
    brand: 'Megabass',
    name: 'Megabass Magdraft',
    aliases: ['Magdraft', 'Megabass swimbait', 'Megabass Mag Draft'],
    bait_type: 'hardlure',
    sub_type: 'glide_bait',
    sizes: ['6 inch / 2.5oz', '8 inch / 4oz'],
    colors: ['pro blue', 'bass riser', 'ito tennessee shad', 'ghost'],
    depth_ft_min: 1,
    depth_ft_max: 8,
    techniques: ['glide bait', 'big swimbait', 'slow roll'],
    structure: ['open water', 'point', 'grass line', 'suspended fish'],
    seasons: ['spring', 'fall', 'winter'],
    source_url: 'https://www.megabassamerica.com/products/magdraft',
    chunk_text: `Megabass Magdraft (brand: Megabass, type: hard lure, sub-type: glide bait/swimbait): Articulated glide-bait style big swimbait with a jointed soft body on an internal hard frame. Produces a wide, realistic gliding side-to-side action on a slow, steady retrieve. Primarily targets big bass (5lb+) — a big-bait finesse approach. Works best on large impoundments with clear water. Retrieve slowly with occasional pauses. 6-inch (2.5oz) is the most common tournament size for TX/OK largemouth. Use heavy baitcaster with 25-30lb fluorocarbon or 65lb braid.`,
  },

  {
    brand: 'Megabass',
    name: 'Megabass Big M 4.0',
    aliases: ['Big M', 'Megabass Big M', 'Big M 4.0 crankbait'],
    bait_type: 'crankbait',
    sub_type: 'deep_diving_crankbait',
    sizes: ['2.75oz, 4.5 inch'],
    colors: ['pro blue', 'ito tennessee shad', 'ghost'],
    depth_ft_min: 10,
    depth_ft_max: 20,
    techniques: ['deep cranking', 'ledge cranking'],
    structure: ['ledge', 'channel', 'hump'],
    seasons: ['summer', 'fall'],
    source_url: 'https://www.megabassamerica.com/products/big-m-4-0',
    chunk_text: `Megabass Big M 4.0 Deep Diving Crankbait (brand: Megabass, type: crankbait, sub-type: deep diving): Tournament-grade deep diver reaching 10–20 feet. Slightly more refined presentation than American deep divers — used on clear-water ledge lakes where finesse matters. Tight, subtle wobble compared to the more aggressive Strike King XD series. Use on 10-12lb fluorocarbon. Colors: pro blue, ito tennessee shad, ghost.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Z-MAN
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Z-Man',
    name: 'Z-Man ChatterBait JackHammer',
    aliases: ['JackHammer', 'ChatterBait JackHammer', 'Z-Man JackHammer', 'vibrating jig'],
    bait_type: 'bladed_jig',
    sub_type: 'chatterbait',
    sizes: ['3/8oz', '1/2oz', '3/4oz'],
    colors: ['white', 'chartreuse white', 'green pumpkin', 'bluegill', 'black blue'],
    depth_ft_min: 0,
    depth_ft_max: 10,
    techniques: ['bladed jig', 'chatterbait fishing', 'power fishing'],
    structure: ['grass', 'grass edge', 'laydown', 'dock', 'open flat'],
    seasons: ['spring', 'fall', 'summer'],
    source_url: 'https://www.zmanfishing.com/products/chatterbait-jackhammer',
    chunk_text: `Z-Man ChatterBait JackHammer (brand: Z-Man, type: bladed jig, sub-type: ChatterBait/vibrating jig): The original tournament-proven bladed jig — a football-head jig with a hex blade that creates a thump-thump vibration on the retrieve. Winner of multiple Major League Fishing events. The blade deflects off cover and triggers reaction strikes. Primary technique: steady retrieve through and around grass at medium-fast speed. Slow down near laydowns or dock pilings. Pair with a Z-Man Razor ShadZ or Menace Grub trailer. Use 12-15lb fluorocarbon on a 7'3" medium-heavy fast-action rod. Available in 3/8oz, 1/2oz, 3/4oz. Colors: white, chartreuse white, green pumpkin, bluegill. Effective spring, summer, and fall in grass fisheries.`,
  },

  {
    brand: 'Z-Man',
    name: 'Z-Man TRD',
    aliases: ['Z-Man TRD TicklerZ', 'TRD worm', 'Z-Man Ned bait', 'TRD'],
    bait_type: 'soft_plastic',
    sub_type: 'ned_rig',
    sizes: ['2.75 inch'],
    colors: ['green pumpkin', 'june bug', 'natural', 'houdini', 'motor oil'],
    techniques: ['Ned rig', 'finesse', 'bottom hopping'],
    structure: ['rock', 'gravel', 'hard bottom', 'ledge', 'point', 'channel edge'],
    seasons: ['spring', 'summer', 'fall', 'winter'],
    source_url: 'https://www.zmanfishing.com/products/trd',
    chunk_text: `Z-Man TRD (The Real Deal) (brand: Z-Man, type: soft plastic, sub-type: Ned rig bait): Short, finesse stick-style bait made from Z-Man's proprietary ElaZtech material — nearly indestructible and naturally buoyant. The floating tail stands straight up off the bottom on a mushroom-head jig (1/10–3/16oz). Primary technique: Ned rig — hook through the nose on a light stand-up jig head, cast to hard bottom structure, and drag/hop slowly along the bottom. The buoyant tail waves enticingly on any pause. Works on rock, gravel, hard clay bottom. Use on spinning gear with 8-10lb braid to 6lb fluorocarbon leader. Highly effective in clear water and winter. Colors: green pumpkin, june bug, houdini.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RIVER2SEA
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'River2Sea',
    name: 'River2Sea Whopper Plopper',
    aliases: ['Whopper Plopper', 'WP 75', 'WP 90', 'WP 110', 'WP 130', 'Whopper Plopper 110'],
    bait_type: 'topwater',
    sub_type: 'prop_bait',
    sizes: ['75mm/3/8oz', '90mm/1/2oz', '110mm/1oz', '130mm/1.5oz'],
    colors: ['bone', 'American shad', 'rainbow trout', 'frog', 'bluegill', 'hollow belly', 'Pocono'],
    depth_ft_min: 0,
    depth_ft_max: 0,
    techniques: ['topwater', 'prop bait', 'walking topwater'],
    structure: ['open water', 'grass edge', 'dock', 'point', 'flat'],
    seasons: ['summer', 'fall', 'spring'],
    source_url: 'https://www.river2sea-usa.com/whopper-plopper',
    chunk_text: `River2Sea Whopper Plopper (brand: River2Sea, type: topwater, sub-type: prop bait): Surface walking bait with a spinning rear prop that creates a churning, plopping sound on a straight steady retrieve. Unlike walking baits that require rod action, the Whopper Plopper is simply reeled at a steady pace — the rear prop does all the work. Retrieve it straight at moderate speed, or vary the pace. Best in low-light conditions: early morning, evening, or overcast days. Deadly over grass mats, along grass lines, and near schools of surface-busting bass. The 110 (1oz) is the most common tournament size. Use 50-65lb braided line on a 7'3" heavy fast rod. Colors: bone, American shad, rainbow trout, frog. Fish it on a straight 65lb braid — no leader.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEDDON
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Heddon',
    name: 'Heddon Zara Spook',
    aliases: ['Zara Spook', 'Spook', 'walking bait', 'Heddon Spook'],
    bait_type: 'topwater',
    sub_type: 'walk_the_dog',
    sizes: ['3/4oz, 4.5 inch'],
    colors: ['bone', 'chrome', 'shad', 'frog', 'red head white'],
    depth_ft_min: 0,
    depth_ft_max: 0,
    techniques: ['walk the dog', 'topwater popping', 'surface fishing'],
    structure: ['open water', 'grass edge', 'dock', 'point', 'flat'],
    seasons: ['summer', 'spring', 'fall'],
    source_url: 'https://www.heddonfishing.com/products/zara-spook',
    chunk_text: `Heddon Zara Spook (brand: Heddon, type: topwater, sub-type: walk-the-dog): The original walk-the-dog surface bait — an elongated pencil popper that glides side-to-side in a rhythmic zigzag when worked with a two-beat rod-tip twitch. Technique: keep the rod tip low to the water, twitch rhythmically with your wrist in a "jerk-jerk" cadence while reeling up slack. Bass smash it during the side-to-side "walk." Devastatingly effective over grass flats, near cover, and when bass are busting on the surface. Use 20-25lb fluorocarbon or 40-50lb braid. 3/4oz is standard. Colors: bone, chrome, shad.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6TH SENSE
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: '6th Sense',
    name: '6th Sense Provoke 97DD',
    aliases: ['Provoke 97DD', '6th Sense Provoke', 'Provoke jerkbait'],
    bait_type: 'hardlure',
    sub_type: 'jerkbait',
    sizes: ['97mm / 1oz'],
    colors: ['white flash', 'tennessee shad', 'pro blue', 'ghost', 'chartreuse shad'],
    depth_ft_min: 3,
    depth_ft_max: 8,
    techniques: ['suspending jerkbait', 'jerkbait', 'twitch-pause'],
    structure: ['open water', 'point', 'flat', 'channel edge'],
    seasons: ['winter', 'spring', 'fall'],
    source_url: 'https://6thsensefishing.com/products/provoke-97dd',
    chunk_text: `6th Sense Provoke 97DD Jerkbait (brand: 6th Sense, type: hard lure, sub-type: deep-diving suspending jerkbait): Suspending jerkbait with a deep-diving bill that reaches 3–8 feet. Known for exceptional balance and a tight, subtle side-to-side dart. Tournament-proven alternative to the Vision 110. Technique: jerk-jerk-pause with extended pauses in cold water. Works well in clear to stained water in late winter/spring. Use 10-12lb fluorocarbon on a medium-action jerkbait rod. Colors: white flash, tennessee shad, pro blue.`,
  },

  {
    brand: '6th Sense',
    name: '6th Sense Divine Hybrid Jig',
    aliases: ['Divine Hybrid Jig', '6th Sense Divine Jig', 'Divine jig'],
    bait_type: 'jig',
    sub_type: 'hybrid_jig',
    sizes: ['3/8oz', '1/2oz', '3/4oz'],
    colors: ['black blue', 'green pumpkin', 'brown orange', 'white'],
    techniques: ['flipping', 'pitching', 'dragging', 'swimming'],
    structure: ['dock', 'grass', 'rock', 'laydown', 'ledge'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://6thsensefishing.com/products/divine-hybrid-jig',
    chunk_text: `6th Sense Divine Hybrid Jig (brand: 6th Sense, type: jig, sub-type: hybrid casting/flipping jig): Versatile jig design combining features of a flipping jig and a casting jig — works both flipped into heavy cover and cast and dragged on open structure. Strong fiber weedguard, realistic fiber skirt. Use it flipped around docks and laydowns, or cast and dragged on ledges. Available in 3/8oz, 1/2oz, 3/4oz. Colors: black blue, green pumpkin, brown orange.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MISSILE BAITS
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Missile Baits',
    name: 'Missile Baits D Bomb',
    aliases: ['D Bomb', 'Missile D Bomb', 'D-Bomb'],
    bait_type: 'soft_plastic',
    sub_type: 'creature_bait',
    sizes: ['4 inch'],
    colors: ['black blue', 'green pumpkin', 'junebug', 'watermelon red'],
    techniques: ['flipping', 'pitching', 'punching mats', 'jig trailer'],
    structure: ['grass mat', 'dock', 'laydown', 'brush pile', 'heavy cover'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://missilebaits.com/products/d-bomb',
    chunk_text: `Missile Baits D Bomb (brand: Missile Baits, type: soft plastic, sub-type: creature/flipping bait): Aggressive flipping and punching bait with large claw appendages and a streamlined body that slices through thick vegetation mats. Designed by John Crews specifically for punching heavy cover. Compact profile gets through the thickest mats while the claws explode open underneath. Rig on a 4/0–5/0 straight-shank hook with 1oz–1.25oz tungsten punch weight for dense grass. Colors: black blue, green pumpkin, junebug.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // V&M
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'V&M',
    name: 'V&M J-Bug',
    aliases: ['J-Bug', 'V&M J Bug', 'VM J Bug'],
    bait_type: 'soft_plastic',
    sub_type: 'creature_bait',
    sizes: ['4 inch'],
    colors: ['black blue', 'green pumpkin', 'junebug', 'watermelon red'],
    techniques: ['flipping', 'pitching', 'jig trailer'],
    structure: ['dock', 'laydown', 'brush pile', 'grass edge'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://vandmbaits.com',
    chunk_text: `V&M J-Bug (brand: V&M, type: soft plastic, sub-type: creature bait): Compact flipping creature bait with ribbed body and active appendages. Made by V&M Baits — a southern company known for quality tournament soft plastics. Effective flipped and pitched around docks, laydowns, and brush piles. Also works as a jig trailer. Rig Texas-style on a 3/0–4/0 wide-gap hook with a 1/2–3/4oz bullet sinker. Colors: black blue, green pumpkin, junebug.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPRO
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Spro',
    name: 'Spro Aruku Shad',
    aliases: ['Aruku Shad', 'Spro Aruku', 'lipless Spro'],
    bait_type: 'lipless crankbait',
    sub_type: 'lipless_crankbait',
    sizes: ['1/2oz', '3/4oz'],
    colors: ['chrome shad', 'sexy shad', 'chartreuse', 'natural shad'],
    depth_ft_min: 0,
    depth_ft_max: 12,
    techniques: ['ripping lipless', 'yo-yoing', 'burning lipless'],
    structure: ['grass', 'channel edge', 'flat', 'point'],
    seasons: ['spring', 'fall', 'winter'],
    source_url: 'https://www.spro-usa.com/products/aruku-shad',
    chunk_text: `Spro Aruku Shad Lipless Crankbait (brand: Spro, type: lipless crankbait): Flat-sided lipless crankbait with a high-pitched rattle and tight vibration. Similar application to the Red Eye Shad — rip it through grass, burn it over flats, yo-yo it in winter. Available in 1/2oz and 3/4oz. Particularly effective in late winter and early spring grass transitions when bass are starting to move shallow.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GEECRACK
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Geecrack',
    name: 'Geecrack Cue Bomb',
    aliases: ['Cue Bomb', 'Geecrack CueBomb', 'dice bait', 'cube bait'],
    bait_type: 'soft_plastic',
    sub_type: 'finesse_bait',
    sizes: ['1 inch', '1.5 inch'],
    colors: ['green pumpkin', 'black blue', 'natural shrimp', 'motor oil'],
    techniques: ['Ned rig', 'drop shot', 'finesse jig', 'shaky head'],
    structure: ['rock', 'hard bottom', 'ledge', 'point'],
    seasons: ['spring', 'summer', 'fall', 'winter'],
    source_url: 'https://www.geecrack.com/cue-bomb',
    chunk_text: `Geecrack Cue Bomb (brand: Geecrack, type: soft plastic, sub-type: finesse cube/dice bait): Japanese cube-shaped finesse bait — irregular shape creates an erratic, non-threatening action. Used primarily on a Ned rig (stand-up jig head 1/10–1/8oz) or drop shot. The compact cube shape stands up off the bottom and wiggles with subtle rod quivers. Very effective on highly-pressured bass that have seen every standard presentation. Use on 6-8lb fluorocarbon spinning tackle. Colors: green pumpkin, natural shrimp, motor oil.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // YUM
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'YUM',
    name: 'YUM FF Sonar Minnow',
    aliases: ['YUM Sonar Minnow', 'YUM FF Sonar', 'Sonar Minnow'],
    bait_type: 'soft_plastic',
    sub_type: 'paddle_tail_swimbait',
    sizes: ['3 inch', '3.75 inch'],
    colors: ['pearl', 'ghost minnow', 'silver flash', 'bluegill'],
    techniques: ['swimbait', 'drop shot', 'swim jig trailer'],
    structure: ['open water', 'grass edge', 'dock', 'point'],
    seasons: ['spring', 'summer', 'fall'],
    source_url: 'https://www.yumbaits.com',
    chunk_text: `YUM FF Sonar Minnow (brand: YUM, type: soft plastic, sub-type: paddle-tail swimbait): Paddle-tail swimbait with scent infusion. Used primarily as a swim-jig or jig-head swimbait trailer. Retrieve at slow-to-medium pace to activate the tail kick. Use on 1/4oz round-head jig or as a swim jig trailer. Colors: pearl, ghost minnow, silver flash.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // YO-ZURI
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Yo-Zuri',
    name: 'Yo-Zuri 3DB Pencil',
    aliases: ['3DB Pencil', 'Yo-Zuri Pencil', 'Yozuri Pencil'],
    bait_type: 'topwater',
    sub_type: 'walk_the_dog',
    sizes: ['95mm/9/16oz', '110mm/15/16oz'],
    colors: ['ghost minnow', 'chartreuse shad', 'bone', 'natural shad'],
    depth_ft_min: 0,
    depth_ft_max: 0,
    techniques: ['walk the dog', 'topwater'],
    structure: ['open water', 'point', 'grass edge'],
    seasons: ['summer', 'spring', 'fall'],
    source_url: 'https://yo-zuri.com/products/3db-pencil',
    chunk_text: `Yo-Zuri 3DB Pencil Walk-the-Dog Bait (brand: Yo-Zuri, type: topwater, sub-type: walk-the-dog): Pencil-style surface walking bait similar to the Zara Spook but with internal 3D holographic film that creates intense flash. Walk it with a rhythmic rod-tip twitch cadence — side-to-side glide. Effective over open water, along grass lines, and on points where bass are chasing shad. Use 20-30lb braid or heavy fluorocarbon.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NOMAD DESIGN
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Nomad Design',
    name: 'Nomad Design Badlands Swim Jig Heavy Cover',
    aliases: ['Nomad Badlands Swim Jig', 'Badlands Heavy Cover Swim Jig'],
    bait_type: 'jig',
    sub_type: 'swim_jig',
    sizes: ['3/8oz', '1/2oz'],
    colors: ['white', 'chartreuse white', 'black blue', 'green pumpkin'],
    techniques: ['swim jig', 'heavy cover swimming'],
    structure: ['grass', 'heavy vegetation', 'laydown', 'timber'],
    seasons: ['spring', 'fall', 'summer'],
    source_url: 'https://www.nomaddesigntackle.com',
    chunk_text: `Nomad Design Badlands Swim Jig Heavy Cover (brand: Nomad Design, type: jig, sub-type: heavy cover swim jig): Reinforced swim jig built for punching through dense vegetation and heavy wood cover. Heavier weedguard and stronger hook than standard swim jigs. Fish it through thick hydrilla, milfoil, and around timber. Pair with a paddle-tail trailer and retrieve at medium-fast pace through cover.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GENERIC TECHNIQUE ENTRIES
  // These cover categories where the bait name in reports is a technique description,
  // not a brand/product. Helps the AI understand what these terms mean.
  // ─────────────────────────────────────────────────────────────────────────

  {
    brand: 'Generic',
    name: 'Spinnerbait (generic)',
    aliases: ['spinnerbait', 'spinner bait', 'willow leaf spinnerbait', 'colorado spinnerbait'],
    bait_type: 'spinnerbait',
    sub_type: 'spinnerbait',
    sizes: ['3/8oz', '1/2oz', '3/4oz'],
    techniques: ['slow rolling', 'burning', 'casting around cover'],
    structure: ['grass', 'dock', 'laydown', 'point', 'flat', 'channel edge'],
    seasons: ['spring', 'fall', 'summer'],
    chunk_text: `Spinnerbait (generic technique/bait type): A wire-form lure with one or two spinning blades (willow leaf or Colorado) above a lead jig head and skirted hook. Blades create flash and vibration. Primary technique: slow-roll at medium depth along grass edges, channel edges, and over structure; burn it just below the surface over submerged grass; or bulge it across the surface. Willow leaf blades = more flash, faster retrieve; Colorado blades = more thump/vibration, slower presentation. Effective spring, fall, and in muddy/stained water. Key brands: Strike King, War Eagle, Booyah, Jewel, Accent. Use 14-17lb fluorocarbon on a 7'3" medium-heavy rod.`,
  },

  {
    brand: 'Generic',
    name: 'Football Jig (generic)',
    aliases: ['football jig', 'football head jig', 'deep jig'],
    bait_type: 'jig',
    sub_type: 'football_jig',
    sizes: ['3/4oz', '1oz', '1.5oz'],
    depth_ft_min: 8,
    depth_ft_max: 30,
    techniques: ['dragging', 'deep structure fishing', 'ledge jigging'],
    structure: ['ledge', 'rock', 'gravel', 'hard bottom', 'offshore hump'],
    seasons: ['summer', 'fall'],
    chunk_text: `Football Jig (generic): Heavy jig with a football-shaped head that rolls over rock and hard bottom without snagging. Designed for dragging slowly along deep structure — ledges, rock piles, gravel, and channel edges at 8–30 feet. Pair with a craw or creature trailer. Key technique: cast past the target structure, let it sink to bottom, and drag slowly with a sweeping rod motion (not hopping — dragging). The football head's tumbling action mimics a crawfish. Use on 15-17lb fluorocarbon on a 7'3"–7'6" heavy fast rod and baitcaster. Best in summer when bass are on offshore ledges. Key brands: Strike King, Buckeye, Molix.`,
  },

  {
    brand: 'Generic',
    name: 'Swim Jig (generic)',
    aliases: ['swim jig', 'swimming jig'],
    bait_type: 'jig',
    sub_type: 'swim_jig',
    sizes: ['3/8oz', '1/2oz'],
    techniques: ['swimming jig', 'mid-depth swimming'],
    structure: ['grass', 'grass edge', 'laydown', 'dock', 'flat'],
    seasons: ['spring', 'fall', 'summer'],
    chunk_text: `Swim Jig (generic): Arrowhead-head jig with a fiber weedguard and skirted hook designed to be swum at a steady pace through and around cover. Not dragged or hopped — swum. Pair with a paddle-tail swimbait or kicking trailer. Keep the rod tip up and reel at moderate pace to prevent the bait from sinking into cover. Devastating along grass lines, over submerged grass, and around shallow cover in spring and fall. Most effective in 3/8oz and 1/2oz sizes. Use on 12-15lb fluorocarbon.`,
  },

  {
    brand: 'Generic',
    name: 'Hollow Body Frog (generic)',
    aliases: ['hollow-body frog', 'frog', 'topwater frog', 'popping frog'],
    bait_type: 'topwater',
    sub_type: 'hollow_body_frog',
    sizes: ['1/2oz to 5/8oz'],
    techniques: ['frogging', 'topwater over mats', 'pond hopping'],
    structure: ['grass mat', 'lily pad', 'slop', 'surface vegetation'],
    seasons: ['summer', 'spring', 'fall'],
    chunk_text: `Hollow Body Frog (generic): Weedless topwater frog with a soft hollow body that compresses on the strike. Designed to walk across the surface of dense grass mats, lily pads, and surface slop where other lures would immediately get snagged. Technique: work it with the same side-to-side "walk" cadence as a Zara Spook but across the top of matted vegetation. Let it pause in holes and openings. When bass strikes, resist setting the hook immediately — wait until you feel the weight of the fish. Use on 50-65lb braided line on a 7'3"–7'6" heavy fast rod. Key brands: BOOYAH Pad Crasher, Terminator, River2Sea Bully Wa, Livetarget Frog.`,
  },

  {
    brand: 'Generic',
    name: 'Drop Shot (generic)',
    aliases: ['drop shot', 'dropshot rig', 'drop-shot'],
    bait_type: 'soft_plastic',
    sub_type: 'drop_shot',
    techniques: ['drop shot', 'finesse bottom fishing'],
    structure: ['offshore', 'ledge', 'channel', 'point', 'dock', 'deep flat'],
    seasons: ['summer', 'fall', 'winter', 'spring'],
    chunk_text: `Drop Shot Rig (generic technique): Finesse bottom-contact rig where the weight is tied at the end of the line and the bait hook is tied in-line 8–18 inches above the weight. The bait suspends off the bottom. Technique: cast out, let the weight touch bottom, then shake the rod tip in place — the bait quivers while the weight stays anchored. Bass inhale the suspended bait. Use with small finesse worms (Roboworm, Z-Man TRD, Zoom Finesse Worm), on 6-10lb fluorocarbon on a spinning rod. Effective year-round but especially in summer on offshore structure and in winter.`,
  },

  {
    brand: 'Generic',
    name: 'Shakey Head (generic)',
    aliases: ['shakey head', 'shaky head', 'shaky head jig'],
    bait_type: 'soft_plastic',
    sub_type: 'shaky_head',
    techniques: ['shaky head', 'finesse jigging', 'dragging'],
    structure: ['rock', 'gravel', 'hard bottom', 'point', 'ledge', 'dock'],
    seasons: ['spring', 'summer', 'fall', 'winter'],
    chunk_text: `Shaky Head Rig (generic technique): Stand-up round jig head (1/16–3/16oz) with a small keeper, fished with a finesse worm nose-hooked so the tail stands up off the bottom. Drag it slowly or shake it in place — the worm quivers and the tail waves. Effective on pressured bass and in clear water. Use with Zoom Finesse Worm, Roboworm, or similar on 8-10lb fluorocarbon spinning gear. Works best on rock, gravel, and hard-bottom areas.`,
  },

  {
    brand: 'Generic',
    name: 'Ned Rig (generic)',
    aliases: ['Ned rig', 'Ned bait', 'mushroom jig'],
    bait_type: 'soft_plastic',
    sub_type: 'ned_rig',
    techniques: ['Ned rig', 'ultra finesse'],
    structure: ['rock', 'hard bottom', 'ledge', 'point'],
    seasons: ['spring', 'summer', 'fall', 'winter'],
    chunk_text: `Ned Rig (generic technique): Mushroom-head jig (1/10–3/16oz) with a short finesse bait (Z-Man TRD, Berkley Maxscent, Strike King Ned Ocho) that stands straight up off the bottom thanks to ElaZtech material or similar buoyant foam core. Ultra-finesse technique. Drag or hop slowly along rock, gravel, or hard clay bottom. The standing-up bait has an irresistible action. Use on 8-10lb braid to 6lb fluorocarbon leader on spinning gear. Effective on heavily pressured bass throughout the year.`,
  },

  {
    brand: 'Generic',
    name: 'Texas Rig (generic)',
    aliases: ['Texas rig', 'T-rig', 'texposed'],
    bait_type: 'soft_plastic',
    sub_type: 'texas_rig',
    techniques: ['Texas rig', 'weedless soft plastic'],
    structure: ['grass', 'dock', 'laydown', 'brush pile', 'heavy cover'],
    seasons: ['spring', 'summer', 'fall'],
    chunk_text: `Texas Rig (generic technique): Weedless soft plastic rigging method — bullet sinker pegged or sliding above an EWG or offset hook with the hook point buried in the bait. The most versatile bass fishing rig. Cast into heavy cover: grass, laydowns, docks, brush piles. Heave it in, let it fall, drag along the bottom, or hop it. Use 1/4–3/4oz tungsten or lead bullet weight depending on depth and cover density. Works with virtually any soft plastic: worms, creatures, craws, tubes, stick baits. Heavier sinker = faster fall; lighter = slower, more natural fall.`,
  },

  {
    brand: 'Generic',
    name: 'Carolina Rig (generic)',
    aliases: ['Carolina rig', 'C-rig'],
    bait_type: 'soft_plastic',
    sub_type: 'carolina_rig',
    techniques: ['Carolina rig', 'dragging'],
    structure: ['flat', 'point', 'channel edge', 'long flat', 'offshore'],
    seasons: ['spring', 'summer', 'fall'],
    chunk_text: `Carolina Rig (generic technique): A bottom-dragging rig with a 3/4oz–1oz egg sinker above a swivel, 12–24 inch fluorocarbon leader, and a floating or neutral-buoyancy bait. Dragged slowly over flat terrain, points, and channel edges. The heavy weight stays on the bottom while the bait floats up and glides behind it. Effective for covering large areas. Common baits: lizards, creatures, French fries, finesse worms. Use on 15-17lb fluorocarbon leader.`,
  },

  {
    brand: 'Generic',
    name: 'Buzzbait (generic)',
    aliases: ['buzzbait', 'buzz bait', 'topwater buzzbait'],
    bait_type: 'topwater',
    sub_type: 'buzzbait',
    techniques: ['buzzbait', 'topwater surface', 'burning topwater'],
    structure: ['grass', 'laydown', 'dock', 'flat', 'channel edge'],
    seasons: ['summer', 'spring', 'fall'],
    chunk_text: `Buzzbait (generic): Wire-arm topwater lure with a propeller-style "clacker" blade that churns the surface when retrieved at speed. Must be reeled fast enough to keep the blade on the surface — start reeling the instant it hits the water. Unlike other topwaters, the buzzbait is always moving. Deadly over submerged grass, alongside grass edges, around laydowns, and dock corners. Use 50-65lb braided line, 7'3" heavy-fast rod. Best in low-light conditions. Key brands: Booyah, Strike King Tour Grade Buzz, Nichols Lures. When bass hit but miss it, slow down or follow up with a Senko or frog.`,
  },

  {
    brand: 'Generic',
    name: 'Crankbait Shallow / Squarebill (generic)',
    aliases: ['shallow crankbait', 'squarebill crankbait', 'square bill', 'shallow crank'],
    bait_type: 'crankbait',
    sub_type: 'squarebill',
    depth_ft_min: 0,
    depth_ft_max: 5,
    techniques: ['squarebill cranking', 'cover cranking', 'reaction fishing'],
    structure: ['laydown', 'dock', 'rip-rap', 'rock', 'wood cover', 'shallow flat'],
    seasons: ['spring', 'fall'],
    chunk_text: `Shallow Crankbait / Squarebill (generic): Square-billed crankbaits run 0–5 feet and are designed to deflect erratically off hard cover — the deflection triggers reaction strikes from bass buried in structure. Key brands: Strike King KVD 1.5, Berkley Frittside, River2Sea Biggie, SPRO Rock Crawler. Run them at various speeds alongside laydowns, dock pilings, rip-rap, and rocks. Use 12-17lb fluorocarbon on a medium-moderate crankbait rod. Spring and fall are peak seasons when bass are shallow.`,
  },

  {
    brand: 'Generic',
    name: 'Lipless Crankbait (generic)',
    aliases: ['lipless crankbait', 'lipless crank', 'blade bait', 'rattle bait'],
    bait_type: 'lipless crankbait',
    sub_type: 'lipless_crankbait',
    depth_ft_min: 0,
    depth_ft_max: 15,
    techniques: ['ripping lipless', 'yo-yoing', 'burning lipless'],
    structure: ['grass', 'flat', 'channel edge', 'point'],
    seasons: ['spring', 'fall', 'winter'],
    chunk_text: `Lipless Crankbait (generic): Flat-sided, no-lip crankbait with internal rattles that sinks. Vibrates intensely on a straight retrieve. Key technique: rip it through grass — let it sink into the top of the grass, then rip the rod upward sharply; the bait tears free and falls, triggering the strike. Also burned fast over grass flats, yo-yoed vertically off the bottom in winter, or counted down and retrieved at specific depths. Key brands: Strike King Red Eye Shad, Bill Lewis Rat-L-Trap, Spro Aruku Shad. Use 12-15lb fluorocarbon. Most effective in spring, fall, and winter.`,
  },

  {
    brand: 'Generic',
    name: 'Deep Diving Crankbait (generic)',
    aliases: ['deep diving crankbait', 'deep crank', 'ledge crankbait', 'big crank'],
    bait_type: 'crankbait',
    sub_type: 'deep_diving_crankbait',
    depth_ft_min: 10,
    depth_ft_max: 25,
    techniques: ['deep cranking', 'ledge cranking', 'long-line cranking'],
    structure: ['ledge', 'channel', 'hump', 'road bed'],
    seasons: ['summer', 'fall'],
    chunk_text: `Deep Diving Crankbait (generic): Large-billed crankbait designed to reach 10–25 feet on long casts. Used for targeting bass on offshore ledges, channel swings, road beds, and submerged humps. Technique: make the longest cast possible, engage the reel immediately, and crank with a sweeping rod motion to get the bait diving as fast as possible to max depth. Contact with the bottom or structure triggers strikes. Use 10lb fluorocarbon (thinner line = deeper dive). Key brands: Strike King 10XD/6XD/8XD, Rapala DT series, SPRO Little John, Norman DD22.`,
  },

]

// ── Main seeding function ────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${LURES.length} lure catalog entries...\n`)

  // 1. Batch-embed all chunk_texts in one or two Voyage API calls
  console.log('Step 1: Generating embeddings (batch mode)...')
  const texts = LURES.map(l => l.chunk_text)
  const embeddings = await embedBatch(texts)
  console.log(`Got ${embeddings.filter(Boolean).length}/${LURES.length} embeddings\n`)

  // 2. Upsert all rows into the database
  console.log('Step 2: Upserting into lure_catalog...')
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < LURES.length; i++) {
    const lure = LURES[i]
    const embedding = embeddings[i]

    if (!embedding) {
      console.warn(`  [${i + 1}] ⚠ No embedding for "${lure.name}" — inserting without`)
    }

    const { error } = await supabase.from('lure_catalog').upsert({
      brand:        lure.brand,
      name:         lure.name,
      aliases:      lure.aliases ?? [],
      bait_type:    lure.bait_type,
      sub_type:     lure.sub_type ?? null,
      chunk_text:   lure.chunk_text,
      embedding:    embedding ?? null,
      sizes:        lure.sizes ?? [],
      colors:       lure.colors ?? [],
      depth_ft_min: lure.depth_ft_min ?? null,
      depth_ft_max: lure.depth_ft_max ?? null,
      techniques:   lure.techniques ?? [],
      structure:    lure.structure ?? [],
      seasons:      lure.seasons ?? [],
      source_url:   lure.source_url ?? null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'brand,name' })

    if (error) {
      console.error(`  [${i + 1}] ✗ ${lure.brand} ${lure.name}: ${error.message}`)
      failed++
    } else {
      console.log(`  [${i + 1}] ✓ ${lure.brand} | ${lure.name}`)
      succeeded++
    }
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`)
}

main().catch(console.error)
