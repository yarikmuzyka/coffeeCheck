// Обчислення статистики для dashboard / analytics.
// Оцінка кави = середній overallScore усіх її заварювань.

export function coffeeAvgScore(coffee) {
  const scores = (coffee.brewLogs ?? [])
    .map((b) => b.overallScore)
    .filter((s) => typeof s === 'number')
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function coffeeBestBrew(coffee) {
  const scored = (coffee.brewLogs ?? []).filter(
    (b) => typeof b.overallScore === 'number',
  )
  if (scored.length === 0) return null
  return scored.reduce((best, b) => (b.overallScore > best.overallScore ? b : best))
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

function monthKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export function computeDashboard(coffees) {
  const totalCoffees = coffees.length
  const totalSpent = coffees.reduce((s, c) => s + (c.price ?? 0), 0)
  const per100 = coffees.map((c) => c.pricePer100g).filter((n) => n != null)
  const avgPricePer100g = avg(per100)

  const scored = coffees
    .map((c) => ({ coffee: c, score: coffeeAvgScore(c) }))
    .filter((x) => x.score != null)
  const avgScore = avg(scored.map((x) => x.score))

  const topRoasters = topBy(coffees, (c) => c.roaster?.name)
  const topCountries = topBy(coffees, (c) => c.originCountry)
  const topProcesses = topBy(coffees, (c) => c.process)
  const topVarieties = topBy(coffees, (c) => c.variety)

  const bestCoffee =
    scored.length > 0
      ? scored.reduce((best, x) => (x.score > best.score ? x : best))
      : null

  // best value = найвище (оцінка / ціна за 100г)
  const valueRanked = scored
    .filter((x) => x.coffee.pricePer100g && x.coffee.pricePer100g > 0)
    .map((x) => ({ ...x, value: x.score / x.coffee.pricePer100g }))
    .sort((a, b) => b.value - a.value)
  const bestValue = valueRanked[0] ?? null

  // графіки по місяцях
  const spendByMonth = new Map()
  for (const c of coffees) {
    if (c.purchaseDate && c.price != null) {
      const k = monthKey(c.purchaseDate)
      spendByMonth.set(k, (spendByMonth.get(k) ?? 0) + c.price)
    }
  }
  const scoreByMonth = new Map()
  for (const c of coffees) {
    for (const b of c.brewLogs ?? []) {
      if (typeof b.overallScore === 'number') {
        const k = monthKey(b.brewedAt)
        if (!scoreByMonth.has(k)) scoreByMonth.set(k, [])
        scoreByMonth.get(k).push(b.overallScore)
      }
    }
  }
  const months = [...new Set([...spendByMonth.keys(), ...scoreByMonth.keys()])].sort()
  const spendChart = months.map((m) => ({
    month: m,
    spend: Math.round(spendByMonth.get(m) ?? 0),
  }))
  const scoreChart = months
    .filter((m) => scoreByMonth.has(m))
    .map((m) => ({
      month: m,
      score: Math.round(avg(scoreByMonth.get(m)) * 10) / 10,
    }))

  return {
    totalCoffees,
    totalSpent: Math.round(totalSpent),
    avgPricePer100g: avgPricePer100g != null ? Math.round(avgPricePer100g * 10) / 10 : null,
    avgScore: avgScore != null ? Math.round(avgScore * 10) / 10 : null,
    topRoasters,
    topCountries,
    topProcesses,
    topVarieties,
    bestCoffee,
    bestValue,
    spendChart,
    scoreChart,
  }
}
