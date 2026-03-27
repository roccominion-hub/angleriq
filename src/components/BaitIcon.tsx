import Image from 'next/image'

const BAIT_MAP: { file: string; matches: string[] }[] = [
  { file: 'crankbait-lipless',  matches: ['lipless', 'rat-l-trap', 'rattle trap', 'red eye shad', 'lv', 'level vibe'] },
  { file: 'crankbait-squarebill', matches: ['squarebill', 'square bill', 'square-bill', '1.5', '2.5', 'rc 1.5', 'rc 2.5', 'rc2.5', 'rc1.5', 'magnum squarebill'] },
  { file: 'crankbait-deep',     matches: ['10xd', '6xd', '8xd', 'deep crank', 'deep diving', 'deep-diving', 'deep diver', '10 xd', '6 xd', 'dxd', 'deep crankbait'] },
  { file: 'crankbait-shallow',  matches: ['crankbait', 'crank bait', 'crank', 'shallow crank', 'medium crank', 'flat-sided', 'flat sided'] },
  { file: 'jerkbait',           matches: ['jerkbait', 'jerk bait', 'suspending jerk', 'hard jerk', 'pointer', 'vision 110', 'slash', 'enticer'] },
  { file: 'swimbait',           matches: ['swimbait', 'swim bait', 'paddle tail', 'boot tail', 'keitech', 'round jighead', 'round jig head', 'shad tail', 'swimsenko', 'stunna', 'berkley stunna', 'aruku shad', 'livetarget straight tail', 'glide bait', 'glidebait', 'glide', 'deps', 'slide swimmer', 'megabass', 'triple trout', 'big hammer', 'huddleston', 'mattlures', 'matt lures', '250', 'wake bait', 'wakebait', 'line thru'] },
  { file: 'swimjig',            matches: ['swimjig', 'swim jig', 'swimming jig'] },
  { file: 'bladed-jig',         matches: ['bladed jig', 'bladed', 'chatterbait', 'chatter bait', 'vibrating jig', 'z-man jack hammer', 'jackhammer'] },
  { file: 'jig',                matches: ['jig', 'football jig', 'flipping jig', 'casting jig', 'finesse jig', 'hair jig', 'arky', 'punch rig', 'punch bait'] },
  { file: 'spinnerbait',        matches: ['spinnerbait', 'spinner bait', 'spinner', 'double willow', 'tandem'] },
  { file: 'buzzbait',           matches: ['buzzbait', 'buzz bait', 'buzz', 'popping frog', 'buzzfrog'] },
  { file: 'topwater-popper',    matches: ['popper', 'chug', 'pop-r', 'pop r', 'dahlberg', 'whopper plopper', 'plopper'] },
  { file: 'topwater-walker',    matches: ['topwater', 'walking bait', 'walk the dog', 'spook', 'super spook', 'one knocker', 'gunfish', 'sammy', 'xpod'] },
  { file: 'frog',               matches: ['hollow body frog', 'hollow frog', 'frog', 'pad frog', 'popping frog', 'zoom super fluke frog'] },
  { file: 'toad',               matches: ['toad', 'horny toad', 'zoom toad', 'flap jack', 'ribbit', 'swimming toad', 'rage toad'] },
  { file: 'senko',              matches: ['senko', 'stick bait', 'stick-bait', 'stickbait', 'wacky', 'neko', 'flick shake', 'yamamoto', 'ocho', 'fat senko'] },
  { file: 'worm-straight',      matches: ['straight tail worm', 'straight worm', 'finesse worm', 'rebarb', 'roboworm', 'power worm', 'ribbon tail', 'trick worm', 'shakey head', 'shaky head'] },
  { file: 'worm-curly',         matches: ['curly tail', 'curly worm', 'grub worm', 'curl tail', 'swimming worm', 'worm'] },
  { file: 'craw',               matches: ['craw', 'crawfish', 'crawdad', 'creature craw', 'rage craw', 'brush hog craw', 'chunk', 'paca craw', 'space monkey'] },
  { file: 'creature',           matches: ['creature', 'brush hog', 'beaver', 'rage bug', 'hula grub', 'missile baits', 'd bomb', 'rage chunk', 'zoom brush hog', 'havoc', 'pit boss', 'berkley pit', 'creature hawg', 'slobberknocker', 'cull shad'] },
  { file: 'lizard',             matches: ['lizard', 'zoom lizard', 'gator', 'baby lizard'] },
  { file: 'tube',               matches: ['tube', 'tube bait', 'tube jig', 'do-it tube'] },
  { file: 'grub',               matches: ['grub', 'power grub', 'kalin grub', 'curly grub', 'single tail grub'] },
  { file: 'minnow-soft',        matches: ['soft jerkbait', 'soft jerk', 'fluke', 'super fluke', 'minnow', 'shad imitation', 'mc craw', 'sluggo', 'gulp minnow', 'damiki', 'shaking squirrel'] },
  { file: 'ned-rig',            matches: ['ned', 'ned rig', 'mushroom head', 'finesse trd', 'trd', 'ned worm', 'zman ned', 'elaztech'] },
  { file: 'drop-shot',          matches: ['drop shot', 'dropshot', 'drop-shot', 'ds rig', 'drop shot rig'] },
  { file: 'spoon',              matches: ['spoon', 'flutter spoon', 'jigging spoon', 'casting spoon', 'drone spoon', 'cc spoon'] },
  { file: 'dice',               matches: [
    'dice', 'fuzzy dice', 'dice bait',
    'tumbleweed', 'strike king tumbleweed',
    'fuzzy nuki', 'yamamoto fuzzy', 'nuki',
    'cue bomb', 'geecrack cue',
    'pompom', 'pom pom', 'squarepom',
    'cube bait', 'fuzzy bait',
  ] },
  { file: 'default',            matches: [] },
]

function resolveIcon(baitName?: string, baitType?: string): string {
  // Check bait name first — more specific, takes priority
  const name = (baitName || '').toLowerCase().trim()
  if (name) {
    for (const { file, matches } of BAIT_MAP) {
      if (matches.some(m => name.includes(m))) return file
    }
  }
  // Fall back to bait type only if name didn't match
  const type = (baitType || '').toLowerCase().trim()
  if (type) {
    for (const { file, matches } of BAIT_MAP) {
      if (matches.some(m => type.includes(m))) return file
    }
  }
  return 'default'
}

export function BaitIcon({ baitName, baitType, size = 'md' }: {
  baitName?: string
  baitType?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const file = resolveIcon(baitName, baitType)
  const src = `/baits/${file}.png`

  const dims = { sm: 48, md: 96, lg: 140 }[size]

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Image
        src={src}
        alt={baitName || baitType || 'fishing lure'}
        width={dims}
        height={dims}
        className="object-contain drop-shadow-sm"
        onError={(e) => {
          // Fall back to default if image missing
          const img = e.currentTarget as HTMLImageElement
          if (!img.src.includes('default')) img.src = '/baits/default.png'
        }}
      />
    </div>
  )
}

// Utility: get just the filename for a given bait (for use outside JSX)
export function getBaitIconFile(baitName?: string, baitType?: string): string {
  return resolveIcon(baitName, baitType)
}
