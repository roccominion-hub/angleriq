/**
 * AnglerIQ — Seed TX Ingest Queue
 * Populates ingest_queue with curated rawText knowledge bases for major Texas bass lakes.
 * Skips any rawText entry whose lake_name already exists in the queue.
 *
 * Usage: npx tsx scripts/ingestion/seed-tx-queue.ts
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

  // ─── Lake Fork ────────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Fork', state: 'TX', source_type: 'article',
    raw_text: `Lake Fork — Texas Bass Fishing Guide

Lake Fork is a 27,264-acre reservoir on the Sabine River in East Texas near Quitman. Widely regarded as the premier big-bass lake in the United States, having produced more Texas ShareLunkers (fish over 8 pounds entered in the state program) than any other body of water. Water is typically stained to slightly muddy, with abundant submerged timber, laydowns, brush piles, and hydrilla in warmer months.

KEY PATTERNS:
- Spring (Feb–Apr): Peak season. Prespawn fish stack in 4–12 feet near timber and brush on secondary points and creek arms. Big swimbaits (5–8 inch paddle tails on 1–2oz heads, Deps Slide Swimmer, Megabass Magdraft) draw reaction strikes from the biggest fish. Texas-rigged big plastics (10-inch ribbon-tail worms, 7–8 inch lizards, creature baits — junebug, plum, green pumpkin/black) flipped and pitched to timber. Spawners on shallow flats in 2–5 feet — target sandy pockets with timber edges using jigs (3/8–1/2oz black/blue or green pumpkin) and punching rigs near mat edges where available.
- Summer: Bass move to offshore ledges and main lake structure in 15–25 feet. Deep-diving crankbaits (Strike King 6XD, 10XD — chartreuse shad, sexy shad) on channel swings and ledges. Carolina rigs (3/4oz weight, 18-inch leader, big creature bait) on main lake humps and channel drops. Punching mats with heavy tungsten (1–2oz) and beaver-style baits in black/blue when hydrilla mats form. Early morning topwater (Whopper Plopper, Spook Jr.) near timber before sun gets high.
- Fall: Shad migration pulls bass shallow. Lipless crankbaits (Strike King Red Eye Shad chrome/blue, 3/4oz), big swimbaits, spinnerbaits (1/2oz white double willow) following shad pods into creek arms. Topwater walking baits at dawn on main lake flats.
- Winter: Slow down with finesse and reaction baits. Blade baits (Heddon Sonar, 1/2oz chrome) vertically jigged on main lake points 20–35 feet. Football jigs (1oz green pumpkin) crawled slowly on hard-bottom ledges. Drop shot with large Roboworm (7 inch, morning dawn) on channel edges.

KEY STRUCTURES: Submerged timber throughout the entire lake (defining feature — vast flooded forest), main lake points and secondary points, creek arm channels (Caney, South Sulphur), main lake ledges and humps, hydrilla beds (mid-lake flats in summer), spawning sand flats near timber, brush piles (natural and artificial).

TOP BAITS: 10-inch ribbon tail worm (junebug, plum — 5/0 EWG, 3/4oz tungsten), big swimbait on heavy jighead (white shad, 2oz — Deps, Megabass, Keitech 6.8 on 2oz head), punching rig (black/blue 1.5–2oz tungsten, Zoom Speed Craw or Reaction Strike Twin Turbo Beaver), football jig (green pumpkin/brown 3/4–1oz with craw trailer), 10XD crankbait (chartreuse shad, sexy shad), blade bait (chrome Heddon Sonar 1/2oz), Carolina rig (3/4oz egg sinker, 18-inch fluorocarbon, big lizard or creature bait).

NOTES: ShareLunker program (TPWD) runs Jan–March — fish over 8 pounds can be registered. Best big-bass lake in the US by any metric. Timber defines virtually every pattern. Guides extremely active Feb–April — book early. Extremely high boat traffic on weekends during spring. Upper lake (Caney Creek arm) often dirtier water and better for punching; lower lake holds more ledge structure. Monster swimbaits are the signature big-fish tool that separates Fork from other lakes.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Fork TX knowledge base',
  },

  // ─── Sam Rayburn Reservoir ────────────────────────────────────────────────
  {
    lake_name: 'Sam Rayburn Reservoir', state: 'TX', source_type: 'article',
    raw_text: `Sam Rayburn Reservoir — Texas Bass Fishing Guide

Sam Rayburn Reservoir (SRA) is a 114,500-acre impoundment on the Angelina River in East Texas near Jasper — one of the largest reservoirs in Texas and among the most productive bass fisheries in the South. Stained to slightly muddy water typical. Massive hydrilla fields dominate mid-lake and creek arms in summer. Big bass history with numerous 10-pound-plus fish reported annually. Annual Bassmaster Opens event.

KEY PATTERNS:
- Spring (Feb–Apr): Prespawn and spawn on shallow grass edges, timber flats, and sand-gravel pockets in 2–8 feet. Hollow-body frogs (black/blue, white — Spro, BOOYAH Pad Crasher) over early hydrilla and laydowns. Swim jigs (3/8oz white shad or black/blue) along grass edges. Flipping and pitching Texas-rigged big plastics (creature baits, craw-style baits — green pumpkin/black, black/blue — 4/0–5/0 EWG, 1/2oz tungsten) to timber and mat edges. Spinnerbaits (1/2oz chartreuse/white double willow) on wind-blown flats near grass.
- Summer: Hydrilla mats become the dominant pattern. Punching rigs (1.5–2oz heavy tungsten, black/blue or watermelon red beaver/craw bait) through thick mats on main lake and creek arms. Frog fishing (white and black/blue hollow body) over mat surface early morning and late evening. Ledge fishing simultaneously productive — deep-diving crankbaits (6XD, 10XD — sexy shad), Carolina rigs with creature baits, and football jigs (3/4oz green pumpkin) on main lake channel swings in 18–28 feet.
- Fall: Bass scatter following shad to creek arm mouths and main lake points. Lipless crankbaits (3/4oz chrome/blue Red Eye Shad, sexy shad), swimbaits on jigheads, spinnerbaits and topwater walking baits on schooling fish. Grass edges remain productive with swim jigs.
- Winter: Offshore main lake structure — football jigs, Carolina rigs, blade baits vertically on deep points in 20–35 feet. Drop shot for finesse bite when cold fronts push fish tight to bottom.

KEY STRUCTURES: Hydrilla mats (defining summer pattern — vast mid-lake coverage), main lake creek arms (Caney, Powell, Sandy, Hanks), timber and laydowns throughout, main lake ledges and channel swings, spawning sand flats near timber and grass, submerged points, main lake humps.

TOP BAITS: Punch rig (black/blue 1.5–2oz tungsten, Zoom Z-Craw or Reaction Strike Twin Turbo Beaver), hollow-body frog (black/blue, white — Spro Bronze Eye Frog), swim jig (white shad 3/8oz, black/blue 3/8oz with craw trailer), 10XD crankbait (sexy shad, chartreuse shad), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue 3/4oz), spinnerbait (chartreuse/white double willow 1/2oz), Texas rig creature bait (green pumpkin, black/blue — 5/0 EWG, 3/4oz tungsten).

NOTES: One of Texas's true destination bass lakes. Hydrilla conditions change seasonally — check TPWD vegetation maps. Punch fishing and frog fishing are the signature summer techniques. Ledge fishing on the main lake channel simultaneously produces big bags and keeps anglers on fish when mats are not yet formed or after they are treated. Known for producing tournament-winning weights in the 25-pound-plus range. Heavy recreational traffic on summer weekends; early morning best.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Sam Rayburn Reservoir TX knowledge base',
  },

  // ─── Toledo Bend Reservoir ────────────────────────────────────────────────
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'article',
    raw_text: `Toledo Bend Reservoir — Texas Bass Fishing Guide

Toledo Bend Reservoir straddles the Texas-Louisiana border on the Sabine River, covering approximately 185,000 acres — the largest reservoir in the southern United States and one of the top bass fisheries in North America. Water is typically stained to slightly muddy. Massive timber stands throughout, stumps, and secondary timber define the structure. Annual B.A.S.S. Elite Series event in February draws the best anglers in the world.

KEY PATTERNS:
- Spring/Spawn (Feb–Apr): February is the peak tournament month — bass move onto spawning beds on sandy gravel banks, stump fields, and shallow timber flats. Swim jig (3/8–1/2oz white shad or sexy shad with paddle tail trailer) is the signature February bait — cast to stumps and timber, slow-roll through 2–5 feet. Spinnerbaits (chartreuse/white 1/2oz double willow) on flat banks. Texas-rigged plastics (lizards, stick worms — watermelon/red, June bug) to spawning fish on visible beds. Jigs (3/8oz green pumpkin/brown) around timber bases. Reaction baits dominate when water is stained — rattling squarebills around stumps and wood.
- Summer: Deep ledge fishing on main river channel in 20–30 feet. Football jigs (1oz green pumpkin), Carolina rigs with big craw or creature bait, and deep-diving crankbaits (Strike King 6XD, 10XD — sexy shad, shad colors). Schooling fish on main lake humps and channel swings. Punching available where hydrilla mats form mid-lake.
- Fall: Shad migration draws bass to points, channel mouths, and timber flats. Lipless crankbaits (Red Eye Shad chrome/blue 3/4oz), swimbaits, spinnerbaits, and topwater walking baits on schooling fish. Swim jig along timber edges remains productive.
- Winter: Very slow — blade baits and jigging spoons on deep main river channel in 25–40 feet. Football jigs crawled slowly on deep timber stumps. Drop shot with large soft plastic on channel edges.

KEY STRUCTURES: Submerged timber and stump fields throughout (defining structure), main Sabine River channel and secondary channels, sandy gravel spawning banks and stump flats (2–5 feet), creek arm points, main lake ledges and humps, timber-lined creek arm channels.

TOP BAITS: Swim jig (white shad 3/8–1/2oz, sexy shad — Z-Man Streakz trailer), spinnerbait (chartreuse/white double willow 1/2oz), squarebill crankbait (Strike King KVD 1.5 — sexy shad, chartreuse), football jig (green pumpkin 3/4–1oz with craw trailer), 6XD crankbait (sexy shad), Texas rig lizard (watermelon/red, June bug — 4/0 EWG, 1/2oz tungsten), blade bait (chrome Heddon Sonar 1/2oz), hollow-body frog (black/blue).

NOTES: February B.A.S.S. Elite event puts the world's best on this lake annually — study the top-lure slideshows for exact bait selections. Swim jig fishing around timber in spring is the defining pattern that separates skilled Toledo Bend anglers. Stained water rewards reaction baits over finesse. Fishing pressure highest in tournament season (Feb–Apr) and fall. Louisiana side of the lake accessible but regulations differ — carry appropriate licenses for both states.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Toledo Bend Reservoir TX knowledge base',
  },

  // ─── Lake Palestine ───────────────────────────────────────────────────────
  {
    lake_name: 'Lake Palestine', state: 'TX', source_type: 'article',
    raw_text: `Lake Palestine — Texas Bass Fishing Guide

Lake Palestine is a 25,560-acre reservoir on the Neches River in East Texas near Tyler. One of East Texas's most popular tournament lakes. Water is typically stained, ranging from light tea color to murky after rains. Features abundant timber and brush throughout, main lake points, creek arms, and some grass. Strong largemouth bass population with quality fish in the 4–7 pound range common.

KEY PATTERNS:
- Spring (Feb–Apr): Prespawn fish stack on secondary points with timber and brush in 5–12 feet. Flipping and pitching Texas-rigged plastics (creature baits, craws — green pumpkin/black, black/blue — 5/0 EWG, 1/2–3/4oz tungsten) to wood. Swim jigs (white shad 3/8oz) along timber edges. Spinnerbaits (chartreuse/white 1/2oz double willow) on flat, wind-blown banks near brush. Spawn in 2–5 feet on sandy pockets — jigs and Texas rigs.
- Summer: Move offshore to main lake humps, channel swings, and deep brush piles in 15–25 feet. Football jigs (green pumpkin 3/4oz), Carolina rigs (creature baits on hard-bottom transitions), and deep-diving crankbaits (6XD, sexy shad). Dock fishing effective in summer — swim jigs and drop shots under floating docks in shade.
- Fall: Schooling largemouth on main lake points and creek arm mouths following shad. Lipless crankbaits (Red Eye Shad chrome/blue), swimbaits, and topwater walking baits on schooling fish. Brush piles in 10–15 feet productive with swim jigs and jigs.
- Winter: Deep brush piles and channel edges — drop shot, shakey head (green pumpkin), blade bait on main lake structure in 20–30 feet.

KEY STRUCTURES: Timber and brush throughout (defining structure), main lake points with brush, creek arms (Flat, Kickapoo, Mossy), main river channel, spawning sandy pockets near wood, deep brush piles, boat docks.

TOP BAITS: Texas rig creature bait (green pumpkin, black/blue — 5/0 EWG, 3/4oz tungsten), swim jig (white shad 3/8oz with paddle tail), spinnerbait (chartreuse/white 1/2oz), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue), 6XD crankbait (sexy shad), shakey head (green pumpkin 3/16–1/4oz), drop shot (Roboworm morning dawn or green pumpkin).

NOTES: Strong local tournament circuit throughout the year. Timber fishing is central to virtually every pattern. Big bag potential in spring during prespawn — 20-pound limits reported in top tournaments. Guide services available for out-of-town anglers. Tyler-area metro proximity means pressure is moderate year-round with peaks in spring and fall.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Palestine TX knowledge base',
  },

  // ─── Lake Texoma ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Texoma', state: 'TX', source_type: 'article',
    raw_text: `Lake Texoma — Texas Bass Fishing Guide

Lake Texoma spans the Texas-Oklahoma border on the Red River, covering approximately 89,000 acres. One of the most unique reservoirs in the region due to its slightly saline water (from salt springs feeding the Red River), which supports a diverse fish community including largemouth, smallmouth, spotted bass, and a world-class striper (striped bass) fishery. Water clarity ranges from clear to slightly stained depending on location. Rocky structure, points, riprap, and bluffs dominate the lower lake; upper lake is muddier with timber and flats.

KEY PATTERNS:
- Spring (Mar–May): Bass spawn on rocky banks, riprap, and gravel points in 3–10 feet. Largemouth in coves with timber near points; smallmouth on chunk rock banks and bluff ends; spotted bass on main lake rocky structure. Jerkbaits (Megabass Vision 110, Lucky Craft Pointer — natural shad, ghost) effective on points and transitions. Spinnerbaits (chartreuse/white) for largemouth in stained upper lake. Ned rigs and drop shots for smallmouth and spotted bass on rock. Squarebills along riprap banks.
- Summer: Bass move to deeper rocky structure and main lake ledges in 15–30 feet. Drop shot dominant for spotted and smallmouth (Roboworm Aaron's Magic, green pumpkin). Football jigs on rocky humps. Deep-diving crankbaits on ledges. Morning topwater on rocky main lake points with schooling fish. Be aware of striper schools — bass often follow underneath.
- Fall: All three species active on main lake rocky points as water cools. Schooling visible on surface — topwater walking baits, swimbaits, jerkbaits on visible schools. Lipless crankbaits on rock and grass edges. One of the best fall bites in North Texas.
- Winter: Blade baits and jigging spoons vertically on main lake rocky humps and bluff ends in 20–40 feet. Drop shot with natural-colored plastics on cold, clear water.

KEY STRUCTURES: Rocky main lake points (dominant), riprap dams and causeways, chunk rock banks and bluff ends, main river channel, upper lake timber and flats, coves with gravel and rock, main lake humps.

TOP BAITS: Drop shot Roboworm (Aaron's Magic, green pumpkin, margarita mutilator — 3/16oz), Ned rig (green pumpkin, oxblood), jerkbait (Megabass Vision 110 — ghost, natural shad), squarebill (sexy shad, natural shad), spinnerbait (chartreuse/white 1/2oz), football jig (green pumpkin 3/4oz), topwater walking bait (chrome/black), blade bait (chrome 1/2oz).

NOTES: Must carry both Texas and Oklahoma fishing licenses when fishing Texoma — enforcement is active. Striper fishery is world-class and attracts heavy guide traffic — share water respectfully. Bass anglers often find better bite in rocky lower lake (Texas side near Denison Dam) rather than muddy upper arms. Smallmouth and spotted bass prefer clear water rocky structure; largemouth in stained upper sections. Spring rock fishing and fall schooling are the premier bass experiences on Texoma.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Texoma TX knowledge base',
  },

  // ─── Lake Tawakoni ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Tawakoni', state: 'TX', source_type: 'article',
    raw_text: `Lake Tawakoni — Texas Bass Fishing Guide

Lake Tawakoni is a 36,700-acre reservoir on the Sabine River in Northeast Texas near Wills Point, east of Dallas. One of the most productive largemouth bass lakes in the Dallas-Fort Worth region. Water is typically stained. Features a mix of grass (hydrilla and milfoil when present), timber and wood structure in creek arms, main lake points, and boat docks. Strong largemouth population with quality 4–7 pound fish common and occasional giants.

KEY PATTERNS:
- Spring (Mar–May): Prespawn fish stage on points and creek arm structure near grass and wood in 4–10 feet. Swim jigs (white shad, black/blue — 3/8oz) along grass edges and over timber. Spinnerbaits (chartreuse/white 1/2oz) on flat banks with wind. Texas-rigged plastics (creature baits, big worms — watermelon/red, junebug — 5/0 EWG, 1/2oz tungsten) flipped to wood and dock pilings. Spawn in 2–5 feet on grass edges and sandy pockets.
- Summer: Punch fishing and frog fishing on hydrilla mats where present — heavy tungsten (1–1.5oz) with beaver-style bait (black/blue, watermelon red). Early morning frog (black/blue, white) over mat surface. Dock fishing with drop shots, finesse jigs, and swim jigs. Main lake offshore humps with football jigs and Carolina rigs in 18–25 feet.
- Fall: Outstanding schooling bite as shad migrate to creek arm mouths and main lake points. Lipless crankbaits (Red Eye Shad chrome/blue 3/4oz), swimbaits, topwater walking baits on visible schools. Swim jigs and spinnerbaits along grass edges. One of the best fall bites in NE Texas.
- Winter: Main lake points and channel edges — drop shot (Roboworm, green pumpkin), shakey head, blade bait in 20–30 feet.

KEY STRUCTURES: Grass beds (hydrilla/milfoil — check TPWD for coverage), timber and wood in creek arms (Cowleech, Calaveras), main lake points, boat docks (numerous), main lake humps and channel, spawning sand/grass flats.

TOP BAITS: Hollow-body frog (black/blue — Spro Bronze Eye), punch rig (black/blue 1–1.5oz tungsten, beaver bait), swim jig (white shad 3/8oz, black/blue), spinnerbait (chartreuse/white double willow), Texas rig (watermelon/red, junebug — 5/0 EWG), lipless crankbait (Red Eye Shad chrome/blue), drop shot Roboworm (green pumpkin, morning dawn), football jig (green pumpkin 3/4oz).

NOTES: Grass coverage is highly variable year to year depending on TPWD vegetation management — check current maps before planning a grass-focused trip. DFW proximity means heavy weekend pressure in spring and fall; early morning or weekday fishing strongly recommended. Good tournament circuit with local clubs fishing regularly. Consistent big-bass producer with history of 10-pound-plus fish.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Tawakoni TX knowledge base',
  },

  // ─── Lake Lewisville ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Lewisville', state: 'TX', source_type: 'article',
    raw_text: `Lake Lewisville — Texas Bass Fishing Guide

Lake Lewisville is a 29,600-acre reservoir on the Elm Fork of the Trinity River in the DFW metroplex near Lewisville and The Colony. One of the most heavily fished lakes in Texas due to its urban location. Water is typically stained to slightly murky. Features extensive boat docks, riprap banks, main lake points, some grass in the upper lake, coves with timber, and multiple creek arms. Strong largemouth bass population — abundant numbers with average size driven down by pressure.

KEY PATTERNS:
- Spring (Feb–Apr): Dock fishing and shallow spawning coves are the primary spring patterns. Texas-rigged plastics (creature baits, lizards — green pumpkin, black/blue — 4/0–5/0 EWG, 1/2oz tungsten) flipped to dock pilings, boat lifts, and laydowns in coves. Swim jigs (white shad 3/8oz) along dock edges and grass edges in upper lake. Spinnerbaits (chartreuse/white) on wind-blown riprap. Squarebills along riprap and shallow rocky banks.
- Summer: Dock fishing is the dominant summer pattern — bass stack under floating docks and boat houses to escape heat. Drop shot (Roboworm green pumpkin, morning dawn, 3/16oz) and Ned rig under docks in 8–15 feet. Swim jig under dock skirts. Night fishing productive — dark Texas rigs and swim jigs on main lake riprap and dock edges after dark.
- Fall: Schooling largemouth on main lake points and creek arm mouths. Lipless crankbaits (chrome/blue, sexy shad), swimbaits, topwater walking baits on visible schools. Dock fishing remains productive into late fall.
- Winter: Drop shot and finesse presentations on dock pilings and main lake points in 15–25 feet. Blade bait vertically on channel edges and humps.

KEY STRUCTURES: Boat docks and marinas (dominant year-round structure), riprap banks, main lake points, coves with timber, Hickory Creek arm, Cottonwood Creek arm, main lake humps, grass in upper lake (variable).

TOP BAITS: Drop shot Roboworm (green pumpkin, morning dawn, Aaron's Magic — 3/16oz), Ned rig Z-Man TRD (green pumpkin, oxblood), swim jig (white shad 3/8oz with small paddle tail), Texas rig (green pumpkin, black/blue — 4/0 EWG, 1/2oz tungsten), squarebill (sexy shad, chartreuse), spinnerbait (chartreuse/white 1/2oz), lipless crankbait (chrome/blue Red Eye Shad), topwater walking bait (chrome/black Spook).

NOTES: One of the most pressured lakes in Texas — bass are conditioned to heavy fishing. Finesse presentations often outperform power fishing, especially in clear marinas. Tournament competition is fierce with DFW bass clubs fishing virtually every weekend. Early morning and weekday fishing dramatically better. Dock fishing is the skill set that separates good Lewisville anglers from average ones — learn the productive docks by season. Some of the largest public marina boat dock systems in North Texas.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Lewisville TX knowledge base',
  },

  // ─── Lake Ray Roberts ─────────────────────────────────────────────────────
  {
    lake_name: 'Lake Ray Roberts', state: 'TX', source_type: 'article',
    raw_text: `Lake Ray Roberts — Texas Bass Fishing Guide

Lake Ray Roberts is a 29,350-acre reservoir on the Elm Fork of the Trinity River in North Texas near Denton. One of the better bass fisheries in the DFW area with less pressure than Lewisville despite similar size. Water clarity ranges from stained to slightly clearer than typical DFW lakes. Features rocky and sandy main lake points, grass (variable — hydrilla and milfoil when present), boat docks, creek arms, and some timber in upper sections.

KEY PATTERNS:
- Spring (Mar–May): Prespawn fish on main lake points and secondary points in 4–12 feet. Swim jigs (white shad 3/8oz) along point edges, spinnerbaits (chartreuse/white) on flat banks with wind. Texas-rigged plastics (creature baits — green pumpkin, watermelon/red) on rocky and sandy points. Spawn in 2–5 feet on flat sandy pockets near points — jig and Texas rig for bedding fish.
- Summer: Grass fishing when hydrilla is present — punch rigs and frog fishing on mats. Dock fishing with drop shots and Ned rigs in shade. Main lake points and humps with football jigs and Carolina rigs in 15–22 feet. Morning topwater on main lake points.
- Fall: Schooling largemouth on main lake points as water cools — lipless crankbaits, swimbaits, topwater. Grass edges remain productive with swim jigs. One of the better fall bites in North Texas.
- Winter: Main lake ledge fishing with finesse — drop shot, shakey head, blade bait on channel edges in 18–28 feet.

KEY STRUCTURES: Main lake points (rocky and sandy), boat docks, grass beds (variable — check TPWD), creek arms (Isle du Bois, Jordan), main lake humps and ledges, upper lake timber flats, spawning sand flats.

TOP BAITS: Swim jig (white shad 3/8oz), spinnerbait (chartreuse/white), Texas rig creature bait (green pumpkin, watermelon/red — 4/0–5/0 EWG), football jig (green pumpkin 3/4oz), punch rig (black/blue 1–1.5oz when grass present), drop shot Roboworm (green pumpkin, morning dawn), lipless crankbait (Red Eye Shad chrome/blue), Ned rig (green pumpkin).

NOTES: Part of the Lyndon B. Johnson National Grasslands area with state park access on both Isle du Bois and Johnson Branch units. Less crowded than Lewisville on weekends. Good public shoreline access for bank fishermen at state park. Variable grass coverage year to year — check TPWD vegetation management before planning grass-focused trip. Consistent largemouth with lower average size than Fork or Rayburn but good numbers.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Ray Roberts TX knowledge base',
  },

  // ─── Lake Ray Hubbard ─────────────────────────────────────────────────────
  {
    lake_name: 'Lake Ray Hubbard', state: 'TX', source_type: 'article',
    raw_text: `Lake Ray Hubbard — Texas Bass Fishing Guide

Lake Ray Hubbard is a 22,745-acre reservoir on the East Fork of the Trinity River east of Dallas near Garland and Rockwall. A heavily urbanized lake surrounded by DFW metro development. Water is typically stained to slightly murky. Features extensive riprap shorelines (particularly along the George Bush Turnpike causeway), boat docks, submerged brush piles, and creek arms with some timber. Strong largemouth population with consistent 3–5 pound fish and occasional larger specimens.

KEY PATTERNS:
- Spring (Feb–Apr): Riprap banks are the signature spring pattern. Squarebills (Strike King KVD 1.5 — sexy shad, chartreuse sexy shad) worked along riprap at various retrieval speeds. Spinnerbaits (chartreuse/white 1/2oz double willow) on wind-blown riprap. Jigs (3/8oz green pumpkin) along riprap transitions. Bass spawn in coves off riprap banks and near any hard structure — Texas rigs (creature baits, watermelon/red) on spawning flats.
- Summer: Dock fishing critical — drop shot (Roboworm green pumpkin, morning dawn) and Ned rigs under boat docks in 8–15 feet. Deep riprap on main lake in 12–18 feet holds suspended bass — drop shot and finesse jigs. Night fishing very productive on summer riprap — dark Texas-rigged worms and swim jigs.
- Fall: Schooling activity on main lake as shad migrate. Lipless crankbaits (chrome/blue) and topwater walking baits on open-water schooling fish. Riprap fishing picks back up as water cools — squarebills and spinnerbaits.
- Winter: Drop shot on deep riprap and dock pilings. Blade bait on channel edges and main lake points. Finesse presentations dominate.

KEY STRUCTURES: Riprap banks and causeways (dominant — especially George Bush Turnpike), boat docks and marinas, creek arms (Rowlett, Williams), main lake channel transitions, brush piles (some artificial), spawning coves.

TOP BAITS: Squarebill crankbait (sexy shad, chartreuse — Strike King KVD 1.5), spinnerbait (chartreuse/white double willow 1/2oz), drop shot Roboworm (green pumpkin, morning dawn, Aaron's Magic), Ned rig Z-Man TRD (green pumpkin, oxblood), swim jig (white shad 3/8oz), Texas rig (watermelon/red, black/blue — 4/0 EWG, 1/2oz tungsten), blade bait (chrome 1/2oz), topwater Spook (chrome/black).

NOTES: Urban lake with very heavy recreational traffic — early morning fishing strongly recommended. Riprap is the great equalizer on Ray Hubbard; learning the productive riprap sections by season is the key pattern. Night fishing in summer on riprap and dock edges can be exceptional. Bridge and causeway structure creates distinctive current breaks that hold bass year-round. Easy access from all DFW metro areas.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Ray Hubbard TX knowledge base',
  },

  // ─── Richland Chambers Reservoir ─────────────────────────────────────────
  {
    lake_name: 'Richland Chambers Reservoir', state: 'TX', source_type: 'article',
    raw_text: `Richland Chambers Reservoir — Texas Bass Fishing Guide

Richland Chambers Reservoir is a 41,000-acre impoundment on Richland and Chambers Creeks in Northeast Texas near Corsicana. One of Texas's most underrated and underutilized big-bass lakes, consistently producing 10-pound-plus largemouth with low angling pressure relative to its size. Water is typically stained to muddy. Features extensive submerged timber, stumps, brush piles throughout, main lake humps and channel swings, and scattered grassbeds when hydrilla is present.

KEY PATTERNS:
- Spring (Feb–May): Prespawn fish stage on secondary points and timber flats in 6–14 feet. Flipping and pitching is the premier pattern — Texas-rigged creature baits (Zoom Z-Craw, Reaction Strike Twin Turbo Beaver — black/blue, green pumpkin/black — 5/0 EWG, 3/4–1oz tungsten) to submerged timber and stump fields. Swim jigs (white shad, black/blue 3/8oz) through timber on spawning flats. Spinnerbaits on wind-blown flats near timber. Spawn on sandy pockets adjacent to timber in 2–5 feet.
- Summer: Main lake humps and channel swing timber in 18–28 feet. Football jigs (green pumpkin 3/4–1oz) crawled through stump fields on deep structure. Carolina rigs with creature baits on hard-bottom transitions. Deep-diving crankbaits (10XD, sexy shad) on channel swings. Early morning topwater near main lake timber points.
- Fall: Shad migration brings bass to channel mouths and main lake timber points. Lipless crankbaits (Red Eye Shad chrome/blue 3/4oz), swimbaits, and topwater walking baits on schooling fish. Flipping timber in 8–12 feet remains productive throughout fall.
- Winter: Blade baits and jigging spoons vertically on main lake humps and channel edge timber in 20–35 feet. Football jigs slow-rolled through deep timber. Drop shot on channel edges.

KEY STRUCTURES: Submerged timber and stump fields throughout (defining structure), main lake humps (several prominent ones mid-lake), main channel swings (Richland and Chambers creek channels), secondary timber points, spawning sandy pockets near timber, grass beds (variable).

TOP BAITS: Texas rig creature bait (black/blue, green pumpkin/black — 5/0 EWG, 3/4–1oz tungsten), football jig (green pumpkin 3/4–1oz with craw trailer), swim jig (white shad 3/8oz), 10XD crankbait (sexy shad, chartreuse shad), lipless crankbait (Red Eye Shad chrome/blue 3/4oz), blade bait (chrome Heddon Sonar 1/2oz), spinnerbait (chartreuse/white double willow 1/2oz), Carolina rig (3/4oz egg sinker, 18-inch fluorocarbon, creature bait).

NOTES: Dramatically underrated relative to Fork and Rayburn — receives a fraction of the pressure but produces comparable quality fish. Big-bass program TPWD has documented numerous 10-pound-plus fish from this lake. Worth the trip for anglers willing to explore less-charted water. Multiple public boat ramps managed by Tarrant Regional Water District. No live-aboard or private docks allowed — keeps pressure lower than comparable Texas lakes. A true sleeper big-bass destination.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Richland Chambers Reservoir TX knowledge base',
  },

  // ─── O.H. Ivie Reservoir ──────────────────────────────────────────────────
  {
    lake_name: 'O.H. Ivie Reservoir', state: 'TX', source_type: 'article',
    raw_text: `O.H. Ivie Reservoir — Texas Bass Fishing Guide

O.H. Ivie Reservoir is a 19,149-acre impoundment on the Concho River in West Texas near Coleman — one of the most remote major bass lakes in Texas. Famous as a legendary big-bass destination, regularly producing largemouth in the 10–14 pound range and occasionally larger. Water is clear to slightly stained with excellent visibility. Features rocky structure, points, canyon-like coves, submerged brushy structure, and vast open flats. Low angling pressure due to remote location is a defining characteristic.

KEY PATTERNS:
- Spring (Feb–Apr): Prespawn fish stage on main lake rocky points and secondary points in 6–15 feet. Big swimbaits are the signature Ivie technique — 6–10 inch paddle tails and glide baits (Deps Slide Swimmer, Megabass Magdraft, MS Slammer — natural shad, sunfish, bluegill colors) fished slowly on 1.5–3oz heads along main lake structure draw the biggest fish in Texas. Jerkbaits (Megabass Vision 110, Lucky Craft Pointer — natural shad, ghost) on rocky points. Texas rigs (big worms, lizards — watermelon/red, junebug) on spawning flats in 3–8 feet.
- Summer: Bass retreat to deeper rocky structure and main lake points in 20–35 feet. Drop shot (Roboworm Aaron's Magic, green pumpkin — 1/4oz) on rock transitions. Football jigs (green pumpkin/brown 3/4oz) on hard rocky bottom. Morning topwater (Spook, pencil popper) on main lake points with schooling fish before 8am.
- Fall: Topwater action on main lake rocky points as shad and bass stack up — walking baits, poppers, and small swimbaits on surface-busting fish. Jerkbaits on cooling water transitions. Very productive fall bite for big fish.
- Winter: Finesse only given clear water. Drop shot with natural colors on deep rocky points. Ned rig and small jigs on rock. Blade bait vertically on main lake humps.

KEY STRUCTURES: Rocky main lake points (dominant), canyon-style coves with rock and brush, Concho River channel, main lake humps, spawning sand and gravel flats near points, submerged brushy areas, open-water main lake structure.

TOP BAITS: Big swimbait on heavy jighead (natural shad, sunfish, bluegill — 6–10 inch, 2–3oz head — Deps Slide Swimmer, Megabass Magdraft), jerkbait (Megabass Vision 110, Lucky Craft Pointer 78 — ghost, natural shad), drop shot Roboworm (Aaron's Magic, green pumpkin — 1/4oz), Texas rig big worm (watermelon/red 10 inch, junebug — 5/0 EWG, 3/4oz tungsten), football jig (green pumpkin/brown 3/4oz), topwater Spook or pencil popper (natural shad, chrome).

NOTES: Remote location (nearest city is Coleman or San Angelo) keeps pressure extremely low — fishing quality is exceptional as a result. Guided trips highly recommended for first-time visitors due to large, unfamiliar lake. Big swimbaits are the prestige bait here — Ivie is one of a handful of lakes in the US where glide baits and large paddle tails regularly produce 10-pound-plus fish. Clear water demands fluorocarbon and natural presentations. Bassmaster travel guides consistently rank Ivie among the top big-bass lakes in the nation. Plan fuel, food, and lodging in advance — services limited near the lake.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated O.H. Ivie Reservoir TX knowledge base',
  },

  // ─── Lake Conroe ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Conroe', state: 'TX', source_type: 'article',
    raw_text: `Lake Conroe — Texas Bass Fishing Guide

Lake Conroe is a 21,000-acre reservoir on the West Fork of the San Jacinto River in Southeast Texas near Conroe, north of Houston. One of the most popular recreational and fishing lakes in Southeast Texas. Water is typically stained. Features hydrilla and coontail grassbeds, extensive boat dock systems, main lake points, creek arms, and submerged timber in upper sections. Strong largemouth bass population with consistent quality fish.

KEY PATTERNS:
- Spring (Mar–May): Grass edges and boat docks are the twin spring patterns. Swim jigs (white shad 3/8oz, black/blue) along hydrilla and coontail edges. Texas-rigged creature baits (green pumpkin, watermelon/red — 4/0–5/0 EWG, 1/2oz tungsten) flipped to dock pilings and laydowns. Hollow-body frogs (black/blue, white) over early grass growth on flat lake sections. Squarebills and spinnerbaits on grass edges and points.
- Summer: Punch fishing and frog fishing on dense hydrilla mats — black/blue or watermelon red beaver bait with 1–1.5oz tungsten through thick mats. Frog fishing (white, black/blue) on mat surface early and late. Dock fishing with drop shots and Ned rigs in deep shade. Main lake points with football jigs in 15–20 feet.
- Fall: Schooling on main lake as shad migrate. Lipless crankbaits (Red Eye Shad chrome/blue), swimbaits, topwater walking baits. Grass edges productive with swim jigs and spinnerbaits.
- Winter: Dock fishing with finesse — drop shot and Ned rig under docks. Main lake points with football jig and Carolina rig. Blade bait on channel edges.

KEY STRUCTURES: Hydrilla and coontail grass (variable — check TPWD), boat docks and marina systems (extensive), main lake points, creek arms (Calfee, Jackson, Steele), upper lake timber, channel edges.

TOP BAITS: Punch rig (black/blue 1–1.5oz tungsten, beaver bait), hollow-body frog (black/blue, white), swim jig (white shad 3/8oz), squarebill (sexy shad, chartreuse), drop shot Roboworm (green pumpkin, morning dawn), Texas rig (green pumpkin, watermelon/red — 4/0 EWG), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue).

NOTES: Heavy recreational boat traffic on weekends — early morning on weekdays best for serious fishing. Grass coverage fluctuates significantly with TPWD management and drought/flood conditions. Houston-area proximity drives high angling pressure; dock fishing with finesse often necessary to get bites on pressured fish. Good guide service community based out of Conroe. Spring and fall are peak tournament seasons on this lake.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Conroe TX knowledge base',
  },

  // ─── Lake Livingston ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Livingston', state: 'TX', source_type: 'article',
    raw_text: `Lake Livingston — Texas Bass Fishing Guide

Lake Livingston is a 90,000-acre reservoir on the Trinity River in Southeast Texas near Livingston, northeast of Houston — one of the largest lakes in Texas. Water ranges from stained to muddy with significant timber throughout. Features extensive flooded timber in all sections, main lake points, creek arms, and vast shallow flats with standing timber. Large largemouth population with quality fish and a history of big-bass production.

KEY PATTERNS:
- Spring (Feb–Apr): Timber flipping and pitching is the defining spring pattern. Texas-rigged creature baits and craws (black/blue, green pumpkin — 5/0 EWG, 3/4–1oz tungsten) flipped to standing timber, laydowns, and timber bases in creek arm coves in 2–8 feet. Spinnerbaits (chartreuse/white 1/2oz double willow) along timber-lined flat banks. Swim jigs (white shad, black/blue 3/8oz) through timber on prespawn flats. Spawn in sandy pockets adjacent to timber — jigs and Texas rigs for bedding fish.
- Summer: Fish retreat into timber shade and move to main lake timber points and channel edges in 15–22 feet. Swim jigs through mid-depth timber. Football jigs and Carolina rigs on main lake points and hard-bottom transitions. Early morning topwater (Whopper Plopper) around timber points.
- Fall: Shad migration into timber flats — lipless crankbaits (Red Eye Shad chrome/blue 3/4oz) ripped through timber, swimbaits, and topwater walking baits on open flats adjacent to timber. Excellent fall spinnerbait bite along timber edges as shad move.
- Winter: Blade baits and jigging spoons vertically on main lake timber points in 20–30 feet. Jigs slow-crawled through deep timber. Drop shot on channel edges adjacent to timber.

KEY STRUCTURES: Flooded timber throughout (defining — nearly every pattern involves timber), main Trinity River channel, creek arms (Kickapoo, Cedar, Kickapoo), main lake timber points, shallow spawning flats with timber, main lake humps.

TOP BAITS: Texas rig creature bait (black/blue, green pumpkin — 5/0 EWG, 3/4–1oz tungsten), spinnerbait (chartreuse/white double willow 1/2oz), swim jig (white shad, black/blue 3/8oz), lipless crankbait (Red Eye Shad chrome/blue 3/4oz), football jig (green pumpkin 3/4oz), blade bait (chrome 1/2oz), topwater Whopper Plopper (shad, bone), squarebill (chartreuse sexy shad).

NOTES: Timber is omnipresent — there is no fishing on Livingston without timber involvement. Navigation can be challenging in many creek arms due to submerged timber — local knowledge or guide is recommended for first-time visitors. Very large lake that can be difficult to locate fish without waypoints. Houston-area proximity drives moderate pressure, mostly on weekends. Good striper and catfish fishery in addition to bass. Trinity River inflow in upper lake can muddy water significantly after rain events.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Livingston TX knowledge base',
  },

  // ─── Lake Travis ──────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Travis', state: 'TX', source_type: 'article',
    raw_text: `Lake Travis — Texas Bass Fishing Guide

Lake Travis is a 19,000-acre Highland Lakes reservoir on the Colorado River west of Austin near Lakeway. One of the most scenic and clear lakes in Texas, with limestone bluffs, rocky canyons, and dramatic terrain. Features largemouth and smallmouth bass (spotted bass also present). Water is typically clear to slightly stained. Features steep rocky bluffs, chunk rock banks, main lake points, creek arms, boat docks, and limited grass. MLF Bass Pro Tour event history.

KEY PATTERNS:
- Spring (Mar–May): Rocky banks and coves are the primary spring pattern. Largemouth spawn in gravel and sandy pockets in rocky coves in 3–10 feet. Smallmouth and spotted bass on chunk rock points and bluff ends. Jerkbaits (Megabass Vision 110, Lucky Craft Pointer — ghost, natural shad) on rocky points. Ned rigs and drop shots for smallmouth on rock. Spinnerbaits and swim jigs for largemouth in stained upper lake areas. Texas rigs (watermelon/red, junebug) on spawning flats in coves.
- Summer: Deep rocky structure critical as water heats up. Drop shot (Roboworm Aaron's Magic, green pumpkin — 3/16–1/4oz) on bluff ends and deep rocky points in 20–40 feet. Football jig (green pumpkin 3/4oz) on hard rocky bottom. Alabama rig on main lake points for schooling fish. Morning topwater on rocky main lake points before 8am.
- Fall: Topwater action on rocky main lake points as water cools — walking baits (Spook), pencil poppers, small swimbaits. Schooling spotted bass and smallmouth on main lake. Jerkbaits on cooling water.
- Winter: Finesse only — drop shot and Ned rig on deep rocky structure. Blade bait vertically on main lake humps and points.

KEY STRUCTURES: Rocky bluffs and limestone canyon walls, chunk rock main lake points, boat docks (numerous, especially lower lake), coves with gravel/sandy spawning areas, main Colorado River channel, creek arms (Cow, Devil's Hollow, Starnes), main lake humps.

TOP BAITS: Drop shot Roboworm (Aaron's Magic, green pumpkin — 3/16–1/4oz), Ned rig Z-Man TRD (green pumpkin, oxblood), jerkbait (Megabass Vision 110 — ghost, natural shad), football jig (green pumpkin/brown 3/4oz), Texas rig (watermelon/red 10-inch worm or lizard — 4/0 EWG), topwater walking bait (chrome/black, bone), spinnerbait (chartreuse/white — for stained upper lake sections), squarebill (sexy shad — rocky bank targets).

NOTES: Water level fluctuates significantly based on LCRA management and drought conditions — check current pool elevation before planning a trip (target range 670+ feet). Low lake levels expose more rock structure. Clear water demands fluorocarbon and light line (8–12lb). Heavy recreational boat traffic on weekends (swimming, wakeboarding) — early weekday mornings best. Excellent smallmouth fishery in clear lower lake sections. Guide services available near Lakeway and Lago Vista.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Travis TX knowledge base',
  },

  // ─── Possum Kingdom Lake ──────────────────────────────────────────────────
  {
    lake_name: 'Possum Kingdom Lake', state: 'TX', source_type: 'article',
    raw_text: `Possum Kingdom Lake — Texas Bass Fishing Guide

Possum Kingdom Lake is a 17,000-acre reservoir on the Brazos River in North-Central Texas near Graford, managed by Brazos River Authority. One of the most scenic lakes in Texas with dramatic limestone bluffs and clear water. Features largemouth and spotted bass. Water clarity ranges from clear to slightly stained. Features rocky limestone bluffs, chunk rock banks and points, boat docks, coves with sandy/gravel bottoms, and minimal grass. MLF Bass Pro Tour event history.

KEY PATTERNS:
- Spring (Mar–May): Rocky banks, bluff ends, and coves are the primary spring pattern. Spotted bass dominate on main lake chunk rock points and bluff walls in 5–15 feet. Largemouth spawn in sandy/gravel coves in 3–8 feet. Jerkbaits (Megabass Vision 110, Lucky Craft Pointer — natural shad, ghost) critical for spotted bass on rock. Ned rigs and finesse jigs on chunk rock and bluff ends. Texas rigs (watermelon/red) for spawning largemouth in coves. Squarebills on shallow rocky transitions.
- Summer: Deep bluff walls and main lake rocky points in 20–40 feet. Drop shot (Roboworm Aaron's Magic, green pumpkin — 3/16oz) on bluff walls and deep point ends. Football jigs on hard rocky bottom. Alabama rig on main lake points in 15–25 feet. Morning topwater on rocky points with schooling spotted bass before heat sets in.
- Fall: Outstanding schooling bite on main lake rocky points and open water as water cools. Topwater walking baits (Spook), swimbaits, and jerkbaits on surface-busting spotted bass. Very active fall period.
- Winter: Blade bait and jigging spoon vertically on deep main lake bluff ends and rocky humps. Drop shot with natural colors. Jerkbaits on cold rocky points.

KEY STRUCTURES: Limestone bluffs (very prominent — defining character of the lake), chunk rock main lake points, boat docks, sandy/gravel spawning coves, Brazos River channel, Hell's Gate (dramatic canyon section with excellent rock structure), main lake humps.

TOP BAITS: Drop shot Roboworm (Aaron's Magic, green pumpkin, margarita mutilator — 3/16oz), Ned rig Z-Man TRD (green pumpkin, California 420), jerkbait (Megabass Vision 110 — ghost, natural shad), squarebill (sexy shad, natural shad — rocky banks), football jig (green pumpkin/brown 3/4oz), topwater Spook or pencil popper (natural shad, chrome), swimbait on round jighead (natural shad 3/8oz), Texas rig (watermelon/red lizard or worm — 4/0 EWG).

NOTES: Clear water is the defining characteristic — fluorocarbon essential, lighter line (8–12lb) preferred. Spotted bass dominate main lake structure; largemouth more common in back of coves. Hell's Gate area is iconic structure — bluff walls drop sharply and hold fish year-round. Heavy recreational use on summer weekends (wakeboarding, swimming); early morning and weekday fishing strongly recommended. Brasros River Authority regulates fishing access — check current regulations. One of the most visually stunning fishing destinations in Texas.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Possum Kingdom Lake TX knowledge base',
  },

  // ─── Cedar Creek Reservoir ────────────────────────────────────────────────
  {
    lake_name: 'Cedar Creek Reservoir', state: 'TX', source_type: 'article',
    raw_text: `Cedar Creek Reservoir — Texas Bass Fishing Guide

Cedar Creek Reservoir is a 33,750-acre impoundment on Cedar Creek in Northeast Texas near Athens and Mabank, east of Dallas. Consistent big-bass producer with a history of quality largemouth. Water is typically stained. Features submerged timber and wood structure throughout, main lake points, creek arms, boat docks, and some grass (variable). One of the go-to lakes for DFW and NE Texas bass anglers seeking quality over quantity.

KEY PATTERNS:
- Spring (Feb–Apr): Prespawn staging in timber coves and on secondary points in 5–12 feet. Flipping and pitching Texas-rigged plastics (creature baits, craws — black/blue, green pumpkin — 5/0 EWG, 3/4oz tungsten) to timber and brush. Swim jigs (white shad, black/blue 3/8oz) through timber on prespawn flats. Spinnerbaits (chartreuse/white 1/2oz) on flat, wind-blown timber banks. Spawn on sandy pockets near timber in 2–5 feet — jig and Texas rig for bedding fish.
- Summer: Deep timber and main lake structure in 15–22 feet. Football jigs (green pumpkin 3/4oz) on hard-bottom transitions with timber. Carolina rigs on main lake points. Deep-diving crankbaits on channel swings. Dock fishing with drop shots under floating docks in shade.
- Fall: Excellent shad migration bite on main lake points and timber flat edges. Lipless crankbaits (Red Eye Shad chrome/blue 3/4oz) ripped through timber and along points. Swimbaits and topwater walking baits on schooling fish. Timber fishing with swim jig through fall.
- Winter: Main lake timber points and channel edges. Drop shot (Roboworm green pumpkin), blade bait vertically on timber humps, shakey head in 18–28 feet.

KEY STRUCTURES: Submerged timber throughout (defining structure), main lake points with timber, creek arms (Cedar, Flat, Walnut), boat docks, main lake humps and channel swings, spawning sandy pockets near timber.

TOP BAITS: Texas rig creature bait (black/blue, green pumpkin — 5/0 EWG, 3/4oz tungsten), swim jig (white shad, black/blue 3/8oz), spinnerbait (chartreuse/white double willow 1/2oz), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue 3/4oz), drop shot Roboworm (green pumpkin, morning dawn), blade bait (chrome 1/2oz), squarebill (chartreuse sexy shad).

NOTES: Consistent big-bass producer year over year. Notable for January and February prespawn fish — some of the largest bass caught in NE Texas come from Cedar Creek in late winter. Timber is central to virtually every productive pattern. DFW proximity means moderate pressure on weekends but far less than Lewisville or Ray Hubbard. Good public ramp access. Tournament fishing active spring through fall with local club events.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Cedar Creek Reservoir TX knowledge base',
  },

  // ─── Lake Bob Sandlin ─────────────────────────────────────────────────────
  {
    lake_name: 'Lake Bob Sandlin', state: 'TX', source_type: 'article',
    raw_text: `Lake Bob Sandlin — Texas Bass Fishing Guide

Lake Bob Sandlin is a 9,460-acre reservoir on Big Cypress Creek in Northeast Texas near Mount Pleasant. One of the clearest lakes in the NE Texas Pineywoods region. Features largemouth bass as the primary target. Water clarity ranges from clear to slightly stained — clearer than most nearby East Texas lakes. Features rocky and sandy banks, timbered coves, boat docks, main lake points, and some brush. Quality largemouth population with consistently good average size.

KEY PATTERNS:
- Spring (Mar–May): Rocky and sandy main lake points and spawning coves are productive. Jerkbaits (Lucky Craft Pointer, Megabass Vision 110 — natural shad, ghost) on main lake points and rocky transitions. Texas rigs (watermelon/red, green pumpkin — 4/0 EWG) on spawning flats in 2–6 feet. Swim jigs (white shad 3/8oz) on point edges. Spinnerbaits (chartreuse/white) on flatter banks and timber edges. Ned rigs on hard-bottom points for clear water finesse approach.
- Summer: Dock fishing critical in heat — drop shot (Roboworm green pumpkin, morning dawn) and Ned rig under floating docks. Offshore points and humps with football jigs (green pumpkin 3/4oz) and Carolina rigs in 14–20 feet. Early morning topwater on main lake points.
- Fall: Schooling activity on main lake points and creek arm mouths — lipless crankbaits, swimbaits, jerkbaits, and topwater on schooling fish. Dock and timber fishing with swim jig remain productive into fall.
- Winter: Finesse on deep structure — drop shot on main lake points and dock pilings, blade bait on channel edges.

KEY STRUCTURES: Main lake points (rocky and sandy), boat docks, timbered coves and creek arms, Big Cypress Creek channel, main lake humps, spawning sandy and gravel flats.

TOP BAITS: Drop shot Roboworm (green pumpkin, morning dawn, Aaron's Magic — 3/16oz), jerkbait (Lucky Craft Pointer 78 — natural shad, ghost), Ned rig (green pumpkin, oxblood), swim jig (white shad 3/8oz), spinnerbait (chartreuse/white), football jig (green pumpkin 3/4oz), Texas rig (watermelon/red — 4/0 EWG), lipless crankbait (Red Eye Shad chrome/blue), topwater walking bait (chrome/black).

NOTES: Clearer water than most NE Texas lakes rewards finesse presentations. Beautiful Pineywoods setting — part of the Lake Bob Sandlin State Park system with excellent facilities. Low pressure relative to quality. Good option for anglers who want quality fishing without the crowds of Fork or Rayburn. State park provides shore fishing access and camping. Dock fishing and clear-water finesse are the defining skill sets for this lake.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Bob Sandlin TX knowledge base',
  },

  // ─── Lake O' the Pines ────────────────────────────────────────────────────
  {
    lake_name: "Lake O' the Pines", state: 'TX', source_type: 'article',
    raw_text: `Lake O' the Pines — Texas Bass Fishing Guide

Lake O' the Pines is an 18,700-acre reservoir on Big Cypress Creek in Northeast Texas near Jefferson, in the heart of the Piney Woods. One of Texas's most heavily timbered lakes — vast flooded pine and hardwood forest throughout. Water is typically stained to slightly dark (tannic). Strong largemouth bass population. Features dense standing timber, laydowns, timber-lined creek arms, main lake points, and some dock structure. Scenic backcountry feel with genuine wilderness character.

KEY PATTERNS:
- Spring (Feb–Apr): Timber flipping and pitching is essentially the only meaningful spring pattern. Texas-rigged creature baits (black/blue, green pumpkin — 5/0 EWG, 3/4–1oz tungsten) pitched to standing timber, laydowns, and timber bases in creek arms and coves in 2–8 feet. Swim jigs (black/blue, white shad 3/8oz) swam through timber on prespawn flats. Hollow-body frogs and buzzbaits over timber-laden shallows at dawn in late spring. Spinnerbaits (chartreuse/white) along timber flat edges.
- Summer: Move to mid-depth timber and any dock structure in 10–18 feet. Swim jigs and Texas rigs worked through timber shade. Night fishing with dark worms and jigs on main lake timber points. Some bass suspend in mid-depth timber during summer heat.
- Fall: Excellent shad migration bite as baitfish enter timber flats — lipless crankbaits (Red Eye Shad chrome/blue) ripped through timber, swimbaits and spinnerbaits along timber edges, topwater on open water adjacent to timber.
- Winter: Blade baits vertically on main lake timber points in 18–28 feet. Slow-rolled jigs on timber bases. Drop shot on channel edges adjacent to timber.

KEY STRUCTURES: Standing timber and laydowns throughout (defining — nearly all patterns involve timber), Big Cypress Creek channel, timbered creek arms, main lake timber points, any dock or hard structure, spawning sandy pockets in timber-lined coves.

TOP BAITS: Texas rig creature bait (black/blue, green pumpkin — 5/0 EWG, 3/4–1oz tungsten), swim jig (black/blue, white shad 3/8oz), hollow-body frog (black/blue, white), spinnerbait (chartreuse/white double willow 1/2oz), lipless crankbait (Red Eye Shad chrome/blue 3/4oz), buzzbait (black, white), blade bait (chrome 1/2oz), drop shot Roboworm (green pumpkin, morning dawn).

NOTES: Among the most heavily timbered lakes in Texas — navigation requires care in many areas. Low angling pressure due to remote location and challenging timber navigation. Beautiful setting surrounded by Pineywoods national forest. Corps of Engineers campgrounds on the lake. Timber flipping skill is essential — anglers who can accurately pitch and flip to individual trees will dramatically outfish those who cannot. One of the best under-the-radar largemouth lakes in Texas.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: "Curated Lake O' the Pines TX knowledge base",
  },

  // ─── Lake LBJ ─────────────────────────────────────────────────────────────
  {
    lake_name: 'Lake LBJ', state: 'TX', source_type: 'article',
    raw_text: `Lake LBJ — Texas Bass Fishing Guide

Lake LBJ (Lyndon B. Johnson Lake) is a 6,375-acre constant-level reservoir on the Colorado River in the Central Texas Highland Lakes chain near Marble Falls and Kingsland. Part of the Lower Colorado River Authority (LCRA) system. Features largemouth and spotted bass. Water clarity is clear to slightly stained — much clearer than East Texas lakes. Features rocky limestone points, steep banks, boat docks (very numerous), creek arms, and open-water structure. A constant-level lake — no drawdown — which allows heavy dock and shoreline development.

KEY PATTERNS:
- Spring (Mar–May): Rocky main lake points and boat docks are twin spring patterns. Spotted bass on chunk rock points and bluff ends. Largemouth on dock pilings and in coves. Ned rigs (green pumpkin) and drop shots on rocky main lake points for spotted bass. Texas rigs (watermelon/red, junebug) flipped to dock pilings. Jerkbaits (natural shad) on rocky point transitions. Squarebills along shallow rocky banks.
- Summer: Dock fishing in deep shade is the dominant summer pattern — drop shot (Roboworm green pumpkin, morning dawn) and Ned rig under floating docks in 10–20 feet. Deep rocky structure with football jigs (green pumpkin 3/4oz) and Alabama rig on main lake points in 18–28 feet. Night fishing effective on dock edges and riprap after dark.
- Fall: Schooling spotted bass and largemouth on main lake rocky points — topwater walking baits, swimbaits, jerkbaits on surface feeding fish. Dock fishing remains productive. Excellent fall finesse bite on rock.
- Winter: Finesse only — drop shot and Ned rig on deep rocky structure and dock pilings. Blade bait vertically on main lake humps.

KEY STRUCTURES: Boat docks (extremely numerous — one of the most dock-dense lakes in Texas), rocky main lake points, limestone bluffs and chunk rock banks, creek arms (Sandy, Llano), main Colorado River channel, open-water main lake humps.

TOP BAITS: Drop shot Roboworm (green pumpkin, morning dawn, Aaron's Magic — 3/16oz), Ned rig Z-Man TRD (green pumpkin, oxblood, California 420), jerkbait (natural shad, ghost — Megabass, Lucky Craft), squarebill (sexy shad — rocky banks), football jig (green pumpkin/brown 3/4oz), Texas rig (watermelon/red — 4/0 EWG), topwater walking bait (chrome/black), spinnerbait (chartreuse/white — stained upper lake sections).

NOTES: Constant-level lake creates very stable fishing conditions year-round — no seasonal drawdown to contend with. Heavy dock density means dock fishing is critical skill. Clear water rewards finesse presentations year-round. Highland Lakes tourism is heavy on summer weekends — early morning weekday fishing strongly recommended. Spotted bass are co-dominant with largemouth on main lake structure. Part of the Highland Lakes chain that includes Buchanan, Inks, LBJ, Marble Falls, Travis, and Austin.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake LBJ TX knowledge base',
  },

  // ─── Lake Granbury ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Granbury', state: 'TX', source_type: 'article',
    raw_text: `Lake Granbury — Texas Bass Fishing Guide

Lake Granbury is an 8,310-acre reservoir on the Brazos River in North-Central Texas near Granbury, southwest of Fort Worth. A constant-level river-run lake with clear to slightly stained water. Features rocky banks and points, extensive boat docks, riprap, main lake points, creek arms, and some scattered brush. Largemouth and spotted bass fishery. Moderate angling pressure due to proximity to Fort Worth metro.

KEY PATTERNS:
- Spring (Mar–May): Dock fishing and rocky spawning banks are the primary spring patterns. Texas-rigged plastics (creature baits, lizards — watermelon/red, green pumpkin — 4/0–5/0 EWG, 1/2oz tungsten) flipped to dock pilings and laydowns. Jerkbaits (natural shad — Lucky Craft, Megabass) on rocky main lake points for spotted bass. Squarebills along rocky riprap and chunk rock banks. Ned rigs and drop shots for finesse approach on clear-water docks and rock.
- Summer: Dock fishing dominant in heat — drop shot (Roboworm green pumpkin, morning dawn) and Ned rig under floating docks in 10–18 feet. Deep rocky structure with football jig (green pumpkin 3/4oz) in 15–25 feet. Night fishing effective on riprap and dock edges.
- Fall: Schooling on main lake points as shad migrate — lipless crankbaits (chrome/blue), topwater walking baits, swimbaits on schooling fish. Rocky bank bite picks back up as water cools — squarebills and spinnerbaits on riprap.
- Winter: Finesse on deep dock pilings and rocky main lake structure. Drop shot and Ned rig. Blade bait vertically on channel edges and main lake humps.

KEY STRUCTURES: Boat docks (numerous — constant-level lake enables heavy dock development), rocky main lake points and riprap banks, Brazos River channel, creek arms, spawning gravel and sandy flats near points, main lake humps.

TOP BAITS: Drop shot Roboworm (green pumpkin, morning dawn — 3/16oz), Ned rig Z-Man TRD (green pumpkin, oxblood), squarebill (sexy shad, chartreuse — Strike King KVD 1.5), Texas rig (watermelon/red, green pumpkin — 4/0 EWG, 1/2oz tungsten), jerkbait (natural shad, ghost), spinnerbait (chartreuse/white 1/2oz), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue), topwater walking bait (chrome/black).

NOTES: River-run character means current affects fish positioning — bass often stack on the downstream side of points and riprap transitions. Constant-level status means stable dock and shoreline structure year-round. Clear water favors finesse presentations on main lake structure. Fort Worth metro proximity means moderate weekend pressure; early morning weekday fishing is best. Good access at multiple public ramps managed by City of Granbury.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Granbury TX knowledge base',
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${SOURCES.length} TX sources into ingest_queue...`)

  // Get existing entries to avoid duplicates
  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('url, lake_name')
    .eq('state', 'TX')

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
  console.log(`  npx tsx scripts/ingestion/run-queue.ts --state TX --batch 3`)
}

main().catch(console.error)
