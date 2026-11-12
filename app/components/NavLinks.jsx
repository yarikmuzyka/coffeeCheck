'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Навігація з позначкою поточного розділу: підкреслення + aria-current,
// щоб активний стан не передавався лише кольором.
export function NavLinks({ items }) {
  const pathname = usePathname() ?? ''
  return (
    <nav className="nav" aria-label="Основна навігація">
      {items.map((item) => {
        if (item.disabled) {
          return <span key={item.href} className="nav-disabled" aria-disabled="true">{item.label}</span>
        }
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
