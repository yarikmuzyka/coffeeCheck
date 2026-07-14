export const PLAN_CONFIG = {
  FREE: {
    label: 'Free',
    limits: { roasters: 5, coffees: 20, brewLogs: 50 },
    analytics: 'basic',
    export: false,
  },
  PRO: {
    label: 'Pro',
    limits: { roasters: null, coffees: null, brewLogs: null },
    analytics: 'full',
    export: true,
  },
}

export const RESOURCES = {
  roasters: { model: 'roaster', label: 'Обсмажчики' },
  coffees: { model: 'coffee', label: 'Кави' },
  brewLogs: { model: 'brewLog', label: 'Заварювання' },
}

export function getEntitlements(plan = 'FREE') {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.FREE
}

export function getLimitState(used, limit) {
  if (limit == null) return { used, limit: null, percent: 0, warning: false, reached: false }
  const percent = Math.min(100, Math.round((used / limit) * 100))
  return { used, limit, percent, warning: used >= limit * 0.8, reached: used >= limit }
}

export function assertWithinLimit(used, limit, label) {
  if (limit != null && used >= limit) {
    throw new Error(`${label}: досягнуто ліміт Free (${used} із ${limit}). Видаліть запис або перейдіть на Pro.`)
  }
}

export async function withCreationLimit(db, { userId, resource }, operation) {
  const config = RESOURCES[resource]
  if (!config) throw new Error('Невідомий ресурс ліміту')

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`
    const user = await tx.user.findUnique({ where: { id: userId }, select: { plan: true } })
    if (!user) throw new Error('Unauthorized')
    const limit = getEntitlements(user.plan).limits[resource]
    const used = await tx[config.model].count({ where: { userId } })
    assertWithinLimit(used, limit, config.label)
    return operation(tx)
  })
}

export async function getUsageSnapshot(db, userId) {
  const [user, roasters, coffees, brewLogs] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    db.roaster.count({ where: { userId } }),
    db.coffee.count({ where: { userId } }),
    db.brewLog.count({ where: { userId } }),
  ])
  if (!user) throw new Error('Unauthorized')
  const entitlements = getEntitlements(user.plan)
  return {
    plan: user.plan,
    label: entitlements.label,
    resources: {
      roasters: getLimitState(roasters, entitlements.limits.roasters),
      coffees: getLimitState(coffees, entitlements.limits.coffees),
      brewLogs: getLimitState(brewLogs, entitlements.limits.brewLogs),
    },
  }
}
