import './globals.css'
import Link from 'next/link'
import { getCurrentUser } from '../lib/auth.js'
import { SignOutButton } from './components/SignOutButton.jsx'
import { HeaderUsage } from './components/HeaderUsage.jsx'
import { getUsageSnapshot } from '../lib/entitlements.js'
import { prisma } from '../lib/prisma.js'
import { LogoMark } from './components/LogoMark.jsx'

export const metadata = {
  title: 'coffee logger — Brew Journal',
  description: 'Відстежуй specialty каву, заварювання та власні смакові вподобання',
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/coffees', label: 'Кави' },
  { href: '/roasters', label: 'Обсмажчики' },
  { href: '/plans', label: 'Тарифи' },
  { href: '/analytics', label: 'Аналітика', disabled: true },
]

export default async function RootLayout({ children }) {
  const user = await getCurrentUser()
  const usage = user ? await getUsageSnapshot(prisma, user.id) : null

  return (
    <html lang="uk">
      <body>
        <header className="topbar">
          <Link href={user ? '/dashboard' : '/login'} className="brand">
            <LogoMark className="brand-logo-mark" />
            <span>coffee logger</span>
          </Link>
          {user && (
            <>
              <nav className="nav">
                {NAV.map((n) => n.disabled ? (
                  <span key={n.href} className="nav-disabled" aria-disabled="true">{n.label}</span>
                ) : (
                  <Link key={n.href} href={n.href}>{n.label}</Link>
                ))}
              </nav>
              <HeaderUsage usage={usage} />
              <div className="account-menu">
                {user.image && <img src={user.image} alt="" className="avatar" referrerPolicy="no-referrer" />}
                <span className="account-name">{user.name ?? user.email}</span>
                <SignOutButton />
              </div>
            </>
          )}
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
