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

export function computeDashboard(coffees) {
  const totalCoffees = coffees.length
  const totalSpent = coffees.reduce((s, c) => s + (c.price ?? 0), 0)
  const totalWeightGrams = totalCoffees * DEFAULT_PACK_WEIGHT_GRAMS

  const topRoasters = topBy(coffees, (c) => c.roaster?.name)
  const topCountries = topBy(coffees, (c) => c.originCountry)
  const topProcesses = topBy(coffees, (c) => c.process)
  const topVarieties = topBy(coffees, (c) => c.variety)

  return {
    totalCoffees,
    totalSpent: Math.round(totalSpent),
    totalWeightGrams,
    topRoasters,
    topCountries,
    topProcesses,
    topVarieties,
  }
}
