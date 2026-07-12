import { NextResponse } from 'next/server'
import { hasValidBasicAuth } from './lib/basic-auth.js'

export function middleware(request) {
  const username = process.env.APP_USERNAME
  const password = process.env.APP_PASSWORD

  if (!username || !password) {
    return new NextResponse('Authentication is not configured', { status: 503 })
  }

  if (hasValidBasicAuth(request.headers.get('authorization'), username, password)) {
    return NextResponse.next()
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="coffeeCheck", charset="UTF-8"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
