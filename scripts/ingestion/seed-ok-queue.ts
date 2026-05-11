/**
 * AnglerIQ — Seed OK Ingest Queue
 * Populates ingest_queue with sources for Oklahoma lakes.
 * Skips any source whose URL already exists in the queue.
 *
 * Sources used:
 *   - B.A.S.S. Elite / Opens results (global source, used for any state)
 *   - MLF (Major League Fishing) results (global source)
 *   - ODWC (Oklahoma Dept of Wildlife Conservation) fishing reports (state-specific)
 *   - Curated rawText blocks for each lake (state-specific)
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-queue.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type QueueItem = {
  lake_name: string
  state: string
  source_type: string
  url?: string
  raw_text?: string
  tournament?: string
  organization?: string
  reported_date?: string
  notes: string
}

const SOURCES: QueueItem[] = [

  // ─── Lake Eufaula ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/tournaments/2023-okc-bass-pro-shops-bassmaster-opens-eufaula/',
    organization: 'B.A.S.S.', reported_date: '2023-04-01',
    notes: 'B.A.S.S. Opens at Lake Eufaula 2023',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://majorleaguefishing.com/bass-pro-tour/2022/lake-eufaula/',
    organization: 'MLF', reported_date: '2022-06-01',
    notes: 'MLF Bass Pro Tour — Lake Eufaula 2022',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/eufaula',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Lake Eufaula fishing guide',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'article',
    raw_text: `Lake Eufaula, Oklahoma Bass Fishing Guide

Lake Eufaula is Oklahoma's largest lake at approximately 102,500 acres on the Canadian River in eastern Oklahoma. Known as the "Bass Capital of Oklahoma." Stained to slightly muddy water typical. Features massive timber fields, extensive flats, creek arms, and channel structure.

KEY PATTERNS:
- Spring (Mar-May): Peak season. Largemouth spawn in 2-6 feet in coves, on flats near timber, and along creek arm banks. Texas-rigged lizards (watermelon/red, june bug), hollow-body frogs (black/blue) over early pad growth, swim jigs, and squarebill crankbaits along shallow timber edges. Spinnerbaits (white/chartreuse double willow) on wind-blown flats.
- Summer: Move deeper to 15-25 feet on main lake points and channel edges. Deep-diving crankbaits (10XD, 6XD in natural shad colors), Carolina rigs with creature baits on main lake humps, football jigs on channel drops. Early morning topwater (Spook, Whopper Plopper) around timber and flats.
- Fall: Excellent shad migration — lipless crankbaits (Red Eye Shad, chrome/blue), swimbaits, and spinnerbaits following shad into the backs of creeks. Topwater walking baits on slick mornings.
- Winter: Finesse near channel swings and deeper timber — drop shot with Roboworm, blade baits on main lake points, shakey heads in 15-25 feet.

KEY STRUCTURES: Submerged timber throughout (defining feature), Canadian River channel, Big Bee Creek arm, Gaines Creek arm, main lake points, submerged roadbeds, pad flats in upper lake.

TOP BAITS: Texas-rigged lizard (watermelon/red, june bug, 4/0 EWG), hollow-body frog (black/blue — Zoom Horny Toad, BOOYAH Pad Crasher), squarebill crankbait (Strike King KVD 1.5 — chartreuse sexy shad), swim jig (white shad 3/8oz), 10XD crankbait (sexy shad), football jig (green pumpkin 3/4oz), drop shot Roboworm (morning dawn), lipless crankbait (Red Eye Shad chrome/blue).

NOTES: Best big-bass lake in Oklahoma. Timber is the defining structure — most fish relate to it year-round. Water clarity varies; stained to muddy typical after rain. Spring and fall peak. Significant bass tournament history. Strong largemouth population; some spotted bass in lower lake.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Eufaula OK knowledge base',
  },

  // ─── Grand Lake o' the Cherokees ─────────────────────────────────────────
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/tournaments/2024-bassmaster-elite-grand-lake/',
    organization: 'B.A.S.S.', reported_date: '2024-05-01',
    notes: 'B.A.S.S. Elite at Grand Lake 2024',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://majorleaguefishing.com/bass-pro-tour/2023/grand-lake/',
    organization: 'MLF', reported_date: '2023-06-01',
    notes: 'MLF Bass Pro Tour — Grand Lake 2023',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/grand',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Grand Lake fishing guide',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'article',
    raw_text: `Grand Lake o' the Cherokees — Oklahoma Bass Fishing Guide

Grand Lake is a 46,500-acre reservoir on the Neosho (Grand) River in northeastern Oklahoma near Grove. One of Oklahoma's most popular and productive bass fisheries. Generally clear to slightly stained water. Features extensive rocky shorelines, boat docks, creek arms, ledges, and hydrilla/milfoil grass.

KEY PATTERNS:
- Spring (Mar-May): Spotted bass and largemouth stack on rocky points, dock pilings, and chunk rock banks in 4-12 feet. Ned rigs (green pumpkin), finesse jigs on rock, jerkbaits (clear to slightly stained), drop shots near dock pilings. Largemouth spawn in coves on flats near docks and grass.
- Summer: Spotted bass key in on offshore ledges and main lake humps in 15-30 feet — football jigs (green pumpkin/brown, 3/4oz), Carolina rigs, deep-diving crankbaits (6XD, Rapala DT16). Largemouth stay shallower in grass and under docks.
- Fall: Topwater explosions on points and flat banks as shad migrate — Spooks, poppers, swimbaits. Spotted bass school on main lake points and humps (visible schools). Lipless cranks (chrome/blue) around grass edges.
- Winter: Blade baits and jigging spoons vertically on main lake humps 20-35 feet. Drop shot on dock pilings for spotted bass.

KEY STRUCTURES: Rocky points and banks (dominant for spotted bass), boat docks (abundant), Honey Creek arm, Spring Creek arm, main lake ledges, hydrilla/milfoil flats, gravel spawning banks.

TOP BAITS: Ned rig Z-Man TRD (green pumpkin, oxblood), football jig (green pumpkin/brown 3/4oz with craw trailer), jerkbait (Megabass Vision 110, Lucky Craft Pointer 78 — clear colors), drop shot Roboworm (margarita mutilator, oxblood), 6XD crankbait (sexy shad), topwater Spook (chrome/black), swimbait on round jighead (white, shad).

NOTES: One of Oklahoma's premier spotted bass fisheries. Spotted bass often outnumber largemouth on main lake structure. Strong tournament history (B.A.S.S. Elite, MLF). Clear water demands lighter line and natural presentations. Dock fishing with Ned rigs year-round very productive. Watch for hydrilla locations — changes seasonally.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Grand Lake OK knowledge base',
  },

  // ─── Lake Tenkiller ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/tournaments/2022-bassmaster-opens-lake-tenkiller/',
    organization: 'B.A.S.S.', reported_date: '2022-07-01',
    notes: 'B.A.S.S. Opens at Lake Tenkiller 2022',
  },
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/tenkiller',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Lake Tenkiller fishing guide',
  },
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'article',
    raw_text: `Lake Tenkiller — Oklahoma Bass Fishing Guide

Lake Tenkiller is a 12,900-acre reservoir on the Illinois River in eastern Oklahoma near Vian. One of the clearest lakes in Oklahoma — visibility 10-20+ feet common. Excellent spotted bass and largemouth fishery. Features steep rocky bluffs, canyon walls, chunk rock banks, points, and some brush.

KEY PATTERNS:
- Spring: Spotted bass and largemouth on rocky banks and chunk rock points in 4-15 feet. Finesse tactics dominate due to clear water — drop shots (Roboworm Aaron's Magic, green pumpkin), Ned rigs on main lake points, jerkbaits (natural colors — ghost, glimmer shad) along bluff ends and chunk rock transitions. Spawn in gravel coves.
- Summer: Bass move deep — bluff walls and rocky points 20-45 feet. Drop shot critical. Alabama rigs produce on main lake channel points. Football jig on rock structure. Spotted bass school on points in 25-35 feet — visible surface schools early morning.
- Fall: Schooling spotted bass on main lake points and channel edges. Topwater (pencil poppers, small walking baits) on schooling fish. Jerkbaits on cooling water. Swimbaits around main lake structure.
- Winter: Very clear — finesse only. Drop shot and Ned rig on main lake bluff ends. Blade baits vertically on deep points.

KEY STRUCTURES: Rocky bluffs and canyon walls (dominant), chunk rock points, Illinois River channel, main lake humps and points, steep bank transitions, cedar tree brush (some coves).

TOP BAITS: Drop shot Roboworm (Aarons Magic, green pumpkin, morning dawn — 3/16 to 1/4oz), Ned rig Z-Man Finesse TRD (green pumpkin, California 420), jerkbait Megabass Vision 110 (ghost), football jig (green pumpkin 1/2oz, rock craw trailer), swimbait on round jighead (natural shad, 3/8oz), topwater pencil popper (natural shad, clear).

NOTES: Clear water is the defining characteristic — fluorocarbon a must, lighter line 6-10lb. One of Oklahoma's best spotted bass lakes. Bluff fishing year-round productive. Tournament pressure on weekends significant. Good channel catfish and walleye population alongside excellent bass fishing. DNR habitat structures (brush piles) at published GPS coordinates worth fishing.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Tenkiller OK knowledge base',
  },

  // ─── Keystone Lake ───────────────────────────────────────────────────────
  {
    lake_name: 'Keystone Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/keystone',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Keystone Lake fishing guide',
  },
  {
    lake_name: 'Keystone Lake', state: 'OK', source_type: 'article',
    raw_text: `Keystone Lake — Oklahoma Bass Fishing Guide

Keystone Lake is a 26,000-acre reservoir on the Arkansas River near Sand Springs, west of Tulsa. Known for excellent largemouth and spotted bass fishing. Water varies from stained to slightly muddy. Features grass flats (hydrilla and milfoil in season), timber in upper lake, rocky points on lower lake, and extensive coves.

KEY PATTERNS:
- Spring: Largemouth in 2-8 feet in grass coves and timber flats. Spinnerbaits (chartreuse/white), swim jigs, Texas-rigged creature baits (beaver, brush hog — green pumpkin/black blue). Spotted bass on rocky points and riprap — jerkbaits and Ned rigs.
- Summer: Grass becomes primary — punch rigs on hydrilla mats (black/blue 1.5oz), frog fishing dawn/dusk, swim jigs on grass edges. Spotted bass deeper on points — drop shot, football jig. Night fishing productive with dark swim jigs and worms on main lake.
- Fall: Schooling activity on main lake as shad migrate — lipless cranks, swimbaits, topwater. Grass flats productive with swim jigs and spinnerbaits.
- Winter: Channel edges and main lake points — drop shot, blade bait, shakey head.

TOP BAITS: Swim jig (white shad, black/blue 3/8oz), Texas rig brush hog (green pumpkin, black/blue 3/4oz), punch rig (black/blue 1.5oz), hollow frog (black/blue), lipless crankbait (Red Eye Shad chrome), Ned rig (green pumpkin), drop shot (Roboworm morning dawn).

NOTES: Excellent grass lake. Hydrilla coverage varies — check ODWC for current grass maps. Upper lake has more timber; lower lake is rockier. Good access at multiple public ramps.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Keystone Lake OK knowledge base',
  },

  // ─── Fort Gibson Lake ────────────────────────────────────────────────────
  {
    lake_name: 'Fort Gibson Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/fort-gibson',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Fort Gibson Lake fishing guide',
  },
  {
    lake_name: 'Fort Gibson Lake', state: 'OK', source_type: 'article',
    raw_text: `Fort Gibson Lake — Oklahoma Bass Fishing Guide

Fort Gibson Lake is a 19,000-acre reservoir on the Grand (Neosho) River near Fort Gibson in eastern Oklahoma. Features varied structure — rocky banks and points in lower lake, more timber and flats in upper sections. Moderate clarity, typically stained. Strong largemouth and spotted bass fishery with good tournament history.

KEY PATTERNS:
- Spring: Largemouth on wood, flats, and gravel coves; spotted bass on rocky points and chunk rock. Spinnerbaits and squarebills on largemouth banks, Ned rigs and jerkbaits for spotted bass.
- Summer: Main lake structure for spotted bass — drop shot on bluff ends and points. Largemouth in shade under docks and in timber. Night fishing effective.
- Fall: Schooling fish on main lake points. Swimbaits, topwater, lipless cranks productive on schooling fish.
- Winter: Finesse on main lake — drop shot, blade bait vertically on deep structure.

TOP BAITS: Squarebill (chartreuse/sexy shad), Ned rig (green pumpkin), drop shot Roboworm, spinnerbait (chartreuse/white), football jig (green pumpkin), jerkbait (natural shad colors).

NOTES: Under-rated lake with quality fish. Dock fishing productive year-round. Mix of spotted and largemouth fishing requires different techniques for each. Good public access.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Fort Gibson Lake OK knowledge base',
  },

  // ─── Oologah Lake ────────────────────────────────────────────────────────
  {
    lake_name: 'Oologah Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/oologah',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Oologah Lake fishing guide',
  },
  {
    lake_name: 'Oologah Lake', state: 'OK', source_type: 'article',
    raw_text: `Oologah Lake — Oklahoma Bass Fishing Guide

Oologah Lake is a 29,500-acre reservoir on the Verdigris River in northeastern Oklahoma near Oologah. Known for its extensive flats, grass, and wind-blown points. Water typically stained to slightly muddy. Primarily largemouth bass with some spotted bass in lower lake sections.

KEY PATTERNS:
- Spring: Largemouth spawn on flats and in coves with brush. Spinnerbaits (chartreuse/white) along flats, Texas-rigged worms and lizards (watermelon/red) in 3-8 feet, swim jigs on grass edges.
- Summer: Deep main lake points and channel edges in 18-25 feet. Football jigs, Carolina rigs, deep crankbaits. Grass mats with frog and punch rig early/late.
- Fall: One of Oklahoma's best fall lakes — shad migration draws largemouth to flats and channel mouths. Lipless cranks, swimbaits, spinnerbaits on schooling fish. Very productive.
- Winter: Channel edges and main lake with drop shot, blade bait, shakey head.

TOP BAITS: Spinnerbait (chartreuse/white double willow), Texas rig lizard (watermelon/red), swim jig (white shad), football jig (green pumpkin), lipless crankbait (Red Eye Shad), squarebill (chartreuse sexy shad).

NOTES: Underrated big-bass lake. Strong fall bite. Wind-blown points on the main lake very productive in spring and fall. Multiple public ramps. Good crappie and walleye fishery alongside bass.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Oologah Lake OK knowledge base',
  },

  // ─── Broken Bow Lake ─────────────────────────────────────────────────────
  {
    lake_name: 'Broken Bow Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/broken-bow',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Broken Bow Lake fishing guide',
  },
  {
    lake_name: 'Broken Bow Lake', state: 'OK', source_type: 'article',
    raw_text: `Broken Bow Lake — Oklahoma Bass Fishing Guide

Broken Bow Lake is a 14,000-acre reservoir on Mountain Fork River in the Ouachita Mountains of southeastern Oklahoma near Broken Bow. One of Oklahoma's clearest lakes — visibility 10-25 feet. Exceptional spotted bass and largemouth fishery. Cold, deep mountain lake with dramatic rocky structure.

KEY PATTERNS:
- Spring: Largemouth spawn in gravel coves and on rocky flats in 3-10 feet. Spotted bass on rocky bluff ends and chunk rock points. Jerkbaits (natural/transparent colors) critical — Megabass, Lucky Craft in clear water. Ned rigs and small swimbaits on rock. Squarebills along shallow rocky banks.
- Summer: Very deep fish — spotted bass on bluff walls and main lake points 25-50 feet. Drop shot and Alabama rigs. Largemouth suspend near rocky structure mid-depth. Morning topwater on rocky points with schooling fish.
- Fall: Spotted bass school aggressively on main lake. Topwater walking baits, swimbaits, and jerkbaits on visible schools. One of Oklahoma's best fall spotted bass experiences.
- Winter: Blade baits and drop shots on deep structure. Jerkbaits on cold-water points. Finesse only given water clarity.

KEY STRUCTURES: Rocky bluffs (very prominent), chunk rock points, Mountain Fork River channel, cedar-lined banks, spawning gravel coves, deep main lake humps.

TOP BAITS: Drop shot (Roboworm Aarons Magic, green pumpkin, 3/16oz), jerkbait Megabass Vision 110 (ghost, clear), Ned rig (green pumpkin, black), small swimbait on round jighead (natural shad), topwater popper and walker (natural shad, chrome), squarebill (natural shad, sexy shad).

NOTES: Ultra-clear water demands fluorocarbon and light line (6-10lb). One of the most scenic fishing destinations in Oklahoma. Spotted bass dominant on main lake; largemouth in shallower coves. Limited public access — plan ramp access in advance. Cabins/resorts nearby make it a destination lake. Excellent year-round cold-water fishery.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Broken Bow Lake OK knowledge base',
  },

  // ─── Lake Murray ─────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Murray', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/murray',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Lake Murray fishing guide',
  },
  {
    lake_name: 'Lake Murray', state: 'OK', source_type: 'article',
    raw_text: `Lake Murray — Oklahoma Bass Fishing Guide

Lake Murray is a 5,728-acre reservoir near Ardmore in south-central Oklahoma. Clear to slightly stained water. Good largemouth and smallmouth bass fishery. Features rocky banks, points, submerged timber in upper lake, boat docks, and sandy flats. Located in state park — high recreational pressure on weekends.

KEY PATTERNS:
- Spring: Largemouth spawn on timber flats and rocky coves. Smallmouth on chunk rock points. Spinnerbaits and swimbaits for largemouth; drop shots and jerkbaits for smallmouth near rock.
- Summer: Deeper timber and rocky main lake points. Drop shot for both species. Dock fishing with Ned rigs and finesse jigs. Night fishing productive with swim jigs and dark worms.
- Fall: Shad migration triggers schooling — swimbaits, topwater, lipless cranks on main lake. Smallmouth active on rocky banks in cooling water.
- Winter: Finesse on deep structure — drop shot, blade bait.

TOP BAITS: Drop shot Roboworm (green pumpkin, morning dawn), Ned rig (green pumpkin), swim jig (white shad), jerkbait (natural colors for smallmouth), spinnerbait (chartreuse/white), lipless crankbait (chrome/blue).

NOTES: One of few Oklahoma lakes with quality smallmouth. Clear water rewards finesse presentations. State park setting means heavy recreational boat traffic on summer weekends — early morning recommended.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Murray OK knowledge base',
  },

  // ─── Skiatook Lake ───────────────────────────────────────────────────────
  {
    lake_name: 'Skiatook Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/skiatook',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Skiatook Lake fishing guide',
  },
  {
    lake_name: 'Skiatook Lake', state: 'OK', source_type: 'article',
    raw_text: `Skiatook Lake — Oklahoma Bass Fishing Guide

Skiatook Lake is a 10,500-acre reservoir northwest of Tulsa on Hominy Creek. Stained to slightly muddy water typical. Good largemouth bass fishery with less pressure than Tulsa-area lakes. Features rocky points, timber in upper lake, flats, and creek arms.

KEY PATTERNS:
- Spring: Largemouth on timber flats and rocky coves — spinnerbaits (chartreuse/white), squarebills, Texas-rigged worms (watermelon, june bug) on wood.
- Summer: Main lake points and timber edges in 12-20 feet. Football jig, Carolina rig, swim jigs on timber. Night fishing productive.
- Fall: Shad migration — lipless cranks, swimbaits, topwater walking baits on main lake flats and points.
- Winter: Drop shot and blade bait on main lake structure.

TOP BAITS: Spinnerbait (chartreuse/white), squarebill (sexy shad, chartreuse), Texas rig worm (watermelon, june bug, 4/0 EWG), football jig (green pumpkin), lipless crankbait, swim jig (white shad).

NOTES: Under-pressured lake. Good shore fishing access. Upper lake has more timber structure. Lower lake rockier with cleaner water. Strong crappie fishery.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Skiatook Lake OK knowledge base',
  },

  // ─── Kaw Lake ────────────────────────────────────────────────────────────
  {
    lake_name: 'Kaw Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/kaw',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Kaw Lake fishing guide',
  },
  {
    lake_name: 'Kaw Lake', state: 'OK', source_type: 'article',
    raw_text: `Kaw Lake — Oklahoma Bass Fishing Guide

Kaw Lake is a 17,040-acre reservoir on the Arkansas River near Ponca City in north-central Oklahoma. Known for outstanding largemouth and sand bass (white bass) fishing. Stained water typical. Features extensive flats, timber, and riprap. A sleeper big-bass lake in Oklahoma.

KEY PATTERNS:
- Spring: Largemouth spawn on sandy flats and timber areas in 3-8 feet. Spinnerbaits and swimbaits along timber edges, Texas rigs in wood. Riprap banks productive with squarebills and jerkbaits.
- Summer: Main lake humps and timber in 15-25 feet. Football jigs, Carolina rigs, deep cranks. Cooler morning topwater near timber.
- Fall: Shad schools bring largemouth and sand bass to surface on main lake — lipless cranks, swimbaits, topwater walking baits. One of Oklahoma's best fall fisheries.
- Winter: Main lake channel and points — drop shot, blade bait, jigging spoon.

TOP BAITS: Spinnerbait (chartreuse/white), squarebill, Texas rig (watermelon/red), football jig (green pumpkin), lipless crankbait (chrome/blue), swimbait (shad colors), drop shot Roboworm.

NOTES: Often overlooked but produces quality largemouth. Less fishing pressure than southeast Oklahoma lakes. Excellent sand bass (white bass) fishing in spring run up river. Good public access with Corps of Engineers parks.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Kaw Lake OK knowledge base',
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${SOURCES.length} OK sources into ingest_queue...`)

  // Get existing URLs to avoid duplicates
  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('url, lake_name')
    .eq('state', 'OK')

  const existingUrls = new Set((existing || []).map(r => r.url).filter(Boolean))
  const existingRawLakes = new Set(
    (existing || []).filter(r => !r.url).map(r => r.lake_name)
  )

  let inserted = 0, skipped = 0
  for (const source of SOURCES) {
    const isDupe = source.url
      ? existingUrls.has(source.url)
      : existingRawLakes.has(source.lake_name)

    if (isDupe) {
      console.log(`   ⏭  Skip: ${source.lake_name} — ${source.url?.slice(0, 60) || 'rawText'} (already queued)`)
      skipped++
      continue
    }

    const { error } = await supabase.from('ingest_queue').insert({
      lake_name:     source.lake_name,
      state:         source.state,
      source_type:   source.source_type,
      url:           source.url || null,
      raw_text:      source.raw_text || null,
      tournament:    source.tournament || null,
      organization:  source.organization || null,
      reported_date: source.reported_date || null,
      notes:         source.notes,
    })

    if (error) {
      console.error(`   ❌ ${source.lake_name}: ${error.message}`)
    } else {
      console.log(`   ✅ ${source.lake_name} — ${source.url?.slice(0, 60) || 'rawText'}`)
      inserted++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped`)
  console.log(`\nTo start processing:`)
  console.log(`  npx tsx scripts/ingestion/run-queue.ts --state OK --batch 3`)
}

main().catch(console.error)
