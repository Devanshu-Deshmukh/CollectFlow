import { useId } from 'react'

const SIZES = {
  sm: { tile: 30, text: 'text-sm', sub: 'text-[10px]' },
  md: { tile: 36, text: 'text-base', sub: 'text-[11px]' },
  lg: { tile: 44, text: 'text-xl', sub: 'text-xs' },
}

// The mark: two touchpoints joined by a flow line — money moving from "invoiced" to "received".
export function LogoMark({ size = 36, className = '' }) {
  const gradientId = `collectflow-mark-${useId().replace(/:/g, '')}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0f766e" />
          <stop offset="1" stopColor="#0b4a45" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      <path
        d="M11 29C20 29 20 11 29 11"
        stroke="#ffffff"
        strokeOpacity="0.9"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="11" cy="29" r="3.2" fill="#5eead4" />
      <circle cx="29" cy="11" r="3.2" fill="#ffffff" />
    </svg>
  )
}

export function BrandLogo({ size = 'md', tone = 'light', subtitle, className = '' }) {
  const scale = SIZES[size] ?? SIZES.md
  const primary = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const accent = tone === 'dark' ? 'text-teal-300' : 'text-teal-700'
  const muted = tone === 'dark' ? 'text-teal-200/70' : 'text-slate-500'

  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <LogoMark size={scale.tile} />
      <div className="leading-tight">
        <p className={`${scale.text} font-semibold tracking-tight`}>
          <span className={primary}>Collect</span>
          <span className={accent}>Flow</span>
        </p>
        {subtitle && (
          <p className={`${scale.sub} font-medium uppercase tracking-[0.14em] ${muted}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
