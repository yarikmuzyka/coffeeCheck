'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './prisma.js'
import { requireUser } from './auth.js'
import { enforceMutationRateLimit } from './rate-limit.js'

function requiredId(formData, field) {
  const value = (formData.get(field) ?? '').toString().trim()
  if (!value) throw new Error('Лот не знайдено')
  return value
}

export async function saveWishedLot(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const lotId = requiredId(formData, 'lotId')
  const lot = await prisma.externalLot.findUnique({ where: { id: lotId }, select: { id: true } })
  if (!lot) throw new Error('Лот не знайдено')

  await prisma.wishedLot.upsert({
    where: { userId_lotId: { userId: user.id, lotId } },
    update: {},
    create: { userId: user.id, lotId },
  })
  revalidatePath('/new-lots')
}

export async function removeWishedLot(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const lotId = requiredId(formData, 'lotId')
  await prisma.wishedLot.deleteMany({ where: { userId: user.id, lotId } })
  revalidatePath('/new-lots')
}
