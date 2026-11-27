'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Навігація з позначкою поточного розділу: підкреслення + aria-current,
// щоб активний стан не передавався лише кольором.
export function NavLinks({ items, mobile = false, children }) {
  const pathname = usePathname() ?? ''
  const isActive = (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  const renderItem = (item) => item.disabled
    ? <span key={item.href} className="nav-disabled" aria-disabled="true">{item.label}</span>
    : <Link key={item.href} href={item.href} aria-current={isActive(item) ? 'page' : undefined} onClick={mobile ? (event) => {
      event.currentTarget.closest('details')?.removeAttribute('open')
    } : undefined}>{item.label}</Link>

  if (mobile) {
    const more = items.slice(3)
    return (
      <nav className="nav mobile-nav" aria-label="Основна навігація">
        {items.slice(0, 3).map(renderItem)}
        <details className="mobile-nav-more" key={pathname}>
          <summary className={more.some(isActive) ? 'mobile-nav-current' : undefined}>Ще <span aria-hidden="true">⌄</span></summary>
          <div className="mobile-nav-panel">
            {more.map(renderItem)}
            <div className="mobile-nav-account">{children}</div>
          </div>
        </details>
      </nav>
    )
  }
  return (
    <nav className="nav desktop-nav" aria-label="Основна навігація">
      {items.map(renderItem)}
    </nav>
  )
}
