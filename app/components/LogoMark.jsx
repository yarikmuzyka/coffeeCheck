export function LogoMark({ className = '' }) {
  return (
    <svg
      className={`logo-mark ${className}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="32" cy="10" rx="22" ry="6" />
      <path d="M11 11.5 22.5 47c1 3.2 4.2 5 9.5 5s8.5-1.8 9.5-5L53 11.5" />
      <ellipse cx="32" cy="56" rx="15" ry="4" />
      <path d="M25 24h14M27 31h10M29 38h6" />
      <path className="logo-mark-check" d="m27.5 44 3.5 3.5 6.5-8" />
    </svg>
  )
}
