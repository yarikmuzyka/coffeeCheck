// Сортування каталогів обсмажувачів і обробок: за назвою або за кількістю кав.

export const CATALOG_SORTS = ['name', 'count']

export function normalizeCatalogSort(value) {
  return CATALOG_SORTS.includes(value) ? value : 'name'
}

function compareNames(a, b) {
  return a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' })
}

/**
 * Returns a sorted copy. 'count' puts the most used first and keeps
 * alphabetical order inside equal counts.
 */
export function sortCatalog(items, sort = 'name') {
  const list = [...items]
  if (normalizeCatalogSort(sort) === 'count') {
    return list.sort((a, b) => (b._count?.coffees ?? 0) - (a._count?.coffees ?? 0) || compareNames(a, b))
  }
  return list.sort(compareNames)
}
