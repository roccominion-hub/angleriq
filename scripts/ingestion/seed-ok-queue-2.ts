/**
 * AnglerIQ — Seed OK Ingest Queue Phase 2
 * Adds rawText knowledge bases and article URLs for the additional OK lakes
 * seeded in seed-ok-lakes-2.ts.
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-queue-2.ts
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

  // ─── Robert S. Kerr Reservoir ─────────────────────────────────────────────
  {
    lake_name: 'Robert S. Kerr Reservoir', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/robert-s-kerr',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Robert S. Kerr Reservoir fishing guide',
  },
  {
    lake_name: 'Robert S. Kerr Reservoir', state: 'OK', source_type: 'article',
    raw_text: `Robert S. Kerr Reservoir, Oklahoma Bass Fishing Guide

Robert S. Kerr Reservoir (also called Lake Kerr) is a large 46,500-acre impoundment on the Arkansas River in eastern Oklahoma, near Sallisaw and Poteau. Part of the McClellan-Kerr Arkansas River Navigation System. Features extensive back-water areas, coves, flats, and timber. Known for excellent largemouth and spotted bass fishing. Lower lake connects to Fort Gibson tailwaters region.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in shallow coves and flats with brush and timber, 2-8 feet. Texas-rigged soft plastics (lizards, creature baits) in watermelon/red and june bug. Swim jigs along laydowns, spinnerbaits on wind-blown points. Topwater frogs over early vegetation. Spotted bass on main lake points and rock in slightly deeper water (8-15 ft).
- Summer: Deeper ledge and channel fishing. Spotted bass heavily targeted — football jigs (3/4oz green pumpkin) and Carolina rigs (Zoom Speed Craw, Berkley Craw) on main lake points and channel drops 15-25 feet. Largemouth retreat to shaded docks, deeper coves, submerged timber. Drop shot and shakey head effective finesse options. Early morning topwater.
- Fall: Shad migration creates excellent reaction-bait fishing. Lipless crankbaits, swimbaits, and spinnerbaits following shad schools into the backs of coves. Moving baits — Rapala DT series, Strike King Red Eye Shad — excel. Spotted bass aggressive on main lake.
- Winter: Blade baits on channel drops, deep cranking 10XD and 6XD on main lake points. Finesse techniques (drop shot, shakey head) in 20-30 feet near the main river channel.

KEY STRUCTURES: Arkansas River navigation channel, Sallisaw Creek arm, Brushy Creek arm, Cherry Tree Creek, main lake timber, docks in back coves, submerged roadbeds, rock riprap near dam and navigation structures.

TOP BAITS: Texas rig creature bait (watermelon/red, june bug 3/4oz sinker), swim jig (white/chartreuse 3/8oz), football jig (green pumpkin 3/4oz), lipless crankbait (Red Eye Shad chrome/blue), drop shot (Roboworm 4.5" in morning dawn), squarebill crankbait (KVD 1.5 sexy shad), Carolina rig Speed Craw (watermelon red).

NOTES: Excellent spotted bass fishery in addition to largemouth. Navigation channel provides year-round depth reference. Back-water areas hold largemouth; main lake points and channel edges for spots. Connects to wider Arkansas River system — water levels fluctuate with navigation pool management.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Robert S. Kerr Reservoir OK knowledge base',
  },

  // ─── Lake of the Arbuckles ────────────────────────────────────────────────
  {
    lake_name: 'Lake of the Arbuckles', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/arbuckle',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Lake of the Arbuckles fishing guide',
  },
  {
    lake_name: 'Lake of the Arbuckles', state: 'OK', source_type: 'article',
    raw_text: `Lake of the Arbuckles (Arbuckle Lake), Oklahoma Bass Fishing Guide

Lake of the Arbuckles is a 2,350-acre highland reservoir in the Arbuckle Mountains of south-central Oklahoma near Sulphur, inside Chickasaw National Recreation Area. One of Oklahoma's premier smallmouth bass lakes and one of the few highland reservoirs in the state. Clear to slightly stained water. Rocky banks, bluffs, submerged boulders, and gravel points are defining features. Also holds largemouth bass in coves and flat areas.

KEY PATTERNS:
Smallmouth Bass (primary):
- Spring (Mar-May): Smallmouth spawn on gravel and rock flats in 3-8 feet. Drop shots (4" Roboworm in red shad, morning dawn), shaky heads on 1/8–3/16oz heads with finesse worms, Ned rigs (TRD or 2.75" ElaZtech), tube jigs (green pumpkin, watermelon). Also jerkbaits (Megabass Vision 110, Rapala X-Rap) worked along rocky bluffs. Topwater (Whopper Plopper 75, Heddon Tiny Torpedo) early morning near gravel points.
- Summer: Move deeper to 12-20 feet on main lake rocky points, bluff ends, and submerged humps. Drop shot dominant — wire leader or light fluorocarbon (6-8lb) with finesse worms in natural colors. Ned rig along bottom. Spybait effective in clear water.
- Fall: Smallmouth aggressively chase shad on main lake. Topwater (Lucky Craft Sammy 115, Spook Jr.) on slick mornings. Blade baits, blade-style swimbaits, and hair jigs on main lake points.
- Winter: Ned rig and drop shot in 15-25 feet near main lake humps and channel. Very clear water in winter — light line mandatory (6-8lb fluorocarbon or 4lb finesse).

Largemouth Bass (secondary):
- Coves, dock areas, and any flat sections with vegetation or brush. Texas rig (watermelon red), swim jig, and spinnerbait. Significantly fewer largemouth than smallmouth.

KEY STRUCTURES: Rocky bluffs throughout, gravel points and humps, Buckhorn Creek arm (largemouth), main lake boulders, submerged rock ledges, bridge pilings.

TOP BAITS: Drop shot Roboworm 4.5" (red shad, morning dawn — 6-8lb fluoro), Ned rig Z-Man TRD (green pumpkin, natural), tube jig (green pumpkin 3/16oz — Erie Dearie style), jerkbait (Megabass Vision 110, Rapala X-Rap 10 in clown/shad), Whopper Plopper 75, shaky head (1/8oz with Zoom Finesse Worm green pumpkin).

NOTES: Oklahoma's best smallmouth lake. Extremely clear water demands light line and finesse presentations. Rocky mountain terrain unlike any other OK lake. No wake zone restrictions in parts of lake — important for tournament fishing. Year-round pressure from OKC and DFW anglers. ODWC occasionally stocks additional smallmouth. Limited dock and vegetation structure — rock is everything.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake of the Arbuckles OK knowledge base',
  },

  // ─── Waurika Lake ─────────────────────────────────────────────────────────
  {
    lake_name: 'Waurika Lake', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/waurika',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Waurika Lake fishing guide',
  },
  {
    lake_name: 'Waurika Lake', state: 'OK', source_type: 'article',
    raw_text: `Waurika Lake, Oklahoma Bass Fishing Guide

Waurika Lake is a 10,100-acre Corps of Engineers reservoir in southwestern Oklahoma on Beaver Creek near the town of Waurika. Relatively clear to lightly stained water. Features gently sloping banks, sparse shoreline timber, extensive flats, points, and channel structure. Known for quality largemouth bass and spotted bass fishing in the southern Oklahoma plains.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 3-6 feet on clay/gravel flats and coves. Texas-rigged soft plastics (watermelon/red lizard or creature bait), spinnerbaits (white/chartreuse) on wind-blown points. Swim jigs along sparse timber. Hard topwater (Zara Spook, Whopper Plopper 110) on calm mornings. Spotted bass on main lake points with rocky structure.
- Summer: Bass move deeper — 12-20 feet on main lake points and creek channel drops. Carolina rig (green pumpkin Zoom Speed Craw), football jig (3/4oz green pumpkin), deep-diving crankbaits (Strike King 6XD in sexy shad). Windy conditions push fish to shallower points (spinnerbait/crankbait). Early morning and late evening topwater.
- Fall: Excellent shad-chase bite. Lipless crankbaits (Red Eye Shad, chrome/blue or sexy shad), swimbaits, and spinnerbaits in the backs of coves. Hard-hitting reaction baits as bass attack shad schools. One of the better fall fisheries in SW Oklahoma.
- Winter: Slow down — blade baits (1/2oz Heddon Sonar silver) on main lake humps, drop shot and shakey head in 15-25 feet near channel swings.

KEY STRUCTURES: Beaver Creek channel, Cow Creek arm, main lake points, submerged roadbeds and old fencerows (visible at low water), flats adjacent to main channel.

TOP BAITS: Texas rig watermelon/red lizard (3/0 or 4/0 EWG, 3/16oz sinker), spinnerbait (white double-willow 3/8oz), Carolina rig Speed Craw (green pumpkin), football jig (green pumpkin 3/4oz), lipless crankbait (chrome/blue Red Eye Shad), Whopper Plopper 110 (bone).

NOTES: Underrated regional bass lake with less fishing pressure than nearby Lake Murray or Broken Bow. Corps of Engineers manage water levels — can fluctuate significantly. Best fishing in spring and fall. Windy conditions common due to open plains terrain — use wind as an ally for crankbait and spinnerbait fishing. Good big-bass potential on light pressure days.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Waurika Lake OK knowledge base',
  },

  // ─── Lake Carl Blackwell ──────────────────────────────────────────────────
  {
    lake_name: 'Lake Carl Blackwell', state: 'OK', source_type: 'article',
    raw_text: `Lake Carl Blackwell, Oklahoma Bass Fishing Guide

Lake Carl Blackwell is a 3,370-acre reservoir near Stillwater in north-central Oklahoma, owned and managed by Oklahoma State University and located within Boomer Lake Park. Moderate to lightly stained water. Features timber standing in the upper lake, points, coves, and wind-driven flats. Excellent largemouth bass fishery with some smallmouth. Known as one of the best bass lakes within striking distance of Stillwater and OKC.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 2-5 feet around the standing timber in upper arms and in brushy coves. Texas-rigged creature baits (june bug, watermelon red), swim jigs (white shad 3/8oz), and hollow-body frogs (black/blue over emerging pads and around timber). Spinnerbaits effective on wind-blown flat banks.
- Summer: Bass move to timber edges in 8-15 feet and main lake points in 12-20 feet. Shakey heads (green pumpkin) around standing timber, Carolina rigs on long main lake points, deep-diving crankbaits (6XD, 10XD in sexy shad). Morning and evening topwater over timber.
- Fall: Active shad bite — lipless crankbaits and spinnerbaits following schools into upper arms. Hard action on reaction baits through October. Timber becomes a focal point again as water cools.
- Winter: Finesse — drop shot and shakey head in 15-20 feet near channel edges and standing timber. Blade baits on main lake humps.

KEY STRUCTURES: Upper lake standing timber (key feature), main lake flats, Stillwater Creek arm, main lake points, small docks/piers, road beds visible at low pool.

TOP BAITS: Texas rig creature bait (june bug/watermelon red), swim jig (white shad 3/8oz), hollow-body frog (Zoom Horny Toad black), shakey head (Zoom Trick Worm green pumpkin 3/16oz), Carolina rig Speed Craw (watermelon red), 6XD crankbait (sexy shad), lipless crankbait (Red Eye Shad chrome/blue).

NOTES: OSU-managed lake — access fees apply. Timber in upper lake is the defining structure (like Eufaula, but smaller scale). Less fishing pressure than major Oklahoma lakes. Consistent big largemouth produced annually. Some smallmouth near rocky main lake points. Good year-round fishery with spring and fall peaks.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Carl Blackwell OK knowledge base',
  },

  // ─── Lake Canton ─────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Canton', state: 'OK', source_type: 'article',
    url: 'https://www.wildlifedepartment.com/fishing/where-to-fish/canton',
    organization: 'ODWC', reported_date: '2024-01-01',
    notes: 'ODWC Lake Canton fishing guide',
  },
  {
    lake_name: 'Lake Canton', state: 'OK', source_type: 'article',
    raw_text: `Lake Canton, Oklahoma Bass Fishing Guide

Lake Canton (Canton Lake) is a 7,500-acre Corps of Engineers reservoir in northwestern Oklahoma on the North Canadian River near Canton. Turbid/stained to muddy water typical due to red clay runoff. Windy plains environment — located in the Oklahoma panhandle region. Known primarily for largemouth bass and spotted bass. One of the main bass lakes in the western half of Oklahoma.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 2-4 feet in coves, on clay-bank flats, and around any structure (dock posts, sparse brush). Stained water favors reaction baits — spinnerbaits (chartreuse/white double-willow 1/2oz), squarebill crankbaits (chartreuse sexy shad, red craw), swim jigs (white). Texas-rigged plastics also effective near sparse structure.
- Summer: Move deeper to 10-15 feet on main lake points and channel edges. Carolina rig (crawfish-color creature baits), football jig (3/4oz brown/green pumpkin), deep crankbaits. Wind is constant — use it for reaction bait fishing on windward banks and points.
- Fall: Shad migration — lipless crankbaits and swimbaits very effective. One of the best times on Canton as bass are aggressive and shad are abundant.
- Winter: Slow presentation — drop shot or shakey head near main channel drops. Blade baits on points.

KEY STRUCTURES: North Canadian River channel, long tapering main lake points, coves with clay banks, any sparse timber or brush, main lake humps, boat docks.

TOP BAITS: Spinnerbait (chartreuse/white double-willow 1/2oz — Booyah Blade), squarebill crankbait (KVD 1.5 chartreuse sexy shad), swim jig (white shad 3/8oz), Texas rig (watermelon/red or chartreuse pepper Speed Craw), football jig (brown/green pumpkin 3/4oz), lipless crankbait (chrome/blue Red Eye Shad), Carolina rig creature bait.

NOTES: Turbid water is normal — high-vis baits and reaction presentations outperform finesse. Wind is a constant factor; many pros say the windiest bank is often the best bank. Relatively low tournament pressure compared to eastern OK lakes. Decent spotted bass population mixed with largemouth. Spring spawning bite on clay banks is the premier event.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Canton OK knowledge base',
  },

  // ─── Arcadia Lake ─────────────────────────────────────────────────────────
  {
    lake_name: 'Arcadia Lake', state: 'OK', source_type: 'article',
    raw_text: `Arcadia Lake, Oklahoma Bass Fishing Guide

Arcadia Lake is a 1,820-acre City of Edmond water supply reservoir on the Deep Fork River in the Oklahoma City metro area, north of Arcadia. Clear to lightly stained water. Features rocky banks, small coves, points, and sparse submerged timber. A popular OKC-area bass lake known for quality largemouth on light pressure days. Good size fish relative to lake size.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 2-5 feet along rocky banks and cove flats. Finesse approaches work well in the clear water — shaky heads (Zoom Finesse Worm, green pumpkin, 3/16oz), drop shot (Roboworm 4.5" morning dawn), and swim jigs along rocky transitions. Jerkbaits (Megabass Vision 110, Rapala X-Rap) in prespawn along points and bluff-style banks.
- Summer: Deeper structure — main lake points 10-20 feet with finesse drop shot, Carolina rig, and football jig. Clear water demands light line (8-12lb fluorocarbon). Shakey head around rocky humps. Early morning and evening only for topwater.
- Fall: Very good fall bite — reaction baits as bass chase shad. Spinnerbaits, lipless crankbaits, and squarebill crankbaits on main lake points and rocky banks. Topwater (Whopper Plopper 75-90, walking baits) early morning through October.
- Winter: Finesse — drop shot and Ned rig in 15-20 feet on main lake structure. Very clear water; 6-8lb fluorocarbon recommended.

KEY STRUCTURES: Rocky main lake points, small coves with gravel/clay bottom, Deep Fork Creek arm, boat docks, sparse timber in upper creek arms.

TOP BAITS: Shaky head (green pumpkin Zoom Finesse Worm, 3/16oz), drop shot (Roboworm 4.5" morning dawn/red shad, 8lb fluoro), jerkbait (Megabass Vision 110 ghost shad), swim jig (white shad 3/8oz), lipless crankbait (Red Eye Shad sexy shad), Whopper Plopper 75 (bone/sexy shad), football jig (green pumpkin 1/2oz).

NOTES: City of Edmond reservoir — access permit or annual pass required. Clear water lake — finesse and light line outperform power fishing most of the year. High recreational boat traffic on weekends limits weekend morning fishing. Excellent weekday fishery with consistent quality largemouth. Urban lake with surprisingly good fish quality. Limited bank access — boat required for most fishing.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Arcadia Lake OK knowledge base',
  },

  // ─── Fort Supply Lake ─────────────────────────────────────────────────────
  {
    lake_name: 'Fort Supply Lake', state: 'OK', source_type: 'article',
    raw_text: `Fort Supply Lake, Oklahoma Bass Fishing Guide

Fort Supply Lake is a 1,820-acre Corps of Engineers reservoir in northwestern Oklahoma on Wolf Creek near the town of Fort Supply. Typically turbid to muddy water from red clay plains. A remote and lightly pressured bass lake in far northwestern Oklahoma. Features open, wind-swept banks, sparse shoreline timber, and main lake points.

KEY PATTERNS:
- Spring (Mar-May): Best time to fish. Largemouth spawn in 2-4 feet along clay banks, in coves, and around any available structure. Spinnerbaits (chartreuse/white 3/8-1/2oz) and squarebill crankbaits dominant in stained water. Swim jigs and Texas-rigged plastics (watermelon/red, chartreuse pepper) around structure. Topwater early morning.
- Summer: Deep fish on channel edges and main lake points, 10-15 feet. Wind is constant — keep reaction baits tied on. Crankbaits and Carolina rigs on points. Very hot, exposed lake in summer; fish early and late.
- Fall: Active shad-chase period — lipless crankbaits and swimbaits. Best reaction bite of the year.
- Winter: Slow finesse near channel structure. Very cold and windy — access can be difficult.

KEY STRUCTURES: Wolf Creek channel, main lake points, clay-bank coves, any sparse timber or dock structure.

TOP BAITS: Spinnerbait (chartreuse/white 1/2oz), squarebill crankbait (chartreuse sexy shad, fire tiger), swim jig (white shad), Texas rig (watermelon/red Speed Craw), lipless crankbait (chrome/blue).

NOTES: Very remote — one of Oklahoma's least-pressured bass lakes. Turbid water typical. Wind is nearly constant in northwest Oklahoma; windward banks often most productive. Small, regional lake — best as a day trip from the Woodward area. Largemouth only (no significant spotted bass population). Spring spawning on clay banks is peak season.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Fort Supply Lake OK knowledge base',
  },

  // ─── Lake Heyburn ─────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Heyburn', state: 'OK', source_type: 'article',
    raw_text: `Lake Heyburn, Oklahoma Bass Fishing Guide

Lake Heyburn is a 920-acre state-managed reservoir in northeastern Oklahoma near Sapulpa in Creek County. Part of Lake Heyburn State Park. Lightly to moderately stained water. Features coves with timber, rocky points, and shoreline brush. A well-loved regional lake known for consistent largemouth bass fishing and excellent facilities (state park campground, fishing piers, boat ramps).

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 2-5 feet around timber in coves and on brush-lined points. Texas-rigged plastics (june bug lizard, watermelon red creature bait), swim jigs, and spinnerbaits. Topwater (Zara Spook, BOOYAH Pad Crasher frog) around timber in morning.
- Summer: Move to timber edges in 8-15 feet. Shakey head (green pumpkin Trick Worm), Carolina rig on main lake points, drop shot near timber. Morning topwater bites can be excellent.
- Fall: Shad push creates good reaction-bait fishing in upper coves and along main lake. Lipless crankbaits and swimbaits in October/November. Timber continues to hold fish.
- Winter: Slow down — shakey head and drop shot near timber in 12-18 feet. Blade baits on main lake points.

KEY STRUCTURES: Standing timber throughout, Rocky Point, coves with laydowns and brush, boat docks, main lake point rock transitions.

TOP BAITS: Texas rig (june bug lizard, 3/0 EWG), swim jig (white shad 3/8oz), spinnerbait (white/chartreuse), shakey head (green pumpkin Zoom Trick Worm), topwater frog (BOOYAH Pad Crasher black), lipless crankbait (Red Eye Shad).

NOTES: State park lake — well-maintained access with launch ramp, camping, and fishing pier. Limited size but quality fish-per-acre ratio. One of the better state park lakes for largemouth in NE Oklahoma. Good family fishing destination with the park facilities. Best fishing weekdays or early weekend mornings before recreational traffic.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Heyburn OK knowledge base',
  },

  // ─── Lake Lawtonka ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Lawtonka', state: 'OK', source_type: 'article',
    raw_text: `Lake Lawtonka, Oklahoma Bass Fishing Guide

Lake Lawtonka is a 2,200-acre reservoir near Lawton in southwestern Oklahoma, within the Wichita Mountains Wildlife Refuge area. Features granite boulders, rocky points, clear to lightly stained water, and a backdrop of the Wichita Mountains. Known for largemouth and smallmouth bass in a scenic rocky highland environment unusual for southwestern Oklahoma.

KEY PATTERNS:
- Spring (Mar-May): Largemouth in shallow rocky coves and on gravel/boulder flats. Smallmouth on rocky points and bluffs. Finesse works well in the clear water — shaky head (green pumpkin finesse worm), drop shot (Roboworm, morning dawn/red shad), tube jigs (green pumpkin/brown) for smallmouth. Jerkbaits along rocky banks in prespawn. Swim jigs and spinnerbaits for largemouth.
- Summer: Both species move deeper (12-20 ft) to rocky humps and main lake structure. Drop shot dominant. Clear-water finesse — light fluorocarbon (8-10lb).
- Fall: Active period — Ned rigs, tube jigs, and jerkbaits for smallmouth on main lake structure. Lipless crankbaits for largemouth near shad schools.
- Winter: Slow finesse near deep rocky structure. Drop shot and Ned rig.

KEY STRUCTURES: Granite boulder banks, rocky main lake points, Meers Creek arm, Eagle Lake area (connected), boat docks, deep rocky humps.

TOP BAITS: Drop shot Roboworm (morning dawn, red shad — 8lb fluoro), tube jig (green pumpkin 3/16oz), Ned rig Z-Man TRD (green pumpkin, natural brown), shaky head (Zoom Finesse Worm green pumpkin), jerkbait (Rapala X-Rap 10 in shad colors), spinnerbait (white/willow 3/8oz).

NOTES: Scenic Wichita Mountains setting. Clear water demands finesse approach — lighter line and natural colors. Both largemouth and smallmouth present; rocky bank = smallmouth, sandy/shallow coves = largemouth. Military base proximity limits access to some areas; check current access regulations. Excellent spring smallmouth fishing on the granite points.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Lawtonka OK knowledge base',
  },

  // ─── Tom Steed Reservoir ──────────────────────────────────────────────────
  {
    lake_name: 'Tom Steed Reservoir', state: 'OK', source_type: 'article',
    raw_text: `Tom Steed Reservoir, Oklahoma Bass Fishing Guide

Tom Steed Reservoir (also known as Lake Tom Steed) is a 5,300-acre Bureau of Reclamation reservoir in southwestern Oklahoma near Mountain Park. Relatively clear, highland-influenced water with granite/rocky sections near the Wichita Mountains area. Features rocky points, coves, and submerged structure. Known for quality largemouth and smallmouth bass in a lightly pressured setting.

KEY PATTERNS:
- Spring (Mar-May): Largemouth on shallow cove flats, smallmouth on rocky points. Spinnerbaits and swim jigs for largemouth; shaky head, drop shot, and tube jig for smallmouth. Clear water — finesse presentations with 10-12lb fluorocarbon. Jerkbaits effective for both species in prespawn.
- Summer: Deeper rocky structure (15-20 ft). Drop shot and Carolina rig on main lake points. Night fishing can be productive (largemouth on topwater around rocky shores).
- Fall: Active reaction bait period — lipless crankbaits and swimbaits. Good fall largemouth feeding on shad.
- Winter: Finesse near deep structure. Slow blade baits, Ned rigs.

KEY STRUCTURES: Rocky points and banks (mixed granite/limestone), coves with gravel bottom, main lake humps, submerged roadbeds.

TOP BAITS: Shaky head (green pumpkin finesse worm), drop shot (Roboworm), tube jig (green pumpkin 3/16oz), swim jig (white 3/8oz), spinnerbait (white willow 3/8oz), jerkbait (Rapala X-Rap shad), lipless crankbait (Red Eye Shad chrome/blue).

NOTES: Remote and lightly pressured — good destination for anglers seeking quality over quantity. Both largemouth and smallmouth present. Bureau of Reclamation access; check current regulations. Spring and fall peak fishing. Scenic SW Oklahoma setting with Wichita Mountains backdrop.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Tom Steed Reservoir OK knowledge base',
  },

  // ─── Lake Overholser ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Overholser', state: 'OK', source_type: 'article',
    raw_text: `Lake Overholser, Oklahoma Bass Fishing Guide

Lake Overholser is a 1,500-acre Oklahoma City water supply reservoir on the North Canadian River on the west side of OKC. Moderate to turbid water typical. Features open flats, riprap banks, boat docks, and limited vegetation. An urban OKC-area lake known for accessible largemouth bass fishing. Popular with city anglers due to central location and solid bass population.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in 2-5 feet along riprap banks, dock posts, and in the limited cove structure. Squarebill crankbaits (chartreuse shad, red craw) on riprap are very effective. Texas rig (watermelon/red) around dock posts. Spinnerbaits on open flat banks. Swim jigs and chatterbaits near any available cover.
- Summer: Deeper docks and main lake channel edges (10-15 ft). Drop shot around dock posts, Carolina rig on open flats, late evening topwater along riprap. Very hot urban summer — fish early morning only.
- Fall: Good shad-chase bite — lipless crankbaits and swimbaits along riprap and open water. Active period from September through November.
- Winter: Finesse — drop shot and shakey head near dock posts and channel edges.

KEY STRUCTURES: Riprap dam face (excellent), dock fields, North Canadian River inlet area, open flats on north end, rock groins and jetties.

TOP BAITS: Squarebill crankbait (KVD 1.5 red craw, chartreuse shad), spinnerbait (chartreuse/white 1/2oz), Texas rig (watermelon/red creature bait), chatterbait/bladed jig (white or chartreuse), drop shot (Roboworm around dock posts), lipless crankbait (chrome/blue Red Eye Shad).

NOTES: Urban OKC lake — heavy recreational traffic on weekends; best fished early morning on weekdays. City of OKC water supply — no gas motors at certain times (check current regulations). Riprap is the premier structure; work the entire dam face systematically. Solid largemouth population despite urban setting. Easy access for OKC anglers.`,
    organization: 'AnglerIQ Curated', reported_date: '2024-01-01',
    notes: 'Curated Lake Overholser OK knowledge base',
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${SOURCES.length} sources for additional OK lakes...\n`)

  // Fetch existing URLs to avoid duplicates
  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('url, raw_text')
    .eq('state', 'OK')

  const existingUrls = new Set((existing || []).filter(r => r.url).map(r => r.url))
  const existingRawTexts = new Set((existing || []).filter(r => r.raw_text).map(r => r.raw_text?.slice(0, 80)))

  let inserted = 0, skipped = 0
  for (const item of SOURCES) {
    // De-dupe by URL or by rawText prefix
    if (item.url && existingUrls.has(item.url)) {
      console.log(`  ⏭  Skip (URL exists): ${item.url.slice(0, 75)}`)
      skipped++
      continue
    }
    if (item.raw_text && existingRawTexts.has(item.raw_text.slice(0, 80))) {
      console.log(`  ⏭  Skip (rawText exists): ${item.lake_name}`)
      skipped++
      continue
    }

    const { error } = await supabase.from('ingest_queue').insert({
      lake_name:     item.lake_name,
      state:         item.state,
      source_type:   item.source_type,
      url:           item.url ?? null,
      raw_text:      item.raw_text ?? null,
      organization:  item.organization ?? null,
      reported_date: item.reported_date ?? null,
      notes:         item.notes,
      status:        'pending',
    })

    if (error) {
      console.error(`  ❌ ${item.lake_name}: ${error.message}`)
    } else {
      const src = item.url ? item.url.slice(0, 60) : `[rawText]`
      console.log(`  ✅ ${item.lake_name.padEnd(35)} ${src}`)
      inserted++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped`)
}

main().catch(console.error)
