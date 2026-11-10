export const NEW_LOT_SOURCES = ['dam', 'foundation', 'penyora']

function cleanList(values) {
  return [...new Set((values ?? []).map((value) => value?.toString().trim()).filter(Boolean))]
}

function lotData(lot, now) {
  if (!lot?.source || !lot?.externalId || !lot?.roasterName || !lot?.name || !lot?.productUrl) {
    throw new Error('Джерело повернуло неповний лот')
  }
  return {
    source: lot.source,
    externalId: lot.externalId,
    roasterName: lot.roasterName,
    name: lot.name,
    productUrl: lot.productUrl,
    imageUrl: lot.imageUrl || null,
    originCountry: lot.originCountry || null,
    region: lot.region || null,
    processNames: cleanList(lot.processNames),
    tastingNotes: cleanList(lot.tastingNotes),
    price: Number.isFinite(lot.price) ? lot.price : null,
    currency: lot.currency || 'UAH',
    packageSizes: cleanList(lot.packageSizes),
    isAvailable: lot.isAvailable !== false,
    sourceBadge: lot.sourceBadge || null,
    lastSeenAt: now,
  }
}

export function sourcesSafeToReconcile(lots, errors = []) {
  const failed = new Set(errors.map((error) => error.source))
  return NEW_LOT_SOURCES.filter(
    (source) => !failed.has(source) && lots.some((lot) => lot.source === source),
  )
}

export async function syncNewLots(db, fetchAllNewLots, now = new Date()) {
  const result = await fetchAllNewLots()
  const lots = result?.lots ?? []
  const errors = result?.errors ?? []
  const safeSources = sourcesSafeToReconcile(lots, errors)

  const synced = await db.$transaction(async (tx) => {
    for (const rawLot of lots) {
      const data = lotData(rawLot, now)
      await tx.externalLot.upsert({
        where: { source_externalId: { source: data.source, externalId: data.externalId } },
        update: data,
        create: { ...data, firstSeenAt: now },
      })
    }

    for (const source of safeSources) {
      const seenIds = lots.filter((lot) => lot.source === source).map((lot) => lot.externalId)
      await tx.externalLot.updateMany({
        where: { source, externalId: { notIn: seenIds }, isAvailable: true },
        data: { isAvailable: false },
      })
    }
    return lots.length
  // Default interactive-transaction timeout (5s) is too short for ~70
  // sequential upserts to a remote database; stay under the 60s cron limit.
  }, { maxWait: 10_000, timeout: 45_000 })

  return { synced, errors, reconciledSources: safeSources }
}
