// Рекомендації нових лотів за смаком користувача: країна, обробка, обсмажчик.
// Профіль будується з оцінених кав, лот отримує бал за тим, наскільки його
// ознаки кращі за середню оцінку користувача.

import { coffeeProcessNames } from './coffee-processes.js'
import { normalizeCountry, splitProcessNames } from './new-lots/normalize.js'
import { coffeeScore } from './stats.js'

// Скільки «віртуальних» оцінок на рівні середнього додаємо до кожної групи:
// одна кава на 5.0 не робить країну улюбленою.
const PRIOR_WEIGHT = 2
const MIN_RATED_COFFEES = 3
// Ознака вважається надійною, якщо за нею щонайменше стільки оцінок.
const MIN_RELIABLE_COUNT = 2
export const RECOMMEND_THRESHOLD = 0.2
// Нейтральні збіги (на рівні середнього) не пояснюють рекомендацію.
const MIN_REASON_DELTA = 0.05

const DIMENSIONS = [
  { key: 'country', weight: 1 },
  { key: 'process', weight: 1 },
  { key: 'roaster', weight: 0.5 },
]

function clean(value) {
  return (value ?? '').toString().trim().replace(/\s+/g, ' ')
}

function lower(value) {
  return clean(value).toLocaleLowerCase('uk')
}

/** "DAM Coffee" і "DAM" — один обсмажчик. */
export function roasterKey(name) {
  return lower(name)
    .replace(/[’'`]/g, '')
    .replace(/\b(coffee|roastery|roasters|roasting|co)\b|(^|\s)(кава|кав\S*ня|обсмажувальня)(?=\s|$)/giu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function countryKey(value) {
  const name = clean(value)
  if (!name) return null
  return normalizeCountry(name) ?? name
}

/** Канонічні англійські назви обробок, як у лотах: «хані» → honey. */
export function canonicalProcessNames(names) {
  const result = new Set()
  for (const name of names) {
    for (const canonical of splitProcessNames(name)) result.add(lower(canonical))
  }
  return [...result]
}

function coffeeKeys(coffee) {
  return {
    country: [countryKey(coffee.originCountry)].filter(Boolean),
    process: canonicalProcessNames(coffeeProcessNames(coffee)),
    roaster: [roasterKey(coffee.roaster?.name)].filter(Boolean),
  }
}

function lotKeys(lot) {
  return {
    country: [countryKey(lot.originCountry)].filter(Boolean),
    process: canonicalProcessNames(lot.processNames ?? []),
    roaster: [roasterKey(lot.roasterName)].filter(Boolean),
  }
}

export function buildTasteProfile(coffees) {
  const rated = coffees.filter((coffee) => coffeeScore(coffee) != null)
  const mean = rated.length ? rated.reduce((sum, coffee) => sum + coffeeScore(coffee), 0) / rated.length : null
  const groups = { country: new Map(), process: new Map(), roaster: new Map() }

  for (const coffee of rated) {
    const keys = coffeeKeys(coffee)
    for (const { key } of DIMENSIONS) {
      for (const value of keys[key]) {
        const group = groups[key].get(value) ?? { sum: 0, count: 0 }
        group.sum += coffeeScore(coffee)
        group.count += 1
        groups[key].set(value, group)
      }
    }
  }

  const stats = {}
  for (const { key } of DIMENSIONS) {
    stats[key] = new Map([...groups[key]].map(([value, { sum, count }]) => [value, {
      avg: sum / count,
      count,
      // Згладжене відхилення від середнього: що більше оцінок, то більше довіри.
      delta: (sum + PRIOR_WEIGHT * mean) / (count + PRIOR_WEIGHT) - mean,
    }]))
  }

  return { mean, ratedCount: rated.length, stats }
}

function nameKey(name) {
  return lower(name).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Лот уже є в колекції: той самий обсмажчик і така сама назва. */
export function findTriedCoffee(lot, coffees) {
  const lotRoaster = roasterKey(lot.roasterName)
  const lotName = nameKey(lot.name)
  if (!lotName) return null
  const matches = coffees.filter((coffee) => {
    if (roasterKey(coffee.roaster?.name) !== lotRoaster) return false
    const name = nameKey(coffee.name)
    return name === lotName || (name.length >= 4 && lotName.includes(name)) || (lotName.length >= 4 && name.includes(lotName))
  })
  // Якщо пачок кілька — беремо оцінену, щоб показати реальне враження.
  return matches.find((coffee) => coffeeScore(coffee) != null) ?? matches[0] ?? null
}

export function isLotTried(lot, coffees) {
  return findTriedCoffee(lot, coffees) != null
}

// Емодзі в кутку фото пачки: 🎯 — під смак, інші — враження від уже випитої кави.
export function lotMarker({ recommended, tried, triedScore }) {
  if (tried) {
    if (triedScore == null) return { emoji: '🤔', label: 'Пив, ще без оцінки' }
    const label = `Пив · твоя оцінка ${formatScore(triedScore)}`
    if (triedScore >= 4.5) return { emoji: '🤩', label }
    if (triedScore >= 3.5) return { emoji: '🙂', label }
    if (triedScore >= 2.5) return { emoji: '😐', label }
    return { emoji: '😖', label }
  }
  if (recommended) return { emoji: '🎯', label: 'Під твій смак' }
  return null
}

function formatScore(value) {
  return value.toFixed(1)
}

export function scoreLot(lot, profile) {
  const keys = lotKeys(lot)
  let score = 0
  let reliablePositive = false
  const reasons = []

  for (const { key, weight } of DIMENSIONS) {
    const matches = keys[key]
      .map((value) => ({ value, ...profile.stats[key].get(value) }))
      .filter((match) => match.count)
    if (matches.length === 0) continue
    // Для лота з кількома обробками беремо середнє по відомих.
    const delta = matches.reduce((sum, match) => sum + match.delta, 0) / matches.length
    score += weight * delta
    for (const match of matches) {
      if (match.delta < MIN_REASON_DELTA) continue
      if (match.count >= MIN_RELIABLE_COUNT) reliablePositive = true
      reasons.push({ dimension: key, value: match.value, avg: match.avg, count: match.count, delta: match.delta })
    }
  }

  reasons.sort((a, b) => b.delta - a.delta)
  return { score, reasons, recommended: reliablePositive && score >= RECOMMEND_THRESHOLD }
}

export function formatReasons(reasons, roasterName) {
  return reasons
    .slice(0, 3)
    .map((reason) => `${reason.dimension === 'roaster' ? roasterName : reason.value} ${formatScore(reason.avg)}`)
    .join(' · ')
}

/**
 * Map lotId → { score, recommended, reasons, reasonText, tried, triedScore, marker }.
 * Без достатньої кількості оцінок рекомендацій немає.
 */
export function recommendLots(lots, coffees) {
  const profile = buildTasteProfile(coffees)
  const result = new Map()
  for (const lot of lots) {
    const triedCoffee = findTriedCoffee(lot, coffees)
    const tried = triedCoffee != null
    const scored = profile.ratedCount >= MIN_RATED_COFFEES
      ? scoreLot(lot, profile)
      : { score: 0, reasons: [], recommended: false }
    const info = {
      ...scored,
      recommended: scored.recommended && !tried,
      reasonText: formatReasons(scored.reasons, lot.roasterName),
      tried,
      triedCoffeeId: triedCoffee?.id ?? null,
      triedScore: triedCoffee ? coffeeScore(triedCoffee) : null,
    }
    info.marker = lotMarker(info)
    result.set(lot.id, info)
  }
  return result
}

/** Рекомендовані першими (за балом), далі — у вихідному порядку. */
export function sortByRecommendation(lots, recommendations) {
  const info = (lot) => recommendations.get(lot.id)
  return lots
    .map((lot, index) => ({ lot, index }))
    .sort((a, b) => {
      const ra = info(a.lot)?.recommended ? 1 : 0
      const rb = info(b.lot)?.recommended ? 1 : 0
      if (ra !== rb) return rb - ra
      if (ra) return info(b.lot).score - info(a.lot).score
      return a.index - b.index
    })
    .map(({ lot }) => lot)
}
