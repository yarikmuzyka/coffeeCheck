import { headers } from 'next/headers'
import { hasValidBasicAuth } from './basic-auth.js'

export function authIsConfigured() {
  return Boolean(process.env.APP_USERNAME && process.env.APP_PASSWORD)
}

export async function assertAuthorized() {
  const requestHeaders = await headers()
  const valid = hasValidBasicAuth(
    requestHeaders.get('authorization'),
    process.env.APP_USERNAME,
    process.env.APP_PASSWORD,
  )

  if (!valid) throw new Error('Unauthorized')
}
