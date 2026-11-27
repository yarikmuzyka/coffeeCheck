import { cache } from 'react'
import { prisma } from './prisma.js'
import { getUsageSnapshot } from './entitlements.js'

// Share the header and page lookup within one server render only.
export const getRequestUsage = cache((userId) => getUsageSnapshot(prisma, userId))
