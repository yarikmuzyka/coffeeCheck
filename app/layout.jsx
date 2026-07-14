import './globals.css'
import Link from 'next/link'
import { getCurrentUser } from '../lib/auth.js'
import { SignOutButton } from './components/SignOutButton.jsx'

export const metadata = {
  title: 'coffeeCheck ☕ — Brew Journal',
  description: 'Відстежуй specialty каву, заварювання та власні смакові вподобання',
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/coffees', label: 'Кави' },
  { href: '/roasters', label: 'Обсмажчики' },
  { href: '/analytics', label: 'Аналітика' },
]

export default async function RootLayout({ children }) {
  const user = await getCurrentUser()

  return (
    <html lang="uk">
      <body>
        <header className="topbar">
          <Link href={user ? '/dashboard' : '/login'} className="brand">☕ coffeeCheck</Link>
          {user && (
            <>
              <nav className="nav">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href}>{n.label}</Link>
                ))}
              </nav>
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
