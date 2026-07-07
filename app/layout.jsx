import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'coffeeCheck ☕ — Brew Journal',
  description: 'Відстежуй specialty каву, заварювання та власні смакові вподобання',
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/coffees', label: 'Кави' },
  { href: '/roasters', label: 'Обсмажчики' },
  { href: '/brew-logs/new', label: '+ Заварювання' },
  { href: '/analytics', label: 'Аналітика' },
]

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body>
        <header className="topbar">
          <Link href="/dashboard" className="brand">☕ coffeeCheck</Link>
          <nav className="nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>{n.label}</Link>
            ))}
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
