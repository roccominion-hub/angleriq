import React from 'react'

function CrankbaitIcon() {
  return (
    <svg viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Body */}
      <ellipse cx="42" cy="25" rx="22" ry="10" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Lip */}
      <path d="M20 28 L10 38" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
      {/* Eye */}
      <circle cx="58" cy="22" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="58" cy="22" r="1" fill="#1e293b"/>
      {/* Belly hook */}
      <line x1="38" y1="35" x2="38" y2="42" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M38 42 Q42 46 38 48 Q34 46 36 43" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Tail hook */}
      <line x1="22" y1="30" x2="22" y2="37" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M22 37 Q26 41 22 43 Q18 41 20 38" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Tail fin */}
      <path d="M20 22 Q14 18 12 14 M20 22 Q14 26 12 30" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function JerkbaitIcon() {
  return (
    <svg viewBox="0 0 90 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Slender body */}
      <path d="M15 20 Q20 12 55 14 Q72 14 78 20 Q72 26 55 26 Q20 28 15 20Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Lip */}
      <path d="M15 20 L6 28" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
      {/* Eye */}
      <circle cx="68" cy="19" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="68" cy="19" r="1" fill="#1e293b"/>
      {/* Hooks */}
      <line x1="50" y1="26" x2="50" y2="33" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M50 33 Q54 37 50 39 Q46 37 48 34" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="28" y1="26" x2="28" y2="33" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M28 33 Q32 37 28 39 Q24 37 26 34" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Tail */}
      <path d="M15 17 Q8 13 5 9 M15 17 Q8 21 5 25" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function JigIcon() {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Jig head */}
      <ellipse cx="30" cy="18" rx="14" ry="14" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="36" cy="14" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="36" cy="14" r="1" fill="#1e293b"/>
      {/* Hook shaft */}
      <path d="M30 32 L30 52 Q30 62 20 68 Q12 72 14 64 Q16 58 22 58" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Skirt strands */}
      <path d="M22 28 Q18 38 14 48" stroke="#64748b" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
      <path d="M26 30 Q24 42 20 52" stroke="#64748b" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
      <path d="M30 31 Q30 44 28 54" stroke="#64748b" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
      <path d="M34 30 Q36 42 38 52" stroke="#64748b" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
      <path d="M38 28 Q42 38 44 48" stroke="#64748b" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
    </svg>
  )
}

function SoftPlasticIcon() {
  return (
    <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Worm body */}
      <path d="M10 20 Q20 12 30 20 Q40 28 50 20 Q60 12 70 20 Q80 28 88 22" stroke="#94a3b8" strokeWidth="7" fill="none" strokeLinecap="round"/>
      <path d="M10 20 Q20 12 30 20 Q40 28 50 20 Q60 12 70 20 Q80 28 88 22" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Tail flap */}
      <path d="M88 22 Q95 16 92 10 M88 22 Q96 24 95 30" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Hook */}
      <path d="M60 16 Q66 10 70 14 Q74 18 70 22" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="70" y1="22" x2="62" y2="28" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function TopwaterIcon() {
  return (
    <svg viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Water line */}
      <path d="M5 30 Q15 26 25 30 Q35 34 45 30 Q55 26 65 30 Q75 34 85 30" stroke="#93c5fd" strokeWidth="1.5" fill="none" opacity="0.7"/>
      {/* Body - torpedo/popper shape */}
      <path d="M20 24 Q24 16 50 18 Q70 18 74 24 Q70 30 50 30 Q24 32 20 24Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Cupped mouth */}
      <path d="M20 24 Q16 20 18 24 Q16 28 20 24" fill="#475569" stroke="#64748b" strokeWidth="1"/>
      {/* Eye */}
      <circle cx="65" cy="22" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="65" cy="22" r="1" fill="#1e293b"/>
      {/* Hooks */}
      <line x1="46" y1="30" x2="46" y2="38" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M46 38 Q50 42 46 44 Q42 42 44 39" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="28" y1="30" x2="28" y2="38" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M28 38 Q32 42 28 44 Q24 42 26 39" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Splash dots */}
      <circle cx="12" cy="26" r="1.5" fill="#93c5fd" opacity="0.6"/>
      <circle cx="8" cy="22" r="1" fill="#93c5fd" opacity="0.5"/>
      <circle cx="16" cy="20" r="1" fill="#93c5fd" opacity="0.4"/>
    </svg>
  )
}

function SwimbaitIcon() {
  return (
    <svg viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Body */}
      <path d="M20 25 Q26 14 55 16 Q72 16 76 25 Q72 34 55 34 Q26 36 20 25Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Paddle tail */}
      <path d="M20 25 Q12 20 8 14 Q6 20 8 25 Q6 30 8 36 Q12 30 20 25Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Belly seam */}
      <path d="M22 28 Q45 30 72 28" stroke="#64748b" strokeWidth="1" opacity="0.4" strokeDasharray="3 2"/>
      {/* Eye */}
      <circle cx="67" cy="22" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="67" cy="22" r="1" fill="#1e293b"/>
      {/* Hook */}
      <line x1="45" y1="34" x2="45" y2="42" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M45 42 Q49 46 45 48 Q41 46 43 43" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function SpinnerbaitIcon() {
  return (
    <svg viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Wire arm */}
      <path d="M45 45 L70 20 L80 14" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M45 45 L25 50" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Blade */}
      <ellipse cx="78" cy="12" rx="8" ry="5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" transform="rotate(-30 78 12)"/>
      {/* Jig head */}
      <ellipse cx="45" cy="45" rx="8" ry="7" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="48" cy="43" r="1.5" fill="white" stroke="#64748b" strokeWidth="0.8"/>
      {/* Hook */}
      <path d="M25 50 Q18 56 20 62 Q24 66 28 62" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Skirt */}
      <path d="M42 50 Q38 58 36 64" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M45 51 Q43 60 42 66" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M48 50 Q48 59 48 65" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
    </svg>
  )
}

function BladedJigIcon() {
  return (
    <svg viewBox="0 0 80 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Blade / chatter plate */}
      <path d="M20 28 Q30 16 50 24 L48 36 Q30 40 20 28Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5"/>
      {/* Jig head */}
      <ellipse cx="48" cy="32" rx="10" ry="8" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="52" cy="30" r="1.5" fill="white" stroke="#64748b" strokeWidth="0.8"/>
      {/* Hook */}
      <path d="M38 36 Q32 46 34 52 Q38 56 42 52" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Skirt */}
      <path d="M44 40 Q40 50 38 58" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M48 41 Q46 52 46 60" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M52 40 Q52 50 54 58" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
    </svg>
  )
}

function DropShotIcon() {
  return (
    <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Main line */}
      <line x1="30" y1="5" x2="30" y2="30" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* Hook */}
      <path d="M30 30 Q44 30 44 38 Q44 46 36 46 Q28 46 28 38" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Small plastic */}
      <path d="M28 36 Q32 30 38 34 Q40 38 36 42 Q30 44 28 40 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.2"/>
      {/* Line to weight */}
      <line x1="30" y1="46" x2="30" y2="68" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* Weight */}
      <ellipse cx="30" cy="74" rx="6" ry="9" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
    </svg>
  )
}

function NedRigIcon() {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Mushroom jig head */}
      <path d="M22 32 Q30 20 38 32 Q36 38 30 38 Q24 38 22 32Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="35" cy="28" r="2" fill="white" stroke="#64748b" strokeWidth="0.8"/>
      <circle cx="35" cy="28" r="0.8" fill="#1e293b"/>
      {/* Hook */}
      <path d="M24 36 Q18 44 20 52 Q24 58 30 54" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Short plastic stub */}
      <path d="M30 38 Q28 50 30 58 Q32 62 34 58 Q36 52 34 38" fill="#94a3b8" stroke="#64748b" strokeWidth="1.2"/>
    </svg>
  )
}

function SpoonIcon() {
  return (
    <svg viewBox="0 0 50 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Spoon body */}
      <path d="M25 10 Q38 14 40 28 Q40 44 25 50 Q10 44 10 28 Q12 14 25 10Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5"/>
      {/* Shine */}
      <path d="M18 18 Q22 14 28 16" stroke="white" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
      {/* Split ring at top */}
      <circle cx="25" cy="10" r="3" fill="none" stroke="#64748b" strokeWidth="1.5"/>
      {/* Treble hook at bottom */}
      <line x1="25" y1="50" x2="25" y2="58" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M25 58 Q29 62 25 64 Q21 62 23 59" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M25 58 Q18 60 18 66 Q22 68 24 64" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function FrogIcon() {
  return (
    <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Body */}
      <ellipse cx="40" cy="34" rx="20" ry="14" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Head bump */}
      <ellipse cx="40" cy="24" rx="14" ry="10" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eyes */}
      <circle cx="32" cy="20" r="4" fill="white" stroke="#64748b" strokeWidth="1.2"/>
      <circle cx="32" cy="20" r="1.8" fill="#1e293b"/>
      <circle cx="48" cy="20" r="4" fill="white" stroke="#64748b" strokeWidth="1.2"/>
      <circle cx="48" cy="20" r="1.8" fill="#1e293b"/>
      {/* Legs */}
      <path d="M20 40 Q12 44 8 52" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M60 40 Q68 44 72 52" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Hooks (weedless, pointing up) */}
      <path d="M34 48 Q34 54 38 52" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M46 48 Q46 54 42 52" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function DefaultLureIcon() {
  return (
    <svg viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Generic lure body */}
      <ellipse cx="42" cy="25" rx="22" ry="11" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="57" cy="22" r="2.5" fill="white" stroke="#64748b" strokeWidth="1"/>
      <circle cx="57" cy="22" r="1" fill="#1e293b"/>
      {/* Hook */}
      <line x1="36" y1="36" x2="36" y2="43" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M36 43 Q40 47 36 49 Q32 47 34 44" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Tail */}
      <path d="M20 22 Q13 18 10 13 M20 22 Q13 26 10 31" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function BaitIcon({ baitName, baitType }: { baitName?: string; baitType?: string }) {
  const combined = `${baitName || ''} ${baitType || ''}`.toLowerCase()

  if (combined.includes('crankbait') || combined.includes('crank')) return <CrankbaitIcon />
  if (combined.includes('jerkbait') || combined.includes('jerk')) return <JerkbaitIcon />
  if (combined.includes('swimbait') || combined.includes('swimjig') || combined.includes('swim jig')) return <SwimbaitIcon />
  if (combined.includes('frog')) return <FrogIcon />
  if (combined.includes('topwater') || combined.includes('popper') || combined.includes('walker') || combined.includes('buzz')) return <TopwaterIcon />
  if (combined.includes('spinnerbait') || combined.includes('spinner')) return <SpinnerbaitIcon />
  if (combined.includes('bladed') || combined.includes('chatter')) return <BladedJigIcon />
  if (combined.includes('ned')) return <NedRigIcon />
  if (combined.includes('drop shot') || combined.includes('dropshot')) return <DropShotIcon />
  if (combined.includes('jig')) return <JigIcon />
  if (combined.includes('spoon')) return <SpoonIcon />
  if (combined.includes('soft plastic') || combined.includes('worm') || combined.includes('craw') || combined.includes('creature') || combined.includes('senko') || combined.includes('stick')) return <SoftPlasticIcon />

  return <DefaultLureIcon />
}
