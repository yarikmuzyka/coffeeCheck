import {
  cleanLotName,
  cleanText,
  extractWeightFromName,
  isNonFilterProduct,
  KNOWN_PROCESS_NAMES,
  lotKey,
  mapWithConcurrency,
  mergePackageVariants,
  normalizeCountry,
  normalizePrice,
  parseTastingNotes,
  parseWeightGrams,
  requestJson,
  splitProcessNames,
} from '../normalize.js'

export const FOUNDATION_SOURCE = 'foundation'
export const FOUNDATION_ROASTER = 'Foundation'
export const FOUNDATION_URL = 'https://foundation.ua/kava-high5/specialty-kava-filter'
export const FOUNDATION_BASE = 'https://foundation.ua'
export const FOUNDATION_LIST_API = `${FOUNDATION_BASE}/api/v1/partition/kava-high5/specialty-kava-filter`

// Nuxt shop backed by a JSON API (the same one the site itself calls).
// The category endpoint lists product cards with sizes, prices and filter
// variant ids; the card endpoint adds country, region, processing and notes.

// Filter variant ids from GET /api/v1/filter. Used to drop espresso/drip
// products listed in the filter category and as a processing fallback when
// a product card cannot be loaded.
const EXCLUDED_VARIANTS = new Set([
  12, // Капсули для кавомашин
  46, // Дріп-кава
  48, // Specialty Кава Espresso
])
const FILTER_ROAST_VARIANT = 24 // світлий (фільтр)
const ESPRESSO_ROAST_VARIANTS = new Set([35, 36, 37])
const PROCESS_VARIANTS = {
  22: 'натуральний',
  23: 'аеробний',
  26: 'митий',
  27: 'хані',
  28: 'напівмитий',
  29: 'повністю митий',
  30: 'анаеробний',
  31: 'анаеробний натуральний',
  32: 'анаеробний митий',
  33: 'експериментальний',
  34: 'декаф',
  40: 'CO2',
}

const BADGES = { 1: 'Top', 2: 'New', 3: 'Sale' }

export function isFoundationFilterCard(card) {
  const name = cleanText(card?.name)
  if (!name || !/кава|coffee/i.test(name)) return false
  if (isNonFilterProduct(name)) return false

  const variants = new Set(card.filterVariants ?? [])
  if ([...variants].some((id) => EXCLUDED_VARIANTS.has(id))) return false
  const hasEspressoRoast = [...variants].some((id) => ESPRESSO_ROAST_VARIANTS.has(id))
  if (hasEspressoRoast && !variants.has(FILTER_ROAST_VARIANT)) return false
  return true
}

function feature(details, name) {
  const item = (details?.features ?? []).find((entry) => cleanText(entry.name).toLocaleLowerCase('uk') === name)
  return item ? cleanText(item.value) : ''
}

function filterVariantNames(details, filterName) {
  const filter = (details?.filters ?? []).find((entry) => cleanText(entry.name).toLocaleLowerCase('uk') === filterName)
  return (filter?.variants ?? []).map((variant) => cleanText(variant.name)).filter(Boolean)
}

function parsePreview(preview) {
  const lines = String(preview ?? '').split(/\r?\n/).map(cleanText).filter(Boolean)
  return {
    process: lines.filter((line) => line.startsWith('*')).map((line) => line.slice(1)).join(', '),
    notes: lines.filter((line) => !line.startsWith('*')).join(', '),
  }
}

// The product card has several processing descriptions of varying quality
// ("*filter" in the preview, a free-text feature, filter tags). Take the one
// that names the most known methods; earlier candidates win ties.
function pickProcessNames(candidates) {
  let best = []
  let bestScore = -1
  for (const candidate of candidates) {
    const names = splitProcessNames(candidate)
    if (names.length === 0) continue
    const score = names.filter((name) => KNOWN_PROCESS_NAMES.has(name)).length
    if (score > bestScore) {
      best = names
      bestScore = score
    }
  }
  return best
}

function isEspressoByDetails(details) {
  const roasts = filterVariantNames(details, 'ступінь обсмажування').join(' ')
  const lines = filterVariantNames(details, 'кава high5').join(' ')
  const filterRoast = /фільтр|filter/i.test(roasts) || /filter/i.test(lines)
  return !filterRoast && (/еспресо|espresso/i.test(roasts) || /espresso|дріп/i.test(lines))
}

function packagesFor(card) {
  return (card.goods ?? []).map((good) => {
    const sizeLabel = (good.properties ?? []).map((property) => property.value).join(',')
    return {
      grams: (good.weight_gr > 0 ? parseWeightGrams(good.weight_gr) : null)
        ?? parseWeightGrams(sizeLabel.split(',')[0])
        ?? extractWeightFromName(card.name),
      price: normalizePrice(good.prices?.UAH?.price ?? good.price),
      isAvailable: good.on_off !== false,
    }
  })
}

/**
 * Builds a raw lot from a category card plus (optional) product details.
 * Returns null for products that are not filter coffee.
 */
export function buildFoundationRawLot(card, details = null) {
  if (!isFoundationFilterCard(card)) return null
  if (details && isEspressoByDetails(details)) return null

  const preview = parsePreview(details?.preview)
  const processNames = pickProcessNames([
    feature(details, 'спосіб обробки'),
    preview.process,
    filterVariantNames(details, 'спосіб обробки').join(', '),
    (card.filterVariants ?? []).map((id) => PROCESS_VARIANTS[id]).filter(Boolean).join(', '),
  ])

  const notesSource = feature(details, 'дескриптори') || preview.notes
  const badge = BADGES[details?.badge ?? card.badge]
  const goodsSource = details?.goods?.length ? { ...card, goods: details.goods } : card

  return {
    source: FOUNDATION_SOURCE,
    roasterName: FOUNDATION_ROASTER,
    name: cleanLotName(card.name),
    lotKey: lotKey(card.name),
    productUrl: `${FOUNDATION_BASE}/product/${card.chpu}`,
    imageUrl: card.imagePath || card.image_path || details?.image_path || null,
    originCountry: normalizeCountry(feature(details, 'країна')) ?? normalizeCountry(card.name),
    region: feature(details, 'регіон') || null,
    processNames,
    tastingNotes: parseTastingNotes(notesSource),
    badges: badge ? [badge] : [],
    isAvailable: details ? details.is_available !== false : true,
    packages: packagesFor(goodsSource),
  }
}

export function parseFoundationCatalog(payload) {
  const cards = Array.isArray(payload?.goodscard) ? payload.goodscard : null
  if (!cards) throw new Error('Unexpected category response: goodscard list is missing')
  return cards
}

export async function fetchFoundationLots({ fetchImpl, timeoutMs, concurrency = 4 } = {}) {
  const payload = await requestJson(FOUNDATION_LIST_API, { fetchImpl, timeoutMs })
  const cards = parseFoundationCatalog(payload).filter(isFoundationFilterCard)

  // Details are best effort: a failed product request still yields a lot
  // from the category data, just without region and tasting notes.
  const rawLots = await mapWithConcurrency(cards, concurrency, async (card) => {
    let details = null
    try {
      details = await requestJson(`${FOUNDATION_BASE}/api/v1/goodscard/${encodeURIComponent(card.chpu)}`, { fetchImpl, timeoutMs })
    } catch {
      details = null
    }
    return buildFoundationRawLot(card, details)
  })

  const lots = mergePackageVariants(rawLots.filter(Boolean))
  if (lots.length === 0) throw new Error('No filter lots found — the API response may have changed')
  return lots
}
