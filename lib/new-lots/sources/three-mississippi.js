import {
  cleanLotName,
  cleanText,
  isNonFilterProduct,
  KNOWN_PROCESS_NAMES,
  lotKey,
  mergePackageVariants,
  normalizeCountry,
  normalizePrice,
  parseWeightGrams,
  requestJson,
  splitProcessNames,
} from '../normalize.js'

export const THREE_MISSISSIPPI_SOURCE = 'three-mississippi'
export const THREE_MISSISSIPPI_ROASTER = 'Three Mississippi'
export const THREE_MISSISSIPPI_BASE = 'https://www.threemississippi.world/uk-ua'
export const THREE_MISSISSIPPI_URL = `${THREE_MISSISSIPPI_BASE}/collections/coffee/products.json?limit=250`

// Shopify shop. The coffee collection is available as JSON with every variant.
// Variants are "grind / weight" pairs ("В зерні / 250 г", "Чашка / 250 г"),
// so one weight is one package: available when any grind of it is in stock.
// The shop has no structured origin or process fields: the country comes from
// the title or the English handle ("banana-colombia-quindio"), the process from
// the title ("Мита …"), the handle ("washed-…") or, failing that, the description.
// Tasting notes are prose only, so they are left empty.

function handleWords(product) {
  return String(product.handle ?? '').replace(/-/g, ' ')
}

function knownProcesses(...texts) {
  return splitProcessNames(texts.filter(Boolean)).filter((name) => KNOWN_PROCESS_NAMES.has(name))
}

export function threeMississippiProcesses(product) {
  const fromName = knownProcesses(product.title, handleWords(product))
  if (fromName.length > 0) return [...new Set(fromName)]
  // The description mentions processes in passing ("хані-анаеробної ферментації");
  // a bare "fermentation" there says nothing about the method.
  return knownProcesses(cleanText(product.body_html)).filter((name) => name !== 'fermentation')
}

export function isThreeMississippiCoffee(product) {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return false
  if (product.product_type && !/кава|coffee/i.test(product.product_type)) return false
  return !isNonFilterProduct(product.title, handleWords(product))
}

function variantWeight(variant) {
  return parseWeightGrams(variant.option2) ?? parseWeightGrams(variant.title?.split('/').pop())
}

export function threeMississippiPackages(variants) {
  const byGrams = new Map()
  for (const variant of variants) {
    const grams = variantWeight(variant)
    const current = byGrams.get(grams)
    const isAvailable = variant.available !== false
    byGrams.set(grams, {
      grams,
      price: current?.price ?? normalizePrice(variant.price),
      isAvailable: Boolean(current?.isAvailable) || isAvailable,
    })
  }
  return [...byGrams.values()]
}

/** Parses the collection JSON into raw lots (one per product). */
export function parseThreeMississippiCatalog(data) {
  const products = data?.products
  if (!Array.isArray(products)) throw new Error('Product list is missing in products.json')

  return products.filter(isThreeMississippiCoffee).map((product) => {
    const packages = threeMississippiPackages(product.variants)
    return {
      source: THREE_MISSISSIPPI_SOURCE,
      externalId: String(product.id),
      roasterName: THREE_MISSISSIPPI_ROASTER,
      name: cleanLotName(product.title),
      lotKey: lotKey(product.title),
      productUrl: `${THREE_MISSISSIPPI_BASE}/products/${product.handle}`,
      imageUrl: product.images?.[0]?.src ?? null,
      originCountry: normalizeCountry(product.title) ?? normalizeCountry(handleWords(product)),
      region: null,
      processNames: threeMississippiProcesses(product),
      tastingNotes: [],
      badges: Array.isArray(product.tags) ? product.tags : [],
      isAvailable: packages.some((pack) => pack.isAvailable),
      packages,
    }
  })
}

export async function fetchThreeMississippiLots({ fetchImpl, timeoutMs } = {}) {
  const data = await requestJson(THREE_MISSISSIPPI_URL, { fetchImpl, timeoutMs })
  const lots = mergePackageVariants(parseThreeMississippiCatalog(data))
  if (lots.length === 0) throw new Error('No coffee lots found — the catalog may have changed')
  return lots
}
