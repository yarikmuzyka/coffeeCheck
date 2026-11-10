import {
  cleanLotName,
  cleanText,
  decodeHtmlEntities,
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

export const DAM_SOURCE = 'dam'
export const DAM_ROASTER = 'DAM Coffee'
export const DAM_URL = 'https://damcoffee.com.ua/product-category/filter/'

// WooCommerce shop. The filter category renders every product on one page
// (the theme sets `max: 0` — no pagination). Each card carries processing,
// tasting notes and the full variation list as JSON in `data-product_variations`.

function attribute(html, name) {
  const match = html.match(new RegExp(`${name}="([^"]*)"`))
  return match ? decodeHtmlEntities(match[1]) : null
}

function parseVariations(card) {
  const raw = attribute(card, 'data-product_variations')
  if (!raw || raw === 'false') return null
  try {
    const variations = JSON.parse(raw)
    return Array.isArray(variations) ? variations : null
  } catch {
    return null
  }
}

function excerpts(card) {
  const fields = {}
  const pattern = /<div class="product-details-exerpt"[^>]*>\s*<span>([^<]*)<\/span>([\s\S]*?)<\/div>/g
  for (const match of card.matchAll(pattern)) {
    fields[cleanText(match[1]).toLocaleLowerCase('uk')] = cleanText(match[2])
  }
  return fields
}

function badgeTexts(card) {
  const texts = []
  const pattern = /<(?:span|div|p)[^>]*class="[^"]*(?:badge|label|sticker|onsale|product-tag|new)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|p)>/gi
  for (const match of card.matchAll(pattern)) texts.push(cleanText(match[1]))
  return texts.filter(Boolean)
}

function variationPackages(variations) {
  return variations.map((variation) => {
    const attributes = variation.attributes ?? {}
    const sizeValue = attributes.attribute_pa_vaga ?? Object.values(attributes)[0]
    return {
      grams: parseWeightGrams(sizeValue) ?? parseWeightGrams(Number(variation.weight) * 1000),
      price: normalizePrice(variation.display_price),
      isAvailable: variation.is_in_stock !== false && variation.is_purchasable !== false,
    }
  })
}

function simplePackage(card, title) {
  const priceMatch = card.match(/class="price-value"[^>]*>([\s\S]*?)<\//)
    ?? card.match(/class="woocommerce-Price-amount[^"]*"[^>]*>([\s\S]*?)<\/span>/)
  return {
    grams: extractWeightFromName(title),
    price: priceMatch ? normalizePrice(cleanText(priceMatch[1])) : null,
    isAvailable: !/class="[^"]*\boutofstock\b/.test(card),
  }
}

/** Parses the category page HTML into raw lots (one per product). */
export function parseDamCatalog(html) {
  const cards = String(html).split(/<li class="product-card-item/).slice(1)
  const rawLots = []

  for (const card of cards) {
    const titleMatch = card.match(/class="woocommerce-loop-product__title"[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!titleMatch) continue
    const productUrl = decodeHtmlEntities(titleMatch[1])
    const title = cleanText(titleMatch[2])

    const roastedForFilter = /roasted-for-filter/.test(card)
    const roastedForEspresso = /roasted-for-espresso/.test(card)
    if (roastedForEspresso && !roastedForFilter) continue
    if (isNonFilterProduct(title)) continue

    const fields = excerpts(card)
    const variations = parseVariations(card)
    const packages = variations?.length ? variationPackages(variations) : [simplePackage(card, title)]
    const productId = attribute(card, 'data-product_id')
      ?? card.match(/data-product_id="(\d+)"/)?.[1]
      ?? productUrl.replace(/\/+$/, '').split('/').pop()
    const imageMatch = card.match(/<img[^>]+src="([^"]+)"/)

    rawLots.push({
      source: DAM_SOURCE,
      externalId: productId,
      roasterName: DAM_ROASTER,
      name: cleanLotName(title),
      lotKey: lotKey(title),
      productUrl,
      imageUrl: imageMatch ? decodeHtmlEntities(imageMatch[1]) : null,
      originCountry: normalizeCountry(title),
      region: null,
      processNames: splitProcessNames(fields['обробка'] ?? ''),
      tastingNotes: parseTastingNotes(fields['смак'] ?? ''),
      badges: badgeTexts(card),
      isAvailable: !/class="[^"]*\bproduct\b[^"]*\boutofstock\b/.test(card),
      packages,
    })
  }

  return rawLots
}

export async function fetchDamLots({ fetchImpl, timeoutMs } = {}) {
  const html = await requestText(DAM_URL, { fetchImpl, timeoutMs })
  const lots = mergePackageVariants(parseDamCatalog(html))
  if (lots.length === 0) throw new Error('No filter lots found — the page layout may have changed')
  return lots
}
