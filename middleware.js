import NextAuth from 'next-auth'
import { authOptions } from './lib/auth-options.js'

export const { auth: middleware } = NextAuth(authOptions)

export default middleware

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)'],
}
