/**
 * AnglerIQ — Seed OK Ingest Queue Phase 3
 * Rich rawText knowledge bases for thin-data OK lakes and Lake B.A. Steinhagen (TX).
 * These replace/supplement the earlier thin seeds that yielded "No qualifying bass data found".
 * Each rawText is structured as tournament-style scenario data Gemini can extract records from.
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-queue-3.ts
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
  organization?: string
  reported_date?: string
  notes: string
}

const SOURCES: QueueItem[] = [

  // ─── Kaw Lake ─────────────────────────────────────────────────────────────
  {
    lake_name: 'Kaw Lake', state: 'OK', source_type: 'article',
    raw_text: `Kaw Lake, Oklahoma — Bass Fishing Tournament Patterns and Techniques

Kaw Lake is a 17,040-acre Army Corps reservoir on the Arkansas River near Ponca City, Kay County, north-central Oklahoma. Stained to moderately clear water depending on runoff. Features extensive timber, submerged brush, riprap at dam and bridges, main lake points, creek arm flats, and sandy shallow coves. One of Oklahoma's most underrated big-bass lakes with low fishing pressure. Largemouth bass primary target; some spotted bass in main lake areas.

SPRING PRE-SPAWN PATTERNS (water 52–62°F, March–April):
Pattern: Staging largemouth on secondary points and channel swings leading into creek arm coves.
Technique: Texas rig, slow dragged on bottom.
Bait: Zoom Brush Hog, watermelon red, 3/4oz bullet weight, 17lb fluorocarbon.
Structure: Secondary points, 8–14 feet.
Water clarity: Stained.
Notes: Fish position up on structure as water warms. Best bite mid-morning when sun penetrates.

Pattern: Covering water on wind-blown riprap and rocky points.
Technique: Squarebill crankbait, steady retrieve with deflections.
Bait: Strike King KVD 1.5, sexy shad, deflected off rock and riprap.
Structure: Dam face, bridge riprap, 3–6 feet.
Water temp: 58°F.
Notes: Wind activates feeding on riprap. Best in afternoon.

Pattern: Timber edges in backs of creek arms.
Technique: Swim jig, slow-rolled through submerged timber.
Bait: Strike King Tour Grade Swim Jig 3/8oz, white/chartreuse, 4.5" Rage Swimmer trailer.
Structure: Submerged timber, flooded brush, 4–8 feet.
Season: Spring.

SPAWN PATTERNS (water 63–70°F, April–May):
Pattern: Shallow coves with sandy/gravel bottom and scattered timber.
Technique: Wacky rig Senko, slow sink near beds.
Bait: Yamamoto Senko 5", green pumpkin, 1/0 wacky hook, no weight.
Structure: Spawning flats, 2–5 feet.
Water temp: 65°F.

Pattern: Bedding fish along chunk rock and riprap banks.
Technique: Finesse jig, slow hopped.
Bait: Strike King Bitsy Flip 1/4oz, green pumpkin, Rage Craw trailer.
Structure: Rock banks adjacent to spawning flats, 3–6 feet.

POST-SPAWN PATTERNS (water 70–78°F, May–June):
Pattern: Recovering females holding near first deep timber off spawning flats.
Technique: Football jig, dragged on bottom.
Bait: Strike King Tour Grade Football Jig 1/2oz, green pumpkin, Rage Tail Craw trailer.
Structure: Submerged timber edges, 10–16 feet.
Water temp: 72°F.

Pattern: Topwater bite at first light on main lake points and timber.
Technique: Walking topwater, walk-the-dog cadence.
Bait: Heddon Super Spook Jr., bone, worked over submerged timber tops.
Structure: Timber flats, 2–4 feet depth over structure.
Time of day: Early morning (first 2 hours of daylight).

SUMMER PATTERNS (water 82–88°F, June–September):
Pattern: Deep main lake timber and channel drops, midday.
Technique: Carolina rig, slow drag.
Bait: Zoom Speed Craw 3.5", watermelon seed, 1oz Carolina weight, 3-foot 15lb fluorocarbon leader.
Structure: Main channel drops, timber standing in 18–28 feet.

Pattern: Main lake humps and secondary points, early morning.
Technique: Deep diving crankbait, medium-speed retrieve.
Bait: Rapala DT-14, shad rattle, banged along bottom at 14–18 feet.
Structure: Main lake points, submerged humps, 14–20 feet.

Pattern: Offshore ledge bass following shad schools.
Technique: Football jig, crawled along bottom.
Bait: 3/4oz football jig, green pumpkin, 4" Zoom Super Chunk trailer, 15lb fluorocarbon.
Structure: Channel ledges and drops, 18–25 feet.
Water temp: 85°F.

FALL PATTERNS (water 65–75°F, September–November):
Pattern: Shad schools pushed into creek arm mouths by largemouth and sand bass.
Technique: Lipless crankbait, burning retrieve with ripping pauses.
Bait: Strike King Red Eye Shad 1/2oz, chrome/blue back, 14lb fluorocarbon.
Structure: Creek arm mouths, main lake flats, 4–10 feet.
Notes: One of Oklahoma's best fall shad kill fisheries. Blowups visible on surface.

Pattern: Topwater schooling action on main lake.
Technique: Topwater walking bait.
Bait: Heddon One Knocker Spook, chrome/blue, walked through schooling fish.
Structure: Open main lake, over bait schools.

Pattern: Backs of coves as shad move shallow.
Technique: Spinnerbait, slow roll.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, willowleaf blades.
Structure: Shallow timber, brush, 3–8 feet.
Water temp: 68°F.

WINTER PATTERNS (water 44–52°F, December–February):
Pattern: Main channel drops with suspended bass following shad schools.
Technique: Blade bait, vertical jigging.
Bait: Silver Buddy 1/2oz, silver, jigged vertically in 20–30 feet.
Structure: Main channel, 20–30 feet.

Pattern: Deep main lake points and humps.
Technique: Drop shot, shaking in place.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot weight, 8lb fluorocarbon.
Structure: Deep main lake points, 18–25 feet.
Water temp: 48°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Kaw Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Canton ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Canton', state: 'OK', source_type: 'article',
    raw_text: `Lake Canton, Oklahoma — Bass Fishing Patterns and Techniques

Lake Canton (Canton Lake) is a 7,610-acre shallow, wind-swept reservoir on the North Canadian River in Blaine County, northwest Oklahoma, near Canton. Managed by the Army Corps of Engineers. Water frequently stained to muddy from wind and agricultural runoff. Average depth is shallow (6–10 feet average). Excellent largemouth bass fishery, especially in spring. Features extensive shallow flats, submerged brush and timber, riprap on dam, submerged road structures, and wind-blown banks.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging on points and secondary channel edges adjacent to shallow spawning flats.
Technique: Spinnerbait, slow-rolled along wind-blown mud flat edges.
Bait: Strike King Premier Pro-Model Spinnerbait 1/2oz, chartreuse/white, willowleaf and Colorado blades.
Structure: Wind-blown banks, mud flats transitioning to channel, 3–7 feet.
Water clarity: Stained.
Notes: Wind and stained water are normal here. Chartreuse/white excels in low-vis conditions.

Pattern: Submerged brush and timber in backs of coves.
Technique: Flipping, Texas rig.
Bait: Zoom Brush Hog 4", black/blue, 1oz tungsten, 17lb fluorocarbon.
Structure: Submerged timber, brush piles, 4–8 feet.
Water temp: 58°F. Water clarity: Stained.

Pattern: Squarebill on riprap dam face.
Technique: Squarebill crankbait, deflection retrieve.
Bait: Strike King KVD 1.5, chartreuse shad, bumped off rock.
Structure: Dam riprap, 2–5 feet.

SPAWN PATTERNS (water 63–70°F, April–early May):
Pattern: Shallow spawning coves, bedding on sandy and gravel bottom.
Technique: Finesse jig, slow pitch.
Bait: Strike King Bitsy Flip 1/4oz, green pumpkin/black, Rage Craw Jr. trailer.
Structure: Spawning flats, protected coves, 2–5 feet.
Water temp: 65°F.

Pattern: Wacky rig in shallow brush.
Technique: Wacky rig, nose-hooked, drop and twitch.
Bait: Yamamoto Senko 5", watermelon/red flake, 1/0 wacky hook.
Structure: Scattered brush, 2–4 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Main lake points and channel edges after spawn.
Technique: Swim jig, moderate retrieve.
Bait: Z-Man Evergreen Jack Hammer ChatterBait 3/8oz, white, Keitech 3.3" Swing Impact trailer.
Structure: Secondary points, 6–10 feet.
Water temp: 73°F.

SUMMER (water 80–88°F, June–September):
Pattern: Early morning topwater on main lake flats and timber.
Technique: Popper, cadence retrieve.
Bait: Strike King Sexy Dawg Jr., chrome/black back, morning slicks.
Structure: Submerged timber tops, main lake flats, 2–4 feet.
Time of day: Dawn.

Pattern: Deeper brush and channel structure midday.
Technique: Texas rig, slow drag.
Bait: Zoom Speed Craw 3.5", watermelon red, 3/4oz weight, 17lb fluorocarbon.
Structure: Deeper brush piles, channel bends, 8–14 feet.
Water temp: 85°F.

Pattern: Lipless on main lake flats as shad school.
Technique: Lipless crankbait, burn-and-kill retrieve.
Bait: Rat-L-Trap 1/2oz, chrome/blue, 14lb monofilament.
Structure: Main lake flats, 4–8 feet.

FALL (water 62–74°F, September–November):
Pattern: Creek arm entrances with shad activity.
Technique: Umbrella rig/swimbait.
Bait: Keitech Swing Impact Fat 3.8", shad color, 1/2oz round jig head.
Structure: Creek arm mouths, 4–10 feet.

Pattern: Shallow timber and brush in upper lake (river channel arms).
Technique: Spinnerbait, slow roll.
Bait: Booyah Blade 1/2oz, white, willowleaf blades.
Structure: Flooded brush, shallow timber, 3–7 feet.
Water temp: 65°F. Water clarity: Stained.

WINTER (water 42–52°F, December–February):
Pattern: Main lake channel drops, lethargic fish.
Technique: Drop shot, dead-sticking.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 1/4oz drop shot weight, 8lb fluorocarbon.
Structure: Channel drops, deepest available water, 10–18 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Canton OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Fort Gibson Lake ──────────────────────────────────────────────────────
  {
    lake_name: 'Fort Gibson Lake', state: 'OK', source_type: 'article',
    raw_text: `Fort Gibson Lake, Oklahoma — Bass Fishing Patterns and Techniques

Fort Gibson Lake is a 19,100-acre Army Corps reservoir on the Grand (Neosho) River in Cherokee and Wagoner counties, eastern Oklahoma, near Wagoner and Fort Gibson. Large, relatively shallow, with extensive timber and brush, flat bottoms, creek arm systems, and some rocky banks near the upper reaches. Largemouth bass dominant; some spotted bass on main lake rocky areas. Part of the "green country" lakes of NE Oklahoma — typically stained to moderately stained water. Directly below Pensacola Dam (Grand Lake); the tailwaters area is productive.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging in secondary channel swings near timber in creek arms.
Technique: Jig-and-pig, slow lift-fall.
Bait: Booyah Boo Jig 1/2oz, black/blue, Zoom Super Chunk trailer.
Structure: Secondary points with timber, channel edges, 8–14 feet.
Water clarity: Stained. Water temp: 57°F.

Pattern: Squarebill on rocky points near main lake.
Technique: Squarebill crankbait, pause-and-go retrieve.
Bait: Strike King KVD 1.5, chartreuse shad, 14lb fluorocarbon.
Structure: Rocky main lake points, 3–6 feet.

Pattern: Spinnerbait on wind-blown timber banks.
Technique: Spinnerbait, slow roll parallel to timber.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, tandem willowleaf.
Structure: Flooded timber, points, 4–8 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–May):
Pattern: Shallow spawning coves with timber and brush in 2–6 feet.
Technique: Texas rig, deadstick on bed.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 15lb fluorocarbon.
Structure: Spawning flats, 2–5 feet.
Water temp: 65°F.

Pattern: Swim jig through shallow timber edges.
Technique: Swim jig, steady retrieve with erratic rod twitches.
Bait: Z-Man/Evergreen Jack Hammer 3/8oz, white/chartreuse, 4" swimbait trailer.
Structure: Shallow timber edges, 3–6 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Points and humps in 10–18 feet as females recover.
Technique: Carolina rig, slow drag.
Bait: Zoom Brush Hog 4", watermelon/red, 1oz Carolina weight, 3-foot 17lb leader.
Structure: Main lake points, secondary humps, 10–18 feet.
Water temp: 73°F.

SUMMER (water 82–88°F, June–September):
Pattern: Deep timber in main lake arms, 18–28 feet.
Technique: Football jig, slow drag on bottom.
Bait: Strike King Tour Grade Football Jig 3/4oz, green pumpkin, Rage Claw trailer.
Structure: Standing timber in 18–28 feet.
Water temp: 86°F.

Pattern: Early morning topwater over submerged timber tops.
Technique: Frog, walk over timber.
Bait: SPRO Bronzeye Frog 65, black, hopped over submerged logs.
Structure: Submerged timber tops, 2–3 feet.
Time of day: Dawn to 8am.

Pattern: Docks and shade structure midday.
Technique: Skip jig under docks.
Bait: 3/8oz casting jig, green pumpkin, Zoom Z-Craw trailer.
Structure: Boat docks, shaded banks.

FALL (water 62–74°F, September–November):
Pattern: Shad migration into creek arms, schooling bass.
Technique: Swimbait, matching shad size.
Bait: Keitech Swing Impact Fat 3.8", ayu, 3/8oz round jig head.
Structure: Creek arm mouths, main lake flats, 4–10 feet.

Pattern: Lipless on main lake timber flats.
Technique: Lipless crankbait, burning through timber.
Bait: Rat-L-Trap 1/2oz, gold/black, snapped through timber.
Structure: Timber flats, 4–10 feet.
Water temp: 67°F.

WINTER (water 44–52°F, December–February):
Pattern: Deep channel drops adjacent to main lake timber.
Technique: Blade bait, vertical jigging.
Bait: Silver Buddy 3/8oz, silver, jigged vertically.
Structure: Channel drops, 20–28 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Fort Gibson Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Murray ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Murray', state: 'OK', source_type: 'article',
    raw_text: `Lake Murray, Oklahoma — Bass Fishing Tournament Patterns and Techniques

Lake Murray is a 5,728-acre reservoir in Carter County, south-central Oklahoma, within Lake Murray State Park near Ardmore. One of Oklahoma's most scenic and productive bass lakes. Features clear to slightly stained water, sandy and rocky shoreline, chunk rock banks, submerged cedar trees and timber, main lake points, steep bluffs on the east side, docks, and creek arms. Largemouth and spotted bass. A popular tournament destination for Oklahoma bass circuits.

SPRING PRE-SPAWN (water 54–62°F, mid-March–April):
Pattern: Spotted bass staging on main lake rocky points and chunk rock banks.
Technique: Ned rig, slow drag.
Bait: Z-Man TRD 2.75", green pumpkin, 3/16oz Ned head, 8lb fluorocarbon.
Structure: Rocky main lake points, 8–14 feet.
Water clarity: Clear. Water temp: 57°F.

Pattern: Largemouth moving toward cedar tree structure in coves.
Technique: Jig, slow swim-and-drop.
Bait: Booyah Boo Jig 3/8oz, green pumpkin/orange, Zoom Super Chunk Jr. trailer.
Structure: Submerged cedar trees, 6–12 feet.

Pattern: Squarebill along chunk rock banks.
Technique: Squarebill crankbait, deflection retrieve.
Bait: Strike King KVD 1.5, sexy shad, 14lb fluorocarbon.
Structure: Chunk rock banks and points, 3–6 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–early May):
Pattern: Bedding largemouth in shallow protected coves with sandy bottom.
Technique: Wacky rig, drop-and-twitch.
Bait: Yamamoto Senko 4", green pumpkin, 1/0 wacky hook.
Structure: Sandy spawning flats, 2–5 feet.
Water temp: 66°F. Water clarity: Clear.

Pattern: Sight fishing bedding spotted bass on gravel points.
Technique: Drop shot, shaken in place over beds.
Bait: Roboworm 4.5" Straight Tail, oxblood/red flake, 1/4oz drop shot, 8lb fluorocarbon.
Structure: Gravel points, 3–6 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Recovering females on first deep structure off spawning areas.
Technique: Shaky head, slow drag.
Bait: Zoom Finesse Worm 4.5", watermelon red, 3/16oz shaky head, 10lb fluorocarbon.
Structure: Cedar trees, rocky points 10–16 feet.
Water temp: 72°F.

SUMMER (water 82–88°F, June–September):
Pattern: Main lake rocky points and bluffs with spotted and largemouth bass mixed.
Technique: Football jig, slow drag.
Bait: Skinny Bear Custom Football Jig 3/4oz, green pumpkin, 4" Zoom Super Chunk.
Structure: Main lake rocky points, bluff ends, 15–25 feet.
Water temp: 86°F. Water clarity: Clear.

Pattern: Topwater over main lake points and bluffs at first light.
Technique: Walking topwater.
Bait: Heddon Super Spook, chrome/blue, walked over points and bluff ends.
Structure: Main lake points, 2–6 feet depth.
Time of day: Dawn.

Pattern: Drop shot on steep bluff walls.
Technique: Drop shot, shaken vertically against bluff.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 1/2oz drop shot weight, 8lb fluorocarbon.
Structure: East bank bluff walls, 20–35 feet.

FALL (water 62–74°F, September–November):
Pattern: Spotted bass chasing threadfin shad on main lake.
Technique: Swimbait, matching shad profile.
Bait: Keitech Swing Impact 3.8", sexy shad, 3/8oz round head, 12lb fluorocarbon.
Structure: Main lake, open water over shad schools, 6–14 feet.
Water temp: 67°F.

Pattern: Topwater schooling on main lake points in morning.
Technique: Walking topwater.
Bait: Heddon One Knocker Spook, chrome, walked through breaking fish.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake points and bluff bases.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 6lb fluorocarbon.
Structure: Deep bluff bases, main lake points, 20–30 feet.
Water temp: 47°F. Water clarity: Clear.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Murray OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Broken Bow Lake ──────────────────────────────────────────────────────
  {
    lake_name: 'Broken Bow Lake', state: 'OK', source_type: 'article',
    raw_text: `Broken Bow Lake, Oklahoma — Bass Fishing Tournament Patterns and Techniques

Broken Bow Lake is a 14,000-acre highland impoundment of the Mountain Fork River in McCurtain County, extreme southeastern Oklahoma, near Broken Bow. One of Oklahoma's premier clear-water bass lakes. Water clarity is excellent — often 8–15 feet visibility. Features steep rocky bluffs, chunk rock banks, standing timber, main lake points, submerged creek channels, and deep structure. Spotted bass are the primary target; largemouth present in shallower timber and cove areas. Minimum size limits on spotted bass have produced excellent quality fishing. Similar fishery to Bull Shoals or Lake Ouachita in character.

SPRING PRE-SPAWN — SPOTTED BASS (water 52–62°F, March–April):
Pattern: Spotted bass staging on main lake chunk rock points.
Technique: Jerkbait, pause-and-twitch.
Bait: Megabass Vision 110, ghost ayu, 10lb fluorocarbon, 2-4 second pauses.
Structure: Main lake rocky points, 6–14 feet.
Water clarity: Clear. Water temp: 57°F.

Pattern: Drop shot on main lake points and bluff ends.
Technique: Drop shot, shaken lightly.
Bait: Roboworm 4.5" Straight Tail, margarita mutilator, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Main lake points, 10–18 feet.

Pattern: Small ned rig on gravel transitions.
Technique: Ned rig, slow drag-and-hop.
Bait: Z-Man TRD 2.75", green pumpkin, 3/16oz Ned head, 8lb fluorocarbon.
Structure: Gravel/chunk rock transitions, 8–14 feet.

SPAWN — SPOTTED BASS (water 62–68°F, April–May):
Pattern: Spotted bass bedding on gravel shelves and chunk rock.
Technique: Drop shot, shaken over beds.
Bait: Roboworm 4.5" Straight Tail, red shad, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Gravel shelves, chunk rock banks, 4–8 feet.
Water temp: 65°F. Water clarity: Clear.

Pattern: Wacky rig around spawn areas.
Technique: Wacky rig, slow sink.
Bait: Yamamoto Senko 4", watermelon/black flake, 1/0 octopus hook.
Structure: Rocky spawning areas, 3–6 feet.

POST-SPAWN (water 68–76°F, May–June):
Pattern: Spotted bass recovering on nearby deep rocky structure.
Technique: Football jig, slow crawl.
Bait: 1/2oz football jig, green pumpkin, 3.5" Zoom Speed Craw trailer, 15lb fluorocarbon.
Structure: Rocky points and humps, 14–22 feet.
Water temp: 72°F.

SUMMER (water 82–86°F, June–September):
Pattern: Deep main lake spotted bass on bluff walls and main channel structure.
Technique: Drop shot, vertical presentation.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 1/2oz drop shot weight, 8lb fluorocarbon.
Structure: Steep bluff walls, 25–40 feet.
Water temp: 84°F. Water clarity: Clear.

Pattern: Main lake points and humps with spotted bass.
Technique: Football jig, slow drag.
Bait: 3/4oz football jig, green pumpkin/black, 4" Zoom Speed Craw trailer.
Structure: Deep rocky points, offshore humps, 18–28 feet.

Pattern: Swimbait on suspended spotted bass over deep structure.
Technique: Swimbait, slow roll at depth.
Bait: Keitech Swing Impact 3.8", ayu, 1/2oz round head, 12lb fluorocarbon.
Structure: Suspended over main lake, 20–30 feet.

FALL (water 60–72°F, September–November):
Pattern: Spotted bass chasing shad to surface on main lake.
Technique: Walking topwater.
Bait: Heddon Spook Jr., chrome/blue, walked through schooling fish.
Structure: Open main lake over bait schools.
Water temp: 66°F.

Pattern: Jerkbait along rocky bluffs as water cools.
Technique: Jerkbait, 3-second pause.
Bait: Rapala X-Rap 10, shad, worked along bluff walls, 6–12 feet.
Structure: Bluff walls, rocky main lake banks.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake spotted bass — finesse required in clear cold water.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, margarita mutilator, 3/16oz drop shot, 6lb fluorocarbon.
Structure: Main lake points and bluffs, 25–40 feet.
Water temp: 47°F.

Pattern: Blade bait on main channel structure.
Technique: Blade bait, vertical jigging.
Bait: Silver Buddy 3/8oz, silver, jigged vertically at 25–35 feet.
Structure: Main channel drops, deep points.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Broken Bow Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Arcadia Lake ─────────────────────────────────────────────────────────
  {
    lake_name: 'Arcadia Lake', state: 'OK', source_type: 'article',
    raw_text: `Arcadia Lake, Oklahoma — Bass Fishing Patterns and Techniques

Arcadia Lake is a 1,820-acre City of Edmond reservoir in central Oklahoma, north of Oklahoma City near Edmond. Urban fishery with high fishing pressure. Features shallow coves, docks, riprap, submerged timber, main lake points, and a rocky dam face. Water ranges from clear to stained depending on rain. Largemouth bass are the primary species. Heavily managed with good stocking — produces quality bass despite small size and pressure. Popular for OKC metro bass club tournaments.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging on main lake points and secondary structure.
Technique: Jerkbait, 2–3 second pause.
Bait: Rapala X-Rap 10, shad, 10lb fluorocarbon, slow twitched.
Structure: Main lake points, secondary points, 6–12 feet.
Water clarity: Clear to slightly stained. Water temp: 57°F.

Pattern: Squarebill on riprap dam and rocky banks.
Technique: Squarebill crankbait, deflection retrieve.
Bait: Strike King KVD 1.5, sexy shad, deflected off rock.
Structure: Dam riprap, rocky banks, 3–6 feet.

Pattern: Jig around dock posts and submerged timber.
Technique: Flipping jig, short pitch.
Bait: Booyah Boo Jig 3/8oz, green pumpkin, 3" Rage Craw trailer.
Structure: Boat docks, submerged timber, 4–8 feet.

SPAWN (water 63–70°F, April–May):
Pattern: Bedding largemouth on protected sandy coves and dock areas.
Technique: Texas rig, drop and shake over bed.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 12lb fluorocarbon.
Structure: Spawning coves, 2–4 feet.
Water temp: 65°F.

Pattern: Wacky rig around docks and seawalls during spawn.
Technique: Wacky rig, slow sink past dock posts.
Bait: Yamamoto Senko 5", watermelon, 1/0 wacky hook, no weight.
Structure: Docks, seawalls, 2–5 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Post-spawn females suspending off dock edges and points.
Technique: Shaky head, slow drag.
Bait: Zoom Trick Worm 6", green pumpkin, 3/16oz shaky head, 10lb fluorocarbon.
Structure: Dock edges, points, 8–14 feet.
Water temp: 73°F.

SUMMER (water 82–88°F, June–September):
Pattern: Early morning topwater over main lake points and rocky banks.
Technique: Walking topwater.
Bait: Heddon Super Spook Jr., chrome/black, walked along rocky banks.
Structure: Main lake points, dam face, 2–6 feet.
Time of day: Dawn.

Pattern: Deep dock fishing midday.
Technique: Drop shot, dead-sticked by dock posts.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Long docks over deeper water, 10–18 feet.
Water temp: 87°F.

Pattern: Swim jig along rocky banks in low light.
Technique: Swim jig, steady retrieve.
Bait: Z-Man/Evergreen Jack Hammer 3/8oz, white, Keitech 3.3" Swing Impact trailer.
Structure: Rocky banks, riprap, 4–8 feet.

FALL (water 62–72°F, September–November):
Pattern: Bass busting shad on main lake and near dam.
Technique: Spinnerbait, fast retrieve.
Bait: Strike King Premier Pro-Model 1/2oz, white, tandem willowleaf.
Structure: Main lake open water, dam area, 4–10 feet.
Water temp: 66°F.

Pattern: Jig on deeper main lake structure as water cools.
Technique: Football jig, dragged.
Bait: 3/8oz football jig, green pumpkin/black, 3" Rage Craw trailer, 12lb fluorocarbon.
Structure: Main lake points, 10–16 feet.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake points and channel swings.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood/red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep points, 14–20 feet.
Water temp: 47°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Arcadia Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Hudson ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Hudson', state: 'OK', source_type: 'article',
    raw_text: `Lake Hudson, Oklahoma — Bass Fishing Patterns and Techniques

Lake Hudson is a 15,180-acre impoundment of the Neosho (Grand) River in Mayes County, northeastern Oklahoma, near Langley. A mid-depth lake with old river channel running through extensive timber and brush. Largemouth bass are primary; some spotted bass on main lake rocky areas near the dam. Moderately stained water typical. Part of the "Grand River" chain of lakes. Known for good timber fishing and quality largemouth in the 3–5 pound range.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging on secondary channel swings with timber.
Technique: Swim jig, slow roll through timber.
Bait: Strike King Tour Grade Swim Jig 1/2oz, white/chartreuse, 4.5" Paddle Tail Swimbait trailer.
Structure: Secondary channel swings, submerged timber, 8–14 feet.
Water clarity: Stained. Water temp: 58°F.

Pattern: Jig in timber on main lake points.
Technique: Pitch and flip jig, lift-fall.
Bait: Booyah Boo Jig 1/2oz, black/blue, 4" Rage Craw trailer.
Structure: Standing timber on main lake points, 6–14 feet.

Pattern: Squarebill on riprap near dam.
Technique: Squarebill crankbait, steady retrieve with pauses.
Bait: Strike King KVD 1.5, chartreuse shad, 14lb fluorocarbon.
Structure: Dam riprap, 3–6 feet.

SPAWN (water 63–70°F, April–May):
Pattern: Shallow spawning areas in protected coves with brush and soft bottom.
Technique: Wacky rig, slow drop.
Bait: Yamamoto Senko 5", watermelon/black, 1/0 wacky hook.
Structure: Shallow protected coves, 2–5 feet.
Water temp: 66°F.

Pattern: Texas rig in shallow timber during spawn.
Technique: Texas rig, deadstick around base of trees.
Bait: Zoom Brush Hog 4", watermelon/red, 3/16oz weight, 15lb fluorocarbon.
Structure: Shallow timber, 2–5 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Post-spawn bass relating to first deep timber off spawning flats.
Technique: Carolina rig, slow drag.
Bait: Zoom Speed Craw 3.5", watermelon seed, 1oz Carolina weight, 3-foot 17lb leader.
Structure: Timber in 12–20 feet, adjacent to spawning flats.
Water temp: 74°F.

SUMMER (water 82–88°F, June–September):
Pattern: Deep timber stands in 20–30 feet on main lake.
Technique: Football jig, slow drag along bottom.
Bait: Strike King Tour Grade Football Jig 3/4oz, green pumpkin, Rage Craw trailer.
Structure: Deep timber in 20–28 feet on main lake.
Water temp: 86°F.

Pattern: Morning frog bite over shallow timber flats.
Technique: Hollow body frog, walk-the-dog over timber.
Bait: SPRO Bronzeye Frog 65, black, walked over submerged timber tops.
Structure: Submerged timber tops, 2–3 feet.
Time of day: Dawn.

Pattern: Deeper main lake structure, suspended bass.
Technique: Swimbait, count-down at depth.
Bait: Keitech Swing Impact Fat 3.8", pro blue, 1/2oz round head, counted to 20 feet.
Structure: Main lake channel, suspended off timber at 15–22 feet.

FALL (water 62–74°F, September–November):
Pattern: Shad migration into creek arms, largemouth following.
Technique: Lipless crankbait, yo-yo retrieve.
Bait: Strike King Red Eye Shad 1/2oz, chrome/blue, 14lb monofilament.
Structure: Creek arm mouths, main lake flats, 4–10 feet.
Water temp: 67°F.

Pattern: Spinnerbait on wind-blown timber banks.
Technique: Spinnerbait, slow roll with occasional flutter.
Bait: Strike King Premier Pro-Model 1/2oz, white, willowleaf blades.
Structure: Wind-blown timber banks, 3–8 feet.

WINTER (water 44–52°F, December–February):
Pattern: Vertical jigging on main lake timber and channel drops.
Technique: Blade bait, vertical jig.
Bait: Silver Buddy 1/2oz, silver, jigged over submerged timber in 20–28 feet.
Structure: Standing timber and channel drops, 20–28 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Hudson OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Fort Supply Lake ─────────────────────────────────────────────────────
  {
    lake_name: 'Fort Supply Lake', state: 'OK', source_type: 'article',
    raw_text: `Fort Supply Lake, Oklahoma — Bass Fishing Patterns and Techniques

Fort Supply Lake is a 1,820-acre Army Corps reservoir on Wolf Creek in Woodward County, northwestern Oklahoma, near Woodward. A wind-swept, shallow, fertile reservoir with stained to muddy water most of the year. Features shallow flats, brush piles, limited timber, wind-blown mud banks, and rocky riprap on the dam. Largemouth bass are the primary species. Low fishing pressure for most of the year. Best results with baits suited for muddy/stained conditions — chartreuse, white, and fire tiger excel.

SPRING PRE-SPAWN (water 52–62°F, March–April):
Pattern: Largemouth staging on main lake points and riprap.
Technique: Spinnerbait, slow roll.
Bait: Strike King Premier Pro-Model 1/2oz, chartreuse/white, willowleaf and Colorado blade, 17lb fluorocarbon.
Structure: Wind-blown points, riprap, 3–7 feet.
Water clarity: Stained/muddy. Water temp: 56°F.
Notes: Chartreuse is the go-to color in NW Oklahoma's typically muddy water.

Pattern: Jig on deeper main lake structure.
Technique: Jig, slow lift-fall.
Bait: Booyah Boo Jig 1/2oz, black/blue, 4" Rage Craw trailer.
Structure: Main lake points, 6–10 feet.

Pattern: Squarebill on dam riprap.
Technique: Squarebill crankbait.
Bait: Strike King KVD 1.5, chartreuse shad, deflected off rock.
Structure: Dam riprap, 2–5 feet.
Water temp: 59°F.

SPAWN (water 62–70°F, April–May):
Pattern: Spawning largemouth on shallow mud flats, protected from wind.
Technique: Texas rig, deadstick.
Bait: Zoom Brush Hog 4", black/blue, 1/4oz weight, 17lb fluorocarbon.
Structure: Protected mud flats, 2–4 feet.
Water temp: 65°F. Water clarity: Stained.

Pattern: Spinnerbait on shallow timber and brush.
Technique: Spinnerbait, slow roll.
Bait: Booyah Blade 3/8oz, chartreuse/white, Colorado/willowleaf combo.
Structure: Brush piles, flooded willows, 2–5 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Bass retreating to deepest available structure post-spawn.
Technique: Carolina rig, slow drag.
Bait: Zoom Trick Worm 6", chartreuse/pepper, 3/4oz Carolina weight, 3-foot 17lb leader.
Structure: Channel edges, main lake points, 8–14 feet.
Water temp: 73°F.

SUMMER (water 82–90°F, June–September):
Pattern: Early morning topwater bite, limited window before wind.
Technique: Walking topwater.
Bait: Heddon Zara Spook Jr., chartreuse/white, walked over shallow points.
Structure: Main lake points, flats, 2–4 feet.
Time of day: Dawn only (wind picks up by 8am most days).

Pattern: Deeper brush piles and channel edges midday.
Technique: Punch rig, punching through algae and floating debris.
Bait: Zoom Brush Hog 4", black/blue, 2oz tungsten punch weight, 65lb braid.
Structure: Floating vegetation/algae mats, channel edges, 4–8 feet.
Water temp: 88°F.

FALL (water 62–72°F, September–November):
Pattern: Shad schooling activity on main lake flats.
Technique: Lipless crankbait, burning retrieve.
Bait: Rat-L-Trap 1/2oz, chartreuse/black, burned over flats.
Structure: Main lake flats and points, 3–7 feet.
Water temp: 65°F. Water clarity: Stained.

Pattern: Spinnerbait on wind-blown banks.
Technique: Spinnerbait, medium retrieve parallel to bank.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, willowleaf.
Structure: Wind-blown mud banks, 2–6 feet.

WINTER (water 40–50°F, December–February):
Pattern: Main lake deep structure, slow finesse presentation.
Technique: Jig, slow lift-fall.
Bait: 3/8oz casting jig, black/blue, small trailer, 15lb fluorocarbon.
Structure: Deepest available structure, 8–14 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Fort Supply Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Overholser ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Overholser', state: 'OK', source_type: 'article',
    raw_text: `Lake Overholser, Oklahoma — Bass Fishing Patterns and Techniques

Lake Overholser is a 1,500-acre City of Oklahoma City reservoir on the North Canadian River in western OKC near Bethany. Very shallow (average 4–6 feet), stained to muddy water, wind-swept. Features shallow mud flats, cattail edges, riprap on the dam and causeway, submerged timber and brush in deeper areas, and boat docks. Largemouth bass fishing with high OKC metro pressure. Best in spring and fall when conditions are cooler. Big bass come from the riprap causeway and deeper brush. Fished heavily in local OKC bass club circuits.

SPRING PRE-SPAWN (water 52–60°F, March–April):
Pattern: Largemouth staging on riprap causeway and dam face.
Technique: Spinnerbait, slow roll along riprap.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, Colorado blade in front, willowleaf rear.
Structure: Dam riprap, causeway riprap, 3–6 feet.
Water clarity: Stained. Water temp: 56°F.

Pattern: Jig on brush piles in 6–10 feet.
Technique: Casting jig, lift-fall.
Bait: Booyah Boo Jig 3/8oz, green pumpkin/black, 3" Rage Craw trailer.
Structure: Submerged brush piles, 6–10 feet.

Pattern: Squarebill on riprap.
Technique: Squarebill crankbait.
Bait: Strike King KVD 1.5, chartreuse shad, 12lb fluorocarbon.
Structure: Riprap causeway, 2–5 feet.
Water temp: 58°F.

SPAWN (water 63–70°F, April–May):
Pattern: Shallow mud flat spawning along cattail edges.
Technique: Texas rig, slow drag.
Bait: Zoom Speed Craw 3.5", black/blue, 1/4oz weight, 17lb fluorocarbon.
Structure: Cattail edges, shallow mud flats, 2–4 feet.
Water temp: 65°F. Water clarity: Stained.

Pattern: Frog over cattail mats.
Technique: Frog, walked over surface mats.
Bait: SPRO Bronzeye Frog 65, black, hopped through openings in cattails.
Structure: Cattail mats, 1–3 feet.

POST-SPAWN AND SUMMER (water 70–88°F, May–September):
Pattern: Riprap causeway — best structure on the lake for consistent bass.
Technique: Football jig, slow drag on riprap.
Bait: 3/8oz football jig, green pumpkin, small craw trailer, 15lb fluorocarbon.
Structure: Causeway riprap, 4–8 feet.
Water temp: 82°F.

Pattern: Early morning topwater on main lake flats.
Technique: Walking topwater.
Bait: Heddon Super Spook Jr., bone, walked on calm early mornings.
Structure: Main lake flats, 2–4 feet.
Time of day: Dawn.

Pattern: Drop shot on deeper brush in 6–10 feet.
Technique: Drop shot, shaken in place.
Bait: Roboworm 4" Straight Tail, morning dawn, 1/4oz drop shot, 8lb fluorocarbon.
Structure: Submerged brush, 6–10 feet.
Water temp: 87°F.

FALL (water 62–72°F, September–November):
Pattern: Riprap and dam area with shad schooling.
Technique: Lipless crankbait, cast and burn.
Bait: Strike King Red Eye Shad 1/2oz, chrome/blue, 12lb monofilament.
Structure: Dam riprap, causeway, 3–7 feet.
Water temp: 66°F.

Pattern: Spinnerbait on wind-blown shallow points.
Technique: Spinnerbait, medium-speed retrieve.
Bait: Strike King Premier Pro-Model 1/2oz, white, willowleaf blades.
Structure: Wind-blown points, 2–5 feet.

WINTER (water 42–52°F, December–February):
Pattern: Deepest available water — causeway riprap and channel brush.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Causeway riprap, 6–10 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Overholser OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Hefner ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Hefner', state: 'OK', source_type: 'article',
    raw_text: `Lake Hefner, Oklahoma — Bass Fishing Patterns and Techniques

Lake Hefner is a 2,500-acre City of Oklahoma City drinking water reservoir in NW Oklahoma City. Very shallow, wind-swept, with limited structure — primarily riprap banks and dam face, some submerged brush, and boat docks. Largemouth bass only. High fishing pressure from OKC metro anglers. Produces quality bass on riprap and sparse brush due to limited competition for structure. Best spring and fall — summer heat renders most of the lake too warm and shallow. Fish the few pieces of quality structure repeatedly.

SPRING PRE-SPAWN (water 52–62°F, March–April):
Pattern: Largemouth staged on riprap dam and bank sections.
Technique: Crankbait, medium-speed retrieve along riprap.
Bait: Strike King Series 5, sexy shad, 14lb fluorocarbon, banged along rock.
Structure: Riprap banks, dam face, 3–6 feet.
Water clarity: Clear to stained. Water temp: 56°F.

Pattern: Spinnerbait on main lake points.
Technique: Spinnerbait, slow roll parallel to bank.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, willowleaf.
Structure: Main lake points, 3–6 feet.

Pattern: Jig on submerged brush near riprap.
Technique: Casting jig, lift-fall.
Bait: Booyah Boo Jig 3/8oz, green pumpkin, 3" Rage Craw trailer.
Structure: Submerged brush adjacent to riprap, 4–8 feet.
Water temp: 59°F.

SPAWN (water 63–70°F, April–May):
Pattern: Bedding largemouth on shallow protected areas and brush.
Technique: Wacky rig, slow sink.
Bait: Yamamoto Senko 5", watermelon, 1/0 wacky hook.
Structure: Shallow protected areas, 2–4 feet.
Water temp: 65°F.

Pattern: Texas rig on brush.
Technique: Texas rig, pitch and deadstick.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 12lb fluorocarbon.
Structure: Brush piles in spawning coves, 2–5 feet.

POST-SPAWN AND SUMMER (water 72–88°F, May–September):
Pattern: Riprap as primary structure for post-spawn and summer fish.
Technique: Football jig, slow drag along riprap bottom.
Bait: 3/8oz football jig, green pumpkin, 2.5" Rage Craw trailer, 15lb fluorocarbon.
Structure: Riprap, 4–8 feet.
Water temp: 83°F.

Pattern: Drop shot on brush piles for mid-summer fish.
Technique: Drop shot, shaken in place.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Submerged brush, 6–10 feet.
Time of day: Early morning.

Pattern: Walking topwater at dawn over main lake.
Technique: Walking topwater.
Bait: Heddon Super Spook Jr., chrome/black, walked over open water near riprap.
Structure: Main lake riprap banks, 2–4 feet.
Time of day: Dawn.

FALL (water 62–72°F, September–November):
Pattern: Bass following shad to main lake and dam area.
Technique: Lipless crankbait, burn-and-kill.
Bait: Rat-L-Trap 1/2oz, chrome/blue, burned along riprap and dam.
Structure: Dam, main lake riprap, 3–6 feet.
Water temp: 65°F.

Pattern: Spinnerbait on wind-blown banks.
Technique: Spinnerbait, medium retrieve.
Bait: Strike King Premier Pro-Model 1/2oz, white, willowleaf.
Structure: Wind-blown riprap banks, 2–5 feet.

WINTER (water 42–52°F, December–February):
Pattern: Deep riprap near dam — deepest accessible water.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Dam riprap, 6–10 feet.
Water temp: 46°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Hefner OK — rich tournament-pattern knowledge base v2',
  },

  // ─── McGee Creek Reservoir ────────────────────────────────────────────────
  {
    lake_name: 'McGee Creek Reservoir', state: 'OK', source_type: 'article',
    raw_text: `McGee Creek Reservoir, Oklahoma — Bass Fishing Patterns and Techniques

McGee Creek Reservoir is a 3,900-acre clear-water highland reservoir in Atoka County, southeastern Oklahoma, near Atoka. A remote, lightly pressured lake with excellent water clarity (often 10+ feet visibility). Features steep rocky bluffs on the east arm, chunk rock banks, main lake points, submerged timber in upper arms, and deep main lake structure. Both largemouth and spotted bass present. Clear water demands finesse presentations and lighter line. Very similar character to Lake Murray — clear, deep, rocky. One of Oklahoma's hidden gems.

SPRING PRE-SPAWN (water 52–62°F, March–April):
Pattern: Spotted bass on main lake rocky points.
Technique: Ned rig, slow drag-and-hop.
Bait: Z-Man TRD 2.75", green pumpkin, 3/16oz Ned head, 8lb fluorocarbon.
Structure: Rocky main lake points, 8–14 feet.
Water clarity: Clear. Water temp: 57°F.

Pattern: Jerkbait along rocky bluffs.
Technique: Jerkbait, pause-and-twitch.
Bait: Megabass Vision 110, ghost ayu, 10lb fluorocarbon.
Structure: Bluff walls and chunk rock banks, 6–14 feet.

Pattern: Largemouth in timber in upper arms.
Technique: Swim jig, slow roll.
Bait: Strike King Tour Grade Swim Jig 3/8oz, green pumpkin, 4" paddle tail trailer.
Structure: Submerged timber in upper arms, 6–12 feet.
Water temp: 59°F.

SPAWN (water 63–70°F, April–May):
Pattern: Spotted bass bedding on gravel shelves and chunk rock.
Technique: Drop shot, shaken over beds.
Bait: Roboworm 4.5" Straight Tail, red shad, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Gravel and chunk rock spawning areas, 4–8 feet.
Water temp: 65°F. Water clarity: Clear.

Pattern: Largemouth in shallow protected coves.
Technique: Wacky rig, slow sink.
Bait: Yamamoto Senko 4", watermelon, 1/0 wacky hook.
Structure: Protected shallow coves with soft bottom, 2–5 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Post-spawn bass retreating to timber and rocky structure.
Technique: Finesse jig, slow pitch.
Bait: 3/8oz finesse jig, green pumpkin, 3" Rage Craw trailer, 12lb fluorocarbon.
Structure: Timber edges, rocky points, 10–16 feet.
Water temp: 73°F.

SUMMER (water 82–86°F, June–September):
Pattern: Deep spotted bass on main lake bluffs — clear water deep bite.
Technique: Drop shot, vertical presentation.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 1/2oz drop shot, 8lb fluorocarbon.
Structure: Bluff walls, 25–40 feet.
Water temp: 85°F. Water clarity: Clear.

Pattern: Football jig on main lake points.
Technique: Football jig, slow crawl.
Bait: 3/4oz football jig, green pumpkin, 3.5" Zoom Speed Craw trailer, 15lb fluorocarbon.
Structure: Rocky main lake points, 16–25 feet.

FALL (water 60–72°F, September–November):
Pattern: Schooling spotted bass on main lake over bait.
Technique: Swimbait, fast retrieve to match shad.
Bait: Keitech Swing Impact 3.8", ayu, 3/8oz round head, 12lb fluorocarbon.
Structure: Open main lake over shad schools.
Water temp: 66°F.

Pattern: Jerkbait on rocky points and bluffs as water cools.
Technique: Jerkbait, 2–3 second pause.
Bait: Rapala X-Rap 10, shad, worked along rocky banks.
Structure: Main lake points, bluff walls, 6–12 feet.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake bass — ultra-clear winter conditions.
Technique: Drop shot, dead-sticked with light line.
Bait: Roboworm 4.5" Straight Tail, margarita mutilator, 3/16oz drop shot, 6lb fluorocarbon.
Structure: Deep main lake points, bluff walls, 25–38 feet.
Water temp: 46°F. Water clarity: Clear.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'McGee Creek Reservoir OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Lawtonka ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Lawtonka', state: 'OK', source_type: 'article',
    raw_text: `Lake Lawtonka, Oklahoma — Bass Fishing Patterns and Techniques

Lake Lawtonka is a 5,000-acre drinking water reservoir in Comanche County, southwestern Oklahoma, adjacent to the Wichita Mountains Wildlife Refuge near Lawton. Somewhat clear to moderately stained water. Features rocky banks and points influenced by the Wichita Mountains granite, some submerged timber, shallow coves with gravel bottom, main lake points, and limited docks. Largemouth bass are primary. The granite boulder banks are the defining structure of this lake — fish them hard. A smaller but productive tournament destination for southwest Oklahoma circuits.

SPRING PRE-SPAWN (water 54–63°F, March–April):
Pattern: Largemouth staging on granite boulder banks and main lake rocky points.
Technique: Squarebill crankbait, deflection retrieve.
Bait: Strike King KVD 1.5, sexy shad, deflected off granite boulders.
Structure: Granite boulder banks, 3–6 feet.
Water clarity: Clear to slightly stained. Water temp: 58°F.

Pattern: Jig on rocky main lake points.
Technique: Casting jig, slow lift-fall.
Bait: Booyah Boo Jig 3/8oz, green pumpkin, 3" Rage Craw trailer.
Structure: Rocky main lake points, 6–12 feet.

Pattern: Spinnerbait on wind-blown rocky banks.
Technique: Spinnerbait, medium-speed retrieve.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, willowleaf.
Structure: Rocky banks in wind, 3–7 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–May):
Pattern: Bedding on gravel flats in protected coves with boulder structure.
Technique: Texas rig, slow drag.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 12lb fluorocarbon.
Structure: Gravel flats in coves adjacent to boulders, 2–5 feet.
Water temp: 66°F.

Pattern: Wacky rig near granite rock structure.
Technique: Wacky rig, slow sink.
Bait: Yamamoto Senko 5", watermelon, 1/0 wacky hook.
Structure: Rocky spawning flats, 2–4 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Recovery on first deeper rock structure off spawning areas.
Technique: Football jig, slow drag.
Bait: 1/2oz football jig, green pumpkin, 4" Zoom Super Chunk trailer, 15lb fluorocarbon.
Structure: Rocky points and ledges, 10–16 feet.
Water temp: 74°F.

SUMMER (water 82–90°F, June–September):
Pattern: Main lake rocky points — largemouth holding in shade of boulders.
Technique: Football jig, slow drag between boulders.
Bait: 3/4oz football jig, green pumpkin/black, Rage Craw trailer, 17lb fluorocarbon.
Structure: Granite boulder fields, 12–20 feet.
Water temp: 87°F.

Pattern: Topwater at dawn over rocky flats.
Technique: Walking topwater.
Bait: Heddon Super Spook Jr., chrome/black, walked parallel to rocky banks.
Structure: Rocky main lake banks, 2–5 feet.
Time of day: Dawn.

Pattern: Drop shot on deeper granite structure.
Technique: Drop shot, shaken.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep granite points, 18–25 feet.

FALL (water 62–74°F, September–November):
Pattern: Schooling bass on main lake over shad schools.
Technique: Swimbait, matched to shad.
Bait: Keitech Swing Impact Fat 3.8", sexy shad, 3/8oz round head.
Structure: Open main lake over shad schools.
Water temp: 67°F.

Pattern: Jig on rocky points as temperatures drop.
Technique: Casting jig, slow hop.
Bait: Booyah Boo Jig 1/2oz, green pumpkin/orange, Rage Craw trailer.
Structure: Rocky main lake points, 8–14 feet.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake granite structure.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep rocky points and channel drops, 16–24 feet.
Water temp: 47°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Lawtonka OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Tom Steed Reservoir ──────────────────────────────────────────────────
  {
    lake_name: 'Tom Steed Reservoir', state: 'OK', source_type: 'article',
    raw_text: `Tom Steed Reservoir, Oklahoma — Bass Fishing Patterns and Techniques

Tom Steed Reservoir is a 5,000-acre Army Corps reservoir on Lugert-Altus Reservoir / North Fork of Red River in Kiowa County, southwestern Oklahoma, near Mountain Park. Remote, lightly fished lake. Clear to slightly stained water. Features rocky banks, main lake points, some submerged timber in upper arms, and sandy flats in coves. Largemouth bass primary. Western Oklahoma's best kept bass secret — low pressure, quality fish. Influenced by sandy/rocky transition typical of SW Oklahoma.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging on rocky main lake points.
Technique: Jerkbait, pause-and-twitch.
Bait: Rapala X-Rap 10, shad, 10lb fluorocarbon, 2-second pause.
Structure: Main lake rocky points, 6–12 feet.
Water clarity: Clear to stained. Water temp: 58°F.

Pattern: Squarebill on rocky banks.
Technique: Squarebill crankbait.
Bait: Strike King KVD 1.5, sexy shad.
Structure: Rocky chunk rock banks, 3–6 feet.

Pattern: Spinnerbait on wind-blown sandy points.
Technique: Spinnerbait, slow roll.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, willowleaf blades.
Structure: Sandy/rocky transition points, 3–7 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–May):
Pattern: Spawning on sandy/gravel coves.
Technique: Texas rig, slow drag.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 12lb fluorocarbon.
Structure: Sandy flats and coves, 2–5 feet.
Water temp: 65°F.

Pattern: Wacky rig on spawning flats.
Technique: Wacky rig, slow sink.
Bait: Yamamoto Senko 5", green pumpkin, 1/0 wacky hook.
Structure: Sandy spawning flats, 2–4 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Football jig on deeper points.
Technique: Football jig, slow crawl.
Bait: 1/2oz football jig, green pumpkin, Zoom Super Chunk trailer, 15lb fluorocarbon.
Structure: Rocky points, 10–16 feet.
Water temp: 73°F.

SUMMER (water 82–90°F, June–September):
Pattern: Deep main lake points and rocky ledges.
Technique: Football jig, slow drag.
Bait: 3/4oz football jig, green pumpkin/black, Rage Craw trailer, 17lb fluorocarbon.
Structure: Main lake rocky points, ledges, 14–22 feet.
Water temp: 87°F.

Pattern: Early morning topwater.
Technique: Walking topwater.
Bait: Heddon Super Spook, chrome/blue, walked over points.
Structure: Main lake points, 2–5 feet.
Time of day: Dawn.

Pattern: Drop shot on deeper rocky structure.
Technique: Drop shot, shaken.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep rocky points, 16–24 feet.

FALL (water 62–72°F, September–November):
Pattern: Lipless crankbait on main lake flats.
Technique: Lipless crankbait, burn-and-kill.
Bait: Strike King Red Eye Shad 1/2oz, chrome/blue.
Structure: Main lake flats, points, 4–10 feet.
Water temp: 67°F.

Pattern: Jig on rocky main lake points.
Technique: Casting jig, slow hop.
Bait: Booyah Boo Jig 1/2oz, green pumpkin, Rage Craw trailer.
Structure: Rocky points, 8–14 feet.

WINTER (water 42–52°F, December–February):
Pattern: Deep main lake structure, slow finesse.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep main lake points, 16–24 feet.
Water temp: 46°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Tom Steed Reservoir OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Carl Blackwell ──────────────────────────────────────────────────
  {
    lake_name: 'Lake Carl Blackwell', state: 'OK', source_type: 'article',
    raw_text: `Lake Carl Blackwell, Oklahoma — Bass Fishing Patterns and Techniques

Lake Carl Blackwell is a 3,370-acre reservoir on Stillwater Creek in Payne County, central Oklahoma, owned by Oklahoma State University, near Stillwater. Moderately stained water, wind-prone with a large open main lake area. Features shallow flats, main lake points, riprap on dam, submerged brush and timber, docks, and some rocky banks. Largemouth bass primary. A popular Oklahoma State University and Stillwater-area tournament destination. Fished hard by OSU bass club year-round. Responds well to power fishing in stained conditions.

SPRING PRE-SPAWN (water 54–62°F, March–April):
Pattern: Largemouth staging on main lake points and riprap.
Technique: Spinnerbait, slow roll.
Bait: Strike King Premier Pro-Model 1/2oz, chartreuse/white, tandem willowleaf, 17lb fluorocarbon.
Structure: Main lake points, dam riprap, 4–8 feet.
Water clarity: Stained. Water temp: 58°F.
Notes: Stained water all year — chartreuse and white are reliable year-round colors.

Pattern: Squarebill on riprap and rocky banks.
Technique: Squarebill crankbait, deflection retrieve.
Bait: Strike King KVD 1.5, chartreuse shad.
Structure: Riprap, rocky main lake banks, 3–6 feet.

Pattern: Jig on brush and main lake points.
Technique: Casting jig, lift-fall.
Bait: Booyah Boo Jig 1/2oz, black/blue, 4" Rage Craw trailer.
Structure: Brush piles and main lake points, 6–12 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–May):
Pattern: Spawning in shallow brush and coves.
Technique: Texas rig, slow drag and deadstick.
Bait: Zoom Brush Hog 4", watermelon/red, 3/16oz weight, 15lb fluorocarbon.
Structure: Shallow brush, coves with soft bottom, 2–5 feet.
Water temp: 65°F. Water clarity: Stained.

Pattern: Swim jig through shallow brush.
Technique: Swim jig, steady retrieve.
Bait: Z-Man/Evergreen Jack Hammer 3/8oz, white, paddle tail trailer.
Structure: Submerged brush, 3–6 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Post-spawn bass on main lake points in 10–18 feet.
Technique: Carolina rig, slow drag.
Bait: Zoom Speed Craw 3.5", watermelon red, 3/4oz Carolina weight, 3-foot 17lb leader.
Structure: Main lake points, 10–18 feet.
Water temp: 73°F.

SUMMER (water 82–88°F, June–September):
Pattern: Deep brush piles and channel edges.
Technique: Football jig, slow drag.
Bait: Strike King Tour Grade Football Jig 1/2oz, green pumpkin, Rage Craw trailer.
Structure: Deep brush piles, channel edges, 12–20 feet.
Water temp: 86°F.

Pattern: Early morning topwater on main lake flats.
Technique: Walking topwater.
Bait: Heddon Super Spook Jr., bone, walked over main lake flats.
Structure: Open main lake, 2–5 feet.
Time of day: Dawn.

Pattern: Drop shot on deeper structure.
Technique: Drop shot, shaken in place.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep brush, 12–20 feet.

FALL (water 62–74°F, September–November):
Pattern: Shad migration — schooling action on main lake.
Technique: Lipless crankbait, burning retrieve.
Bait: Rat-L-Trap 1/2oz, chartreuse/black, burned over flats.
Structure: Main lake flats, creek arm mouths, 4–8 feet.
Water temp: 66°F. Water clarity: Stained.

Pattern: Spinnerbait on wind-blown banks.
Technique: Spinnerbait, medium retrieve.
Bait: Booyah Blade 1/2oz, white, willowleaf.
Structure: Wind-blown banks, 3–7 feet.

WINTER (water 42–52°F, December–February):
Pattern: Deep brush and channel structure.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, oxblood red, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep brush, channel, 12–18 feet.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake Carl Blackwell OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake Skiatook ────────────────────────────────────────────────────────
  {
    lake_name: 'Skiatook Lake', state: 'OK', source_type: 'article',
    raw_text: `Skiatook Lake, Oklahoma — Bass Fishing Patterns and Techniques

Skiatook Lake is a 10,940-acre Army Corps reservoir on Hominy Creek in Osage County, northeastern Oklahoma, near Skiatook (north of Tulsa). Features rocky points, chunk rock banks, main lake humps, submerged timber in creek arms, docks, and flats. Water is moderately stained to clear depending on season. Largemouth and spotted bass both present. A popular Tulsa-area tournament destination fished by multiple bass clubs year-round. Responds well to power fishing in spring and fall.

SPRING PRE-SPAWN (water 54–63°F, March–April):
Pattern: Largemouth staging on main lake rocky points.
Technique: Jig, slow lift-fall.
Bait: Booyah Boo Jig 1/2oz, green pumpkin/orange, Zoom Super Chunk trailer.
Structure: Main lake rocky points, 8–14 feet.
Water clarity: Stained. Water temp: 58°F.

Pattern: Spotted bass on rocky main lake banks.
Technique: Jerkbait, pause-and-twitch.
Bait: Rapala X-Rap 10, shad, 10lb fluorocarbon.
Structure: Rocky main lake banks, 6–12 feet.

Pattern: Squarebill on chunk rock.
Technique: Squarebill crankbait, deflect off rock.
Bait: Strike King KVD 1.5, sexy shad, 14lb fluorocarbon.
Structure: Chunk rock banks and points, 3–6 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, April–May):
Pattern: Largemouth bedding in protected coves with sandy/gravel bottom.
Technique: Texas rig, deadstick.
Bait: Zoom Trick Worm 6", junebug, 3/16oz weight, 15lb fluorocarbon.
Structure: Spawning flats in creek arms, 2–5 feet.
Water temp: 65°F.

Pattern: Spotted bass bedding on rocky gravel shelves.
Technique: Drop shot, shaken over beds.
Bait: Roboworm 4.5" Straight Tail, red shad, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Rocky gravel shelves on main lake, 4–7 feet.

POST-SPAWN (water 70–78°F, May–June):
Pattern: Main lake rocky points in 10–18 feet — post-spawn.
Technique: Football jig, slow drag.
Bait: 1/2oz football jig, green pumpkin, 4" Zoom Super Chunk trailer, 15lb fluorocarbon.
Structure: Rocky main lake points, 10–18 feet.
Water temp: 74°F.

SUMMER (water 82–88°F, June–September):
Pattern: Deeper main lake humps and points with spotted bass.
Technique: Football jig, slow drag.
Bait: 3/4oz football jig, green pumpkin/black, Rage Craw trailer, 17lb fluorocarbon.
Structure: Offshore humps, main lake points, 16–25 feet.
Water temp: 86°F.

Pattern: Early morning topwater on main lake.
Technique: Walking topwater.
Bait: Heddon Super Spook, chrome/blue, walked along rocky banks.
Structure: Rocky main lake banks, 2–6 feet.
Time of day: Dawn.

Pattern: Drop shot suspended fish on bluff ends.
Technique: Drop shot, shaken.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Bluff ends and deep points, 18–28 feet.

FALL (water 62–74°F, September–November):
Pattern: Schooling bass on main lake following shad.
Technique: Swimbait, matched to shad size.
Bait: Keitech Swing Impact Fat 3.8", ayu, 3/8oz round head.
Structure: Open main lake over shad schools.
Water temp: 67°F.

Pattern: Lipless on main lake flats.
Technique: Lipless crankbait, burn-and-kill.
Bait: Strike King Red Eye Shad 1/2oz, chrome/blue.
Structure: Main lake flats, 4–10 feet.

WINTER (water 44–52°F, December–February):
Pattern: Deep main lake rocky points and humps.
Technique: Drop shot, dead-sticked.
Bait: Roboworm 4.5" Straight Tail, morning dawn, 3/16oz drop shot, 8lb fluorocarbon.
Structure: Deep rocky points, offshore humps, 18–26 feet.
Water temp: 47°F.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Skiatook Lake OK — rich tournament-pattern knowledge base v2',
  },

  // ─── Lake B.A. Steinhagen (TX) ────────────────────────────────────────────
  {
    lake_name: 'Lake B.A. Steinhagen', state: 'TX', source_type: 'article',
    raw_text: `Lake B.A. Steinhagen, Texas — Bass Fishing Tournament Patterns and Techniques

Lake B.A. Steinhagen (Dam B Lake) is a 13,700-acre Army Corps reservoir on the Neches and Angelina rivers in Jasper and Tyler counties, deep East Texas, near Jasper. A very shallow (average 4–6 feet), heavily timbered blackwater lake with stained to dark water. Features extensive standing timber throughout the lake, submerged logs, flooded timber flats, creek channel drops (only meaningful depth), lily pads and aquatic vegetation in coves, and limited hard structure. Largemouth bass are the primary and near-exclusive target. Classic East Texas timber lake — heavy braid required, 65lb minimum for flipping. One of East Texas's most underrated big-bass lakes due to lower fishing pressure than Sam Rayburn and Toledo Bend.

SPRING PRE-SPAWN (water 55–63°F, February–March):
Pattern: Largemouth staging on main creek channel drops adjacent to timber flats.
Technique: Swim jig, slow roll through timber.
Bait: Strike King Tour Grade Swim Jig 1/2oz, black/blue, 4.5" Rage Swimmer trailer, 65lb braid.
Structure: Timber on channel drops, 6–12 feet.
Water clarity: Stained/dark. Water temp: 58°F.
Notes: East TX bass move very early — pre-spawn by late February in warm years.

Pattern: Jig in timber on main lake points.
Technique: Punch rig/heavy Texas rig, flip into timber.
Bait: Zoom Brush Hog 4", black/blue, 1.5oz tungsten, 65lb braid.
Structure: Standing timber, laydowns, 4–8 feet.

Pattern: Spinnerbait on timber edges.
Technique: Spinnerbait, slow roll parallel to timber.
Bait: Strike King Premier Pro-Model 1/2oz, white/chartreuse, Colorado/willowleaf.
Structure: Timber edges, 3–7 feet.
Water temp: 60°F.

SPAWN (water 63–70°F, March–April):
Pattern: Bedding largemouth in very shallow timber and aquatic vegetation.
Technique: Frog, walked over mats and through timber.
Bait: SPRO Bronzeye Frog 65, black, walked over pads and mat edges.
Structure: Lily pads, aquatic mats, shallow timber, 1–3 feet.
Water temp: 66°F. Water clarity: Dark/stained.

Pattern: Flipping Texas rig to spawn beds in timber.
Technique: Flipping/pitching Texas rig, deadstick.
Bait: Zoom Brush Hog 4", watermelon/red, 1oz tungsten, 65lb braid, 5/0 hook.
Structure: Timber base on flat bottom, 2–5 feet.

Pattern: Swim jig through timber on spawning flats.
Technique: Swim jig, slow retrieve with pauses at timber.
Bait: 1/2oz swim jig, black/blue, craw trailer, 50lb braid.
Structure: Timber flats, 3–6 feet.

POST-SPAWN (water 70–78°F, April–May):
Pattern: Post-spawn females retreating to timber near channel drops.
Technique: Texas rig, slow drag.
Bait: Zoom Brush Hog 4", watermelon/red, 3/4oz weight, 50lb braid.
Structure: Timber on channel edges, 6–10 feet.
Water temp: 74°F.

Pattern: Frog in pads and mats as vegetation grows.
Technique: Hollow body frog, walk-the-dog over mats.
Bait: SPRO Bronzeye Frog 65, black, walked over surface mats and pads.
Structure: Lily pad fields, aquatic vegetation, 1–3 feet.

SUMMER (water 82–90°F, May–September):
Pattern: Frog bite over mat and pad fields — best technique in summer.
Technique: Hollow body frog, walked methodically over mats.
Bait: SPRO Bronzeye Frog 65, black, and natural/olive pattern.
Structure: Lily pad fields, hydrilla mats, floating vegetation, 1–4 feet.
Water temp: 87°F.
Notes: The frog bite is the primary summer pattern on this lake. Dense vegetation covers much of the lake by July.

Pattern: Punching through matted vegetation.
Technique: Punch rig, drop through mats.
Bait: Zoom Brush Hog 4", black/blue, 2oz tungsten, 65lb braid.
Structure: Matted vegetation (hydrilla, lily pads), 2–4 feet.

Pattern: Flipping standing timber in shade of canopy.
Technique: Flipping heavy Texas rig.
Bait: Zoom Super Chunk 4", black/blue, 1oz tungsten, 65lb braid.
Structure: Standing timber in canopy shade, 3–7 feet.

Pattern: Deep channel drops for heat-stressed fish midday.
Technique: Carolina rig, slow drag on channel bottom.
Bait: Zoom Speed Craw 3.5", watermelon red, 1oz Carolina, 20lb fluorocarbon leader.
Structure: Main Neosho/Angelina river channel drops, 8–14 feet.
Water temp: 88°F.

FALL (water 65–76°F, September–November):
Pattern: Shad pushes bass to timber edges and creek mouths.
Technique: Lipless crankbait, snapped through timber.
Bait: Strike King Red Eye Shad 3/4oz, gold/black, 50lb braid, snapped through open timber.
Structure: Timber edges on creek mouths, 4–8 feet.
Water temp: 70°F. Water clarity: Stained.

Pattern: Swim jig through fall timber.
Technique: Swim jig, moderate retrieve.
Bait: Strike King Tour Grade Swim Jig 1/2oz, white, 4.5" paddle tail trailer.
Structure: Timber flats, 4–8 feet.

Pattern: Topwater in open timber pockets in early morning.
Technique: Popping frog/topwater.
Bait: Rebel Pop-R, shad, popped through timber pockets.
Structure: Open water pockets in timber, 2–4 feet.
Time of day: Dawn.

WINTER (water 46–56°F, December–February):
Pattern: Channel drops as bass pull off flats.
Technique: Jig, slow lift-fall near timber on channel edge.
Bait: Booyah Boo Jig 1/2oz, black/blue, Zoom Super Chunk trailer.
Structure: Timber on channel drops, 8–14 feet.
Water temp: 50°F.

Pattern: Blade bait, vertical jigging over channel.
Technique: Blade bait, jigged vertically.
Bait: Silver Buddy 1/2oz, silver, jigged over channel at 10–14 feet.
Structure: Main channel drops.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Lake B.A. Steinhagen TX — rich tournament-pattern knowledge base',
  },

]

async function main() {
  console.log(`\n🎣 Seeding ${SOURCES.length} rich knowledge bases into ingest_queue...\n`)

  // Get ALL existing raw_text entries (no URL) by lake name to avoid dupes
  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('lake_name, url, notes')

  // Count existing rawText entries per lake
  const existingRawByLake = new Map<string, number>()
  for (const row of existing ?? []) {
    if (!row.url) {
      existingRawByLake.set(row.lake_name, (existingRawByLake.get(row.lake_name) ?? 0) + 1)
    }
  }

  let inserted = 0, skipped = 0

  for (const source of SOURCES) {
    // Allow up to 2 rawText entries per lake (original + this v2 enrichment)
    const existingCount = existingRawByLake.get(source.lake_name) ?? 0
    if (!source.url && existingCount >= 2) {
      console.log(`  ⏭  ${source.lake_name} — already has ${existingCount} rawText entries, skipping`)
      skipped++
      continue
    }

    const { error } = await supabase.from('ingest_queue').insert({
      lake_name:     source.lake_name,
      state:         source.state,
      source_type:   source.source_type,
      url:           source.url ?? null,
      raw_text:      source.raw_text ?? null,
      organization:  source.organization ?? null,
      reported_date: source.reported_date ?? null,
      notes:         source.notes,
    })

    if (error) {
      console.error(`  ❌ ${source.lake_name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${source.lake_name} (${source.state}) — ${source.url ? source.url.slice(0, 60) : 'rawText v2'}`)
      inserted++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped`)
  console.log('\nRun the ingest pipeline to process new queue items:')
  console.log('  npx tsx scripts/ingestion/run-queue.ts\n')
}

main().catch(console.error)
