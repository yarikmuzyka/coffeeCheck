import NextAuth from 'next-auth'
import { authOptions } from './lib/auth-options.js'

export const { auth: middleware } = NextAuth(authOptions)

export default middleware

export const config = {
  runtime: 'nodejs',
  // PWA-ресурси (manifest, іконки) мають бути доступні без сесії:
  // iOS завантажує їх анонімно під час встановлення на екран «Додому».
  matcher: [
    '/((?!api/auth|api/cron/|login|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-touch-icon.png|coffee-logger-mark.svg).*)',
  ],
}
