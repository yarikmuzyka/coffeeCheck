import {
  cleanLotName,
  extractWeightFromName,
  isNonFilterProduct,
  lotKey,
  mergePackageVariants,
  normalizeCountry,
  normalizePrice,
  parseTastingNotes,
  parseWeightGrams,
  requestText,
  splitProcessNames,
} from '../normalize.js'

export const PENYORA_SOURCE = 'penyora'
export const PENYORA_ROASTER = 'Penyora'
export const PENYORA_BASE = 'https://specialtycoffee.com.ua'
export const PENYORA_URL = `${PENYORA_BASE}/shop/filter`

// Next.js shop. The page embeds the product list as JSON in __NEXT_DATA__
// (the HTML only renders the first 24 cards). Every package size is a
// separate product ("… FILTER 250g" / "… FILTER 1000g") that has to be merged.

export function extractNextData(html) {
  const match = String(html).match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('__NEXT_DATA__ block not found')
  try {
    return JSON.parse(match[1])
  } catch {
    throw new Error('__NEXT_DATA__ block is not valid JSON')
  }
}

export function isPenyoraFilterProduct(product) {
  if (!product || product.category !== 'filter') return false
  return !isNonFilterProduct(product.title)
}

function isMarkedUnavailable(product) {
  return product.inStock === false
    || product.available === false
    || product.isAvailable === false
    || product.active === false
    || product.isActive === false
}

/** Parses the shop page HTML into raw lots (one per package product). */
export function parsePenyoraCatalog(html) {
  const data = extractNextData(html)
  const products = data?.props?.pageProps?.products
  if (!Array.isArray(products)) throw new Error('Product list is missing in __NEXT_DATA__')

  return products.filter(isPenyoraFilterProduct).map((product) => {
    const grams = parseWeightGrams(product.weight) ?? extractWeightFromName(product.title)
    const available = !isMarkedUnavailable(product)
    return {
      source: PENYORA_SOURCE,
      roasterName: PENYORA_ROASTER,
      name: cleanLotName(product.title),
      lotKey: lotKey(product.title),
      productUrl: `${PENYORA_BASE}/shop/product/${product.slug}`,
      imageUrl: product.imgList?.[0] ?? null,
      originCountry: normalizeCountry(product.country) ?? normalizeCountry(product.title),
      region: null,
      processNames: splitProcessNames(product.proc ?? ''),
      tastingNotes: parseTastingNotes(product.otherText ?? ''),
      badges: [product.tagOne, product.tagTwo, product.tagSpec].filter(Boolean),
      isAvailable: available,
      packages: [{ grams, price: normalizePrice(product.price), isAvailable: available }],
    }
  })
}

export async function fetchPenyoraLots({ fetchImpl, timeoutMs } = {}) {
  const html = await requestText(PENYORA_URL, { fetchImpl, timeoutMs })
  const lots = mergePackageVariants(parsePenyoraCatalog(html))
  if (lots.length === 0) throw new Error('No filter lots found — the page layout may have changed')
  return lots
}
