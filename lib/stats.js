// Обчислення статистики для dashboard / analytics.
// Оцінка кави = середній overallScore усіх її заварювань.

export function coffeeAvgScore(coffee) {
  const scores = (coffee.brewLogs ?? [])
    .map((b) => b.overallScore)
    .filter((s) => typeof s === 'number')
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function avg(nums) {
  const xs = nums.filter((n) => typeof n === 'number' && Number.isFinite(n))
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

// Групування кав за ключем із середньою оцінкою
function topBy(coffees, keyFn, minCount = 1) {
  const groups = new Map()
  for (const c of coffees) {
    const key = keyFn(c)
    if (!key) continue
    const score = coffeeAvgScore(c)
    if (score == null) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(score)
  }
  return [...groups.entries()]
    .map(([key, scores]) => ({ key, count: scores.length, avg: avg(scores) }))
    .filter((g) => g.count >= minCount && g.avg != null)
    .sort((a, b) => b.avg - a.avg)
}

export function computeDashboard(coffees) {
  const totalCoffees = coffees.length
  const totalSpent = coffees.reduce((s, c) => s + (c.price ?? 0), 0)

  const topRoasters = topBy(coffees, (c) => c.roaster?.name)
  const topCountries = topBy(coffees, (c) => c.originCountry)
  const topProcesses = topBy(coffees, (c) => c.process)
  const topVarieties = topBy(coffees, (c) => c.variety)

  return {
    totalCoffees,
    totalSpent: Math.round(totalSpent),
    topRoasters,
    topCountries,
    topProcesses,
    topVarieties,
  }
}
