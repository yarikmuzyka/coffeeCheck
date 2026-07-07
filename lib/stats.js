// Обчислення статистики для dashboard / analytics.
// Оцінка кави = власна оцінка (myScore), яку користувач ставить вручну.

// Точна вага пачки не зберігається — за замовчуванням кожна пачка 250 г.
export const DEFAULT_PACK_WEIGHT_GRAMS = 250

export function coffeeScore(coffee) {
  return typeof coffee.myScore === 'number' ? coffee.myScore : null
}

function avg(nums) {
  const xs = nums.filter((n) => typeof n === 'number' && Number.isFinite(n))
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

// Групування кав за ключем. Кава рахується в count навіть без власної оцінки —
// avg рахується лише з тих кав групи, де оцінка вже стоїть (може бути null).
function topBy(coffees, keyFn, minCount = 1) {
  const groups = new Map()
  for (const c of coffees) {
    const key = keyFn(c)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(coffeeScore(c))
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

export function computeDashboard(coffees, now = new Date()) {
  const total = summarize(coffees)

  const thisMonthCoffees = coffees.filter((c) => {
    const d = c.purchaseDate ?? c.createdAt
    return d && isSameMonth(new Date(d), now)
  })
  const thisMonth = summarize(thisMonthCoffees)

  const topRoasters = topBy(coffees, (c) => c.roaster?.name)
  const topCountries = topBy(coffees, (c) => c.originCountry)
  const topProcesses = topBy(coffees, (c) => c.process)
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
