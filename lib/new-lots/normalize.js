// Shared normalization helpers for the new-lots scrapers.
// Every source adapter turns raw shop data into "raw lots" and passes them
// through `mergePackageVariants`, which produces the public lot format.

export const CURRENCY = 'UAH'

export const BADGE_NEW = 'Новинка'
export const BADGE_FRESH_CROP = 'Свіжий врожай'

const DEFAULT_TIMEOUT_MS = 20_000
const USER_AGENT = 'Mozilla/5.0 (compatible; CoffeeLoggerBot/1.0)'

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const HTML_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘',
  hellip: '…', rsaquo: '›', lsaquo: '‹',
}

export function decodeHtmlEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(point) ? String.fromCodePoint(point) : match
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? match
  })
}

export function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ')
}

/** Collapses all whitespace (incl. NBSP and zero-width chars) and trims. */
export function normalizeWhitespace(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[​-‍﻿]/g, '')
    .replace(/[\s   ]+/g, ' ')
    .trim()
}

/** Decodes entities, strips tags and collapses whitespace. */
export function cleanText(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)))
}

// Cyrillic letters that look identical to Latin ones. Shops sometimes mix
// them inside otherwise Latin names ("MUCHAGARА" with a Cyrillic "А").
const CYRILLIC_LOOKALIKES = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', І: 'I',
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', і: 'i', у: 'y',
}

function fixMixedScriptWords(value) {
  return value.replace(/[\p{L}]+/gu, (word) => {
    const hasLatin = /[a-z]/i.test(word)
    const hasCyrillic = /\p{Script=Cyrillic}/u.test(word)
    if (!hasLatin || !hasCyrillic) return word
    return [...word].map((char) => CYRILLIC_LOOKALIKES[char] ?? char).join('')
  })
}

const KEEP_UPPERCASE = new Set(['AA', 'AB', 'AAA', 'PB', 'SL', 'CO2', 'DAM', 'EKI', 'LPL'])

function titleCaseWord(word) {
  if (KEEP_UPPERCASE.has(word) || /\d/.test(word)) return word
  return word
    .toLocaleLowerCase('uk')
    .replace(/(^|[-'’])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('uk'))
}

/**
 * Normalizes a lot name: whitespace, mixed-script typos and SHOUTING CAPS
 * ("KENYA MUCHAGARA AB" → "Kenya Muchagara AB"). Mixed-case names are kept.
 */
export function normalizeLotName(value) {
  const text = fixMixedScriptWords(cleanText(value))
  const letters = text.split(' ').filter((word) => !/\d/.test(word)).join('').replace(/[^\p{L}]/gu, '')
  const isShouting = letters.length > 3 && letters === letters.toLocaleUpperCase('uk')
  if (!isShouting) return text
  return text.split(' ').map(titleCaseWord).join(' ')
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** "1 240,00 грн" → 1240, 550 → 550, "" → null. */
export function normalizePrice(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null

  let text = normalizeWhitespace(decodeHtmlEntities(value)).replace(/\s/g, '')
  text = text.replace(/[^\d.,]/g, '')
  if (!text) return null

  if (text.includes(',') && text.includes('.')) {
    // "1,240.00" or "1.240,00" — the last separator is the decimal one.
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '')
  } else if (text.includes(',')) {
    const [whole, fraction] = text.split(',')
    text = fraction && fraction.length <= 2 ? `${whole}.${fraction}` : text.replace(/,/g, '')
  }

  const number = Number.parseFloat(text)
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null
}

const KILOGRAM_UNITS = /^(kg|кг|kilo|кілограм)/i
const GRAM_UNITS = /^(g|gr|г|гр|грам)/i

/**
 * Parses a package weight into grams.
 * "250g", "250 г", "1-kg", "1 кг", "0.5кг", "1000", 250 → number of grams.
 */
export function parseWeightGrams(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null

  const text = normalizeWhitespace(value).toLowerCase()
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*[-‐]?\s*([a-zа-яіїє]*)/i)
  if (!match) return null

  const amount = Number.parseFloat(match[1].replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unit = match[2]
  if (KILOGRAM_UNITS.test(unit)) return Math.round(amount * 1000)
  if (!unit || GRAM_UNITS.test(unit)) return Math.round(amount)
  return null
}

/** 250 → "250 г", 1000 → "1 кг", 1500 → "1.5 кг". */
export function formatPackageSize(grams) {
  if (!grams) return null
  if (grams >= 1000 && grams % 100 === 0) return `${grams / 1000} кг`
  return `${grams} г`
}

/** Finds a weight mentioned inside a product name ("Кава X 250 г фільтр"). */
export function extractWeightFromName(name) {
  const match = normalizeWhitespace(name).match(/(\d+(?:[.,]\d+)?)\s*-?\s*(кг|kg|г|гр|g|gr)(?![\p{L}])/iu)
  return match ? parseWeightGrams(`${match[1]}${match[2]}`) : null
}

// ---------------------------------------------------------------------------
// Coffee attributes
// ---------------------------------------------------------------------------

// Order matters: longer / more specific patterns must come first, because
// matched text is blanked out before the next pattern runs
// ("анаеробна" must not also match "аеробна", "напівмита" not "мита").
const PROCESS_PATTERNS = [
  ['carbonic maceration', /carbonic[\s_-]*maceration|карбонічн\p{L}*\s+мацерац\p{L}*/giu],
  ['thermal shock', /thermal[\s_-]*shock|термал[\s_-]*шок\p{L}*|термо[\s_-]*шок\p{L}*/giu],
  ['co-fermentation', /co[\s_-]*ferment\p{L}*|ко[\s_-]*фермент\p{L}*|коферментац\p{L}*/giu],
  ['lactic fermentation', /lactic[\s_-]*ferment\p{L}*|лактичн\p{L}*(\s+фермент\p{L}*)?/giu],
  ['yeast fermentation', /yeast[\s_-]*(inoculat\p{L}*|ferment\p{L}*)?|дріжджов\p{L}*(\s+фермент\p{L}*)?/giu],
  ['semi-washed', /semi[\s_-]*washed|напівмит\p{L}*|wet[\s_-]*hulled/giu],
  ['honey', /honey|хані|медов\p{L}*/giu],
  ['anaerobic', /anaerobic|анаеробн\p{L}*/giu],
  ['aerobic', /aerobic|аеробн\p{L}*/giu],
  ['washed', /fully[\s_-]*washed|washed|повністю\s+мит\p{L}*|мит(ий|а|е|і|ого|ої)(?![\p{L}])/giu],
  ['natural', /natural|натуральн\p{L}*|сухий\s+спосіб/giu],
  ['decaf', /decaf\p{L}*|non[\s_-]*caffeine|декаф\p{L}*|без\s+кофеїну/giu],
  ['experimental', /experimental|експериментальн\p{L}*/giu],
  ['fermentation', /fermentation|ферментац\p{L}*/giu],
]

export const KNOWN_PROCESS_NAMES = new Set(PROCESS_PATTERNS.map(([name]) => name))

function normalizeUnknownProcess(part) {
  return normalizeWhitespace(part.replace(/[*_]+/g, ' ').replace(/\s*-\s*/g, '-'))
    .replace(/^[-\s]+|[-\s]+$/g, '')
    .toLocaleLowerCase('uk')
}

/**
 * Splits a raw processing description into canonical, separate values:
 * "натуральна, анаеробна" → ["natural", "anaerobic"],
 * "washed/anaerobic" → ["washed", "anaerobic"],
 * "natural-anaerobic-72-hours" → ["natural", "anaerobic"].
 * Values with no known method are kept as a cleaned lower-case string.
 */
export function splitProcessNames(raw) {
  const values = Array.isArray(raw) ? raw : [raw]
  const result = []

  for (const value of values) {
    const text = cleanText(value).replace(/_/g, ' ')
    if (!text) continue

    for (const part of text.split(/\s*(?:[,;/+&|]|\s(?:та|і|й|and)\s)\s*/i)) {
      if (!part.trim()) continue
      let remaining = part
      const found = []
      for (const [name, pattern] of PROCESS_PATTERNS) {
        remaining = remaining.replace(pattern, (match, ...args) => {
          const offset = args.find((arg) => typeof arg === 'number')
          found.push({ name, index: offset })
          return ' '.repeat(match.length)
        })
      }
      if (found.length === 0) {
        const unknown = normalizeUnknownProcess(part)
        if (unknown && /\p{L}/u.test(unknown)) result.push(unknown)
        continue
      }
      found.sort((a, b) => a.index - b.index).forEach(({ name }) => result.push(name))
    }
  }

  // "fermentation" alone is redundant next to a more specific fermentation.
  const unique = [...new Set(result)]
  const hasSpecificFermentation = unique.some((name) => name !== 'fermentation' && name.includes('ferment'))
  return hasSpecificFermentation ? unique.filter((name) => name !== 'fermentation') : unique
}

const COUNTRY_ALIASES = [
  ['Costa Rica', ['costa rica', 'коста ріка', 'коста-ріка', 'костаріка']],
  ['El Salvador', ['el salvador', 'salvador', 'сальвадор']],
  ['Papua New Guinea', ['papua new guinea', 'папуа нова гвінея', 'папуа-нова гвінея']],
  ['DR Congo', ['dr congo', 'congo', 'конго']],
  ['Ethiopia', ['ethiopia', 'ефіопія', 'ефіопії']],
  ['Kenya', ['kenya', 'кенія', 'кенії']],
  ['Colombia', ['colombia', 'колумбія', 'колумбії']],
  ['Rwanda', ['rwanda', 'руанда', 'руанди']],
  ['Burundi', ['burundi', 'бурунді']],
  ['Uganda', ['uganda', 'уганда']],
  ['Tanzania', ['tanzania', 'танзанія']],
  ['Brazil', ['brazil', 'бразилія']],
  ['Guatemala', ['guatemala', 'гватемала']],
  ['Honduras', ['honduras', 'гондурас']],
  ['Nicaragua', ['nicaragua', 'нікарагуа']],
  ['Panama', ['panama', 'панама']],
  ['Peru', ['peru', 'перу']],
  ['Bolivia', ['bolivia', 'болівія']],
  ['Ecuador', ['ecuador', 'еквадор']],
  ['Mexico', ['mexico', 'мексика']],
  ['Yemen', ['yemen', 'ємен']],
  ['Indonesia', ['indonesia', 'індонезія']],
  ['India', ['india', 'індія']],
  ['China', ['china', 'китай']],
  ['Vietnam', ['vietnam', "в'єтнам", 'вʼєтнам', 'в’єтнам']],
  ['Thailand', ['thailand', 'таїланд']],
  ['Myanmar', ['myanmar', "м'янма", 'мʼянма']],
  ['Malawi', ['malawi', 'малаві']],
  ['Zambia', ['zambia', 'замбія']],
  ['Jamaica', ['jamaica', 'ямайка']],
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const COUNTRY_MATCHERS = COUNTRY_ALIASES.map(([country, aliases]) => [
  country,
  new RegExp(`(?<![\\p{L}])(${aliases.map(escapeRegExp).join('|')})(?![\\p{L}])`, 'iu'),
])

/** Returns every distinct country mentioned in the text, in order of appearance. */
export function findCountries(value) {
  const text = cleanText(value)
  if (!text) return []
  const hits = []
  for (const [country, matcher] of COUNTRY_MATCHERS) {
    const match = text.match(matcher)
    if (match && !hits.some((hit) => hit.country === country)) hits.push({ country, index: match.index })
  }
  return hits.sort((a, b) => a.index - b.index).map((hit) => hit.country)
}

/**
 * Canonical English country name for a single-origin lot.
 * Returns null for unknown text and for blends mentioning several countries.
 */
export function normalizeCountry(value) {
  const countries = findCountries(value)
  return countries.length === 1 ? countries[0] : null
}

/** "Смак: порічка, Журавлина , брусниця" → ["порічка", "журавлина", "брусниця"]. */
export function parseTastingNotes(raw) {
  const values = Array.isArray(raw) ? raw : [raw]
  const notes = values
    .flatMap((value) => cleanText(value)
      .replace(/^(смак|дескриптори|ноти|notes|tasting notes)\s*:\s*/i, '')
      .split(/\s*[,;•·|\n]\s*/))
    .map((note) => note.replace(/^[-–—*\s]+|[.\s]+$/g, '').toLocaleLowerCase('uk'))
    .filter(Boolean)
  return [...new Set(notes)]
}

// ---------------------------------------------------------------------------
// Badges & product type
// ---------------------------------------------------------------------------

/**
 * Recognizes shop labels. "Новинка" / "New" → "Новинка",
 * "Свіжий врожай" → "Свіжий врожай". "Новинка" wins when both are present.
 */
export function detectBadge(labels) {
  const texts = (Array.isArray(labels) ? labels : [labels]).map((label) => cleanText(label).toLocaleLowerCase('uk'))
  if (texts.some((text) => /(^|[^\p{L}])(новинк\p{L}*|new)([^\p{L}]|$)/u.test(text))) return BADGE_NEW
  if (texts.some((text) => /свіж\p{L}*\s+врожа\p{L}*|fresh\s+crop/u.test(text))) return BADGE_FRESH_CROP
  return null
}

const NON_FILTER_PATTERNS = [
  /espresso|еспресо|эспрессо/iu,
  /(?<![\p{L}])(drip|дріп\p{L}*|дрип\p{L}*)(?![\p{L}])/iu,
  /capsul\p{L}*|капсул\p{L}*|nespresso/iu,
  /(?<![\p{L}])(набір|набор|set|бокс|box)(?![\p{L}])/iu,
  /пуровер|pour[\s-]*over|(?<![\p{L}])(v60|chemex|aeropress|kalita|origami)(?![\p{L}])|чайник|kettle|кавомолк|grinder|(?<![\p{L}])ваги(?![\p{L}])|термос|чашк|сертифікат|certificate|паперові фільтри|filter papers?/iu,
  /(?<![\p{L}])(чай|tea|матча|matcha|какао|cocoa|сироп|syrup)(?![\p{L}])/iu,
  /розчинн|instant|мелен[аи]?\s+кава|ground coffee/iu,
]

/** True when the product title/category describes something other than filter coffee beans. */
export function isNonFilterProduct(...texts) {
  const text = texts.map(cleanText).join(' ')
  return NON_FILTER_PATTERNS.some((pattern) => pattern.test(text))
}

// ---------------------------------------------------------------------------
// Lot identity & merging
// ---------------------------------------------------------------------------

const NAME_NOISE = /(?<![\p{L}])(для фільтра|for filter|filter|фільтр|в зернах|зерно|beans?)(?![\p{L}])/giu
const LEADING_COFFEE = /^(кава|coffee)\s+/iu

/**
 * Display name without shop noise: weight, "Кава", "фільтр", "FILTER".
 * "Кава Кенія Kiriri 250 г фільтр" → "Кенія Kiriri".
 */
export function cleanLotName(value) {
  const name = normalizeLotName(value)
    .replace(/\(?\s*\d+(?:[.,]\d+)?\s*-?\s*(кг|kg|г|гр|g|gr)(?![\p{L}])\s*\)?/giu, ' ')
    .replace(/\d+\s*(шт|pcs)\.?/giu, ' ')
    .replace(NAME_NOISE, ' ')
  const cleaned = normalizeWhitespace(name).replace(/^[-–—,\s]+|[-–—,\s]+$/g, '')
  // "Кава Кенія Kiriri" → "Кенія Kiriri", but "Кава Вартових" stays as is.
  const withoutPrefix = cleaned.replace(LEADING_COFFEE, '')
  return withoutPrefix !== cleaned && withoutPrefix.split(' ').length >= 2 ? withoutPrefix : cleaned
}

/** Identity key used to merge package variants of the same lot. */
export function lotKey(value) {
  return cleanLotName(value)
    .toLocaleLowerCase('uk')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const UK_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i',
  й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '', ё: 'e',
}

export function slugify(value) {
  return [...lotKey(value)]
    .map((char) => UK_TO_LATIN[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sameValues(a = [], b = []) {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
}

/**
 * Merges package variants of one lot into a single record.
 *
 * Input: "raw lots" from an adapter — one entry per package (or per product
 * with its own `packages` list), each with a `lotKey`. Variants are merged
 * only when source, lotKey and processing match exactly, so different lots
 * with similar names never collapse together.
 *
 * Raw lot fields: source, externalId?, roasterName, name, lotKey, productUrl,
 * imageUrl, originCountry, region, processNames, tastingNotes, badges,
 * packages: [{ grams, price, isAvailable }].
 */
export function mergePackageVariants(rawLots) {
  const groups = []

  for (const raw of rawLots) {
    const key = raw.lotKey || lotKey(raw.name)
    const processNames = raw.processNames ?? []
    const group = groups.find((candidate) => candidate.source === raw.source
      && candidate.key === key
      && sameValues(candidate.processNames, processNames))
    if (group) group.items.push(raw)
    else groups.push({ source: raw.source, key, processNames, items: [raw] })
  }

  const slugCounts = new Map()
  for (const group of groups) {
    const id = `${group.source}:${slugify(group.key)}`
    slugCounts.set(id, (slugCounts.get(id) ?? 0) + 1)
  }

  return groups.map((group) => buildLot(group, slugCounts))
}

function firstValue(items, field) {
  for (const item of items) {
    const value = item[field]
    if (Array.isArray(value) ? value.length > 0 : value) return value
  }
  return Array.isArray(items[0]?.[field]) ? [] : null
}

function buildLot(group, slugCounts) {
  const { items } = group
  const packages = items.flatMap((item) => item.packages ?? [])
  const byGrams = new Map()
  for (const pack of packages) {
    const grams = pack.grams ?? null
    const existing = byGrams.get(grams)
    const price = normalizePrice(pack.price)
    if (!existing) {
      byGrams.set(grams, { grams, price, isAvailable: pack.isAvailable !== false })
      continue
    }
    existing.isAvailable = existing.isAvailable || pack.isAvailable !== false
    if (price !== null && (existing.price === null || price < existing.price)) existing.price = price
  }

  const sortedPackages = [...byGrams.values()].sort((a, b) => (a.grams ?? Infinity) - (b.grams ?? Infinity))
  const available = sortedPackages.filter((pack) => pack.isAvailable)
  const priced = (available.length ? available : sortedPackages).filter((pack) => pack.price !== null)
  const isAvailable = items.some((item) => item.isAvailable !== false) && available.length > 0

  // Prefer the product page of the smallest package — the usual entry point.
  const primary = items
    .slice()
    .sort((a, b) => minGrams(a) - minGrams(b))[0]

  const explicitIds = [...new Set(items.map((item) => item.externalId).filter(Boolean))]
  let externalId = explicitIds.length === 1 ? String(explicitIds[0]) : slugify(group.key)
  if (explicitIds.length !== 1) {
    const baseId = `${group.source}:${externalId}`
    if ((slugCounts.get(baseId) ?? 0) > 1 && group.processNames.length) {
      externalId = `${externalId}--${slugify(group.processNames.join(' '))}`
    }
  }

  return {
    source: group.source,
    externalId,
    roasterName: primary.roasterName,
    name: primary.name,
    productUrl: primary.productUrl,
    imageUrl: firstValue([primary, ...items], 'imageUrl'),
    originCountry: firstValue(items, 'originCountry'),
    region: firstValue(items, 'region'),
    processNames: group.processNames,
    tastingNotes: [...new Set(items.flatMap((item) => item.tastingNotes ?? []))],
    price: priced[0]?.price ?? null,
    currency: CURRENCY,
    packageSizes: sortedPackages.map((pack) => formatPackageSize(pack.grams)).filter(Boolean),
    isAvailable,
    sourceBadge: detectBadge(items.flatMap((item) => item.badges ?? [])),
  }
}

function minGrams(item) {
  const grams = (item.packages ?? []).map((pack) => pack.grams).filter(Boolean)
  return grams.length ? Math.min(...grams) : Infinity
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export async function requestText(url, { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS, accept = 'text/html' } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is not available')
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'uk-UA,uk;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export async function requestJson(url, options = {}) {
  const text = await requestText(url, { ...options, accept: 'application/json' })
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON from ${url}`)
  }
}

/** Runs async `task` for each item with limited parallelism, keeping order. */
export async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
