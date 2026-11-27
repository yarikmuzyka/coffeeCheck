import NextAuth from 'next-auth'
import { cache } from 'react'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { authOptions } from './auth-options.js'
import { prisma } from './prisma.js'

export const { handlers, auth } = NextAuth({
  ...authOptions,
  adapter: PrismaAdapter(prisma),
})

export const getCurrentUser = cache(async () => {
  const session = await auth()
  return session?.user?.id ? session.user : null
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
