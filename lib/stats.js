// Обчислення статистики для dashboard / analytics.
// Оцінка кави = власна оцінка (myScore), яку користувач ставить вручну.

import { coffeeProcessNames, processLabel } from './coffee-processes.js'

// Точна вага пачки не зберігається — за замовчуванням кожна пачка 250 г.
export const DEFAULT_PACK_WEIGHT_GRAMS = 250

export function coffeeScore(coffee) {
  return typeof coffee.myScore === 'number' ? coffee.myScore : null
}

function avg(nums) {
  const xs = nums.filter((n) => typeof n === 'number' && Number.isFinite(n))
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

function compareRatedGroups(a, b) {
  if (a.avg == null && b.avg == null) return b.count - a.count || a.key.localeCompare(b.key)
  if (a.avg == null) return 1
  if (b.avg == null) return -1
  return b.avg - a.avg || b.count - a.count || a.key.localeCompare(b.key)
}

export function computeOriginInsights(coffees) {
  const countries = new Map()

  for (const coffee of coffees) {
    const country = coffee.originCountry?.trim()
    if (!country) continue
    if (!countries.has(country)) countries.set(country, [])
    countries.get(country).push(coffee)
  }

  return [...countries.entries()].map(([key, countryCoffees]) => {
    const regionGroups = new Map()
    for (const coffee of countryCoffees) {
      const region = coffee.region?.trim() || 'Регіон не вказано'
      if (!regionGroups.has(region)) regionGroups.set(region, [])
      regionGroups.get(region).push(coffee)
    }

    const rated = countryCoffees.filter((coffee) => coffeeScore(coffee) != null)
    const regions = [...regionGroups.entries()]
      .map(([region, regionCoffees]) => {
        const scores = regionCoffees.map(coffeeScore)
        return {
          key: region,
          count: regionCoffees.length,
          ratedCount: scores.filter((score) => score != null).length,
          avg: avg(scores),
        }
      })
      .sort(compareRatedGroups)

    const topCoffee = [...rated].sort((a, b) => {
      const scoreDifference = coffeeScore(b) - coffeeScore(a)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(b.purchaseDate ?? b.createdAt ?? 0) - new Date(a.purchaseDate ?? a.createdAt ?? 0)
    })[0] ?? null

    return {
      key,
      count: countryCoffees.length,
      ratedCount: rated.length,
      avg: avg(rated.map(coffeeScore)),
      regions,
      topCoffee,
    }
  }).sort(compareRatedGroups)
}

// mode 'method': кава з кількома обробками рахується в кожній з них.
// mode 'combination': групи за точним набором обробок ("anaerobic + natural").
export function computeProcessInsights(coffees, { mode = 'method' } = {}) {
  const processes = new Map()
  const companions = new Map()

  for (const coffee of coffees) {
    const names = coffeeProcessNames(coffee)
    if (names.length === 0) continue
    const keys = mode === 'combination' ? [processLabel(names)] : names
    for (const key of keys) {
      if (!processes.has(key)) processes.set(key, [])
      processes.get(key).push(coffee)
      if (mode !== 'combination') {
        if (!companions.has(key)) companions.set(key, new Map())
        for (const other of names) {
          if (other === key) continue
          companions.get(key).set(other, (companions.get(key).get(other) ?? 0) + 1)
        }
      }
    }
  }

  return [...processes.entries()].map(([key, processCoffees]) => {
    const countryGroups = new Map()
    for (const coffee of processCoffees) {
      const country = coffee.originCountry?.trim() || 'Країна не вказана'
      if (!countryGroups.has(country)) countryGroups.set(country, [])
      countryGroups.get(country).push(coffee)
    }

    const rated = processCoffees.filter((coffee) => coffeeScore(coffee) != null)
    const countries = [...countryGroups.entries()]
      .map(([country, countryCoffees]) => {
        const scores = countryCoffees.map(coffeeScore)
        return {
          key: country,
          count: countryCoffees.length,
          ratedCount: scores.filter((score) => score != null).length,
          avg: avg(scores),
        }
      })
      .sort(compareRatedGroups)

    const topCoffee = [...rated].sort((a, b) => {
      const scoreDifference = coffeeScore(b) - coffeeScore(a)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(b.purchaseDate ?? b.createdAt ?? 0) - new Date(a.purchaseDate ?? a.createdAt ?? 0)
    })[0] ?? null

    const pairedWith = [...(companions.get(key) ?? new Map()).entries()]
      .map(([name, count]) => ({ key: name, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'uk'))

    return {
      key,
      methods: mode === 'combination' ? coffeeProcessNames(processCoffees[0]) : [key],
      count: processCoffees.length,
      ratedCount: rated.length,
      avg: avg(rated.map(coffeeScore)),
      countries,
      topCoffee,
      pairedWith,
    }
  }).sort(compareRatedGroups)
}

// Групування кав за ключем. Кава рахується в count навіть без власної оцінки —
// avg рахується лише з тих кав групи, де оцінка вже стоїть (може бути null).
// keyFn може повернути масив ключів — тоді кава рахується в кожній групі.
function topBy(coffees, keyFn, minCount = 1) {
  const groups = new Map()
  for (const c of coffees) {
    const keys = [keyFn(c)].flat().filter(Boolean)
    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(coffeeScore(c))
    }
  }
  return [...groups.entries()]
    .map(([key, scores]) => ({ key, count: scores.length, avg: avg(scores) }))
    .filter((g) => g.count >= minCount)
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
}

// count / spent / weight для набору кав (використовується для "всього" і "цей місяць")
function summarize(coffees) {
  const count = coffees.length
  const spent = coffees.reduce((s, c) => s + (c.price ?? 0), 0)
  return {
    count,
    spent: Math.round(spent),
    weightGrams: count * DEFAULT_PACK_WEIGHT_GRAMS,
  }
}

function isSameMonth(date, ref) {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth()
}

export function averageMonthlyWeightGrams(coffees, now = new Date()) {
  if (coffees.length === 0) return 0

  const dates = coffees
    .map((coffee) => new Date(coffee.purchaseDate ?? coffee.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()))
  if (dates.length === 0) return 0

  const earliest = new Date(Math.min(...dates.map((date) => date.getTime())))
  const firstMonth = earliest.getFullYear() * 12 + earliest.getMonth()
  const currentMonth = now.getFullYear() * 12 + now.getMonth()
  const elapsedMonths = Math.max(1, currentMonth - firstMonth + 1)

  return Math.round((coffees.length * DEFAULT_PACK_WEIGHT_GRAMS) / elapsedMonths)
}

export function computeDashboard(coffees, now = new Date()) {
  const total = summarize(coffees)

  const thisMonthCoffees = coffees.filter((c) => {
    const d = c.purchaseDate ?? c.createdAt
    return d && isSameMonth(new Date(d), now)
  })
  const thisMonth = summarize(thisMonthCoffees)

  const topRoasters = topBy(coffees, (c) => c.roaster?.name)
  const topCountries = topBy(coffees, (c) => c.originCountry)
  const topProcesses = topBy(coffees, coffeeProcessNames)
  const topVarieties = topBy(coffees, (c) => c.variety)

  return {
    totalCoffees: total.count,
    totalSpent: total.spent,
    totalWeightGrams: total.weightGrams,
    monthCoffees: thisMonth.count,
    monthSpent: thisMonth.spent,
    monthWeightGrams: thisMonth.weightGrams,
    topRoasters,
    topCountries,
    topProcesses,
    topVarieties,
  }
}
