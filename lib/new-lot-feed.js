export const NEW_LOT_WINDOW_DAYS = 30

export function normalizeFeedFilter(value) {
  const normalized = (value ?? '').toString().trim()
  return normalized === '' ? null : normalized
}

export function matchesFeedFilters(lot, filters = {}) {
  const roaster = normalizeFeedFilter(filters.roaster)?.toLocaleLowerCase('uk')
  const country = normalizeFeedFilter(filters.country)?.toLocaleLowerCase('uk')
  const process = normalizeFeedFilter(filters.process)?.toLocaleLowerCase('uk')

  if (roaster && lot.roasterName.toLocaleLowerCase('uk') !== roaster) return false
  if (country && (lot.originCountry ?? '').toLocaleLowerCase('uk') !== country) return false
  if (process && !(lot.processNames ?? []).some((name) => name.toLocaleLowerCase('uk') === process)) return false
  return true
}

export function filterAndSortLots(lots, filters = {}) {
  return lots
    .filter((lot) => matchesFeedFilters(lot, filters))
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'))
}

export function buildNewCoffeeHref(lotId) {
  return `/coffees/new?lot=${encodeURIComponent(lotId)}`
}

export function newLotCutoff(now = new Date()) {
  return new Date(now.getTime() - NEW_LOT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
}
