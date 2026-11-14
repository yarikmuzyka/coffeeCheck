import './globals.css'
import Link from 'next/link'
import { Literata, Inter } from 'next/font/google'
import { getCurrentUser } from '../lib/auth.js'
import { SignOutButton } from './components/SignOutButton.jsx'
import { HeaderUsage } from './components/HeaderUsage.jsx'
import { getUsageSnapshot } from '../lib/entitlements.js'
import { prisma } from '../lib/prisma.js'
import { LogoMark } from './components/LogoMark.jsx'
import { NavLinks } from './components/NavLinks.jsx'

// Ceramic Calm: Literata (низький контраст штрихів, кирилиця) для заголовків,
// Inter для тексту. Next.js самохостить шрифти.
// Обидва шрифти variable: на запит окремих ваг Google Fonts інколи віддає
// інстансовані файли `/l/font?kit=…` без розширення, і next/font падає на білді.
const literata = Literata({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-literata',
})
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  title: 'coffee logger — Brew Journal',
  description: 'Відстежуй specialty каву, заварювання та власні смакові вподобання',
  applicationName: 'coffee logger',
  appleWebApp: {
    capable: true,
    title: 'coffee logger',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3eee6' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1613' },
  ],
  // cover — щоб standalone-режим на iPhone малювався під статус-баром,
  // а відступи контролювались через env(safe-area-inset-*)
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

const NAV = [
  { href: '/dashboard', label: 'Щоденник' },
  { href: '/coffees', label: 'Кави' },
  { href: '/new-lots', label: 'Нові лоти' },
  { href: '/roasters', label: 'Обсмажчики' },
  { href: '/plans', label: 'Тарифи' },
  { href: '/analytics', label: 'Аналітика' },
]

export default async function RootLayout({ children }) {
  const user = await getCurrentUser()
  const usage = user ? await getUsageSnapshot(prisma, user.id) : null

  return (
    <html lang="uk" className={`${literata.variable} ${inter.variable}`}>
      <body>
        <header className="topbar">
          <Link href={user ? '/dashboard' : '/login'} className="brand">
            <LogoMark className="brand-logo-mark" />
            <span>coffee logger</span>
          </Link>
          {user && (
            <>
              <NavLinks items={NAV} />
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
        <footer className="app-footer">
          coffee logger v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_SHA}
        </footer>
      </body>
    </html>
  )
}
