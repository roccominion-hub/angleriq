export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AnglerIQ"
    >
      {/* Hook mark — stylized fishing hook forming an accent */}
      <path
        d="M10 6 C10 6, 18 4, 20 12 C22 20, 14 24, 10 20 C6 16, 10 10, 16 12"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="20.5" r="1.5" fill="#2563EB" />
      {/* Wordmark */}
      <text
        x="28"
        y="26"
        fontFamily="Montserrat, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#0F172A"
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
        fill="#2563EB"
        letterSpacing="-0.5"
      >
        IQ
      </text>
    </svg>
  )
}
