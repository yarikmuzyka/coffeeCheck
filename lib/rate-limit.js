const WINDOW_MS = 60_000

export async function enforceMutationRateLimit(db, userId, { sensitive = false, now = new Date() } = {}) {
  const action = sensitive ? 'sensitive-mutation' : 'mutation'
  const limit = sensitive ? 10 : 60
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS)
  const bucket = await db.rateLimitBucket.upsert({
    where: { userId_action_windowStart: { userId, action, windowStart } },
    create: { userId, action, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  })
  if (bucket.count > limit) throw new Error('Забагато запитів. Зачекайте хвилину й спробуйте ще раз.')
}
