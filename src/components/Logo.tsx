export function Logo({ className = '', variant = 'dark' }: { className?: string; variant?: 'dark' | 'light' }) {
  const anglerColor = variant === 'light' ? '#E2E8F0' : '#0F172A'   // slate-200 vs slate-900
  const iqColor     = variant === 'light' ? '#60A5FA' : '#2563EB'   // blue-400 vs blue-600
  const iconColor   = variant === 'light' ? '#60A5FA' : '#2563EB'

  return (
    <svg
      viewBox="0 0 160 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AnglerIQ"
    >
      {/* Hook mark */}
      <path
        d="M10 6 C10 6, 18 4, 20 12 C22 20, 14 24, 10 20 C6 16, 10 10, 16 12"
        stroke={iconColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="20.5" r="1.5" fill={iconColor} />
      {/* Wordmark */}
      <text
        x="28"
        y="26"
        fontFamily="Montserrat, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill={anglerColor}
        letterSpacing="-0.5"
      >
        Angler
      </text>
      <text
        x="108"
        y="26"
        fontFamily="Montserrat, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill={iqColor}
        letterSpacing="-0.5"
      >
        IQ
      </text>
    </svg>
  )
}
