import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { computeDashboard, coffeeAvgScore } from '../../lib/stats.js'

export const dynamic = 'force-dynamic'

// Прості рекомендації на основі історії (як у брифі)
function buildRecommendations(coffees, s) {
  const recs = []

  // Обсмажчик стабільно 8+
  for (const g of s.topRoasters) {
    if (g.avg >= 8 && g.count >= 2) {
      recs.push({ type: 'good', text: `Обсмажчик «${g.key}» стабільно тримає ${g.avg.toFixed(1)}/10 (${g.count} кав) — бери сміливо.` })
    }
  }
  // Найкраща зв'язка країна+обробка
  const combo = new Map()
  for (const c of coffees) {
    const score = coffeeAvgScore(c)
    if (score == null || !c.originCountry || !c.process) continue
    const key = `${c.process} ${c.originCountry}`
    if (!combo.has(key)) combo.set(key, [])
    combo.get(key).push(score)
  }
  const comboRanked = [...combo.entries()]
    .map(([k, v]) => ({ k, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
    .sort((a, b) => b.avg - a.avg)
  if (comboRanked[0] && comboRanked[0].avg >= 8) {
    recs.push({ type: 'good', text: `Тобі заходить ${comboRanked[0].k} (${comboRanked[0].avg.toFixed(1)}/10) — шукай схожі лоти.` })
  }
  // Обробка з низькими оцінками
  const weakProcess = [...s.topProcesses].reverse().find((g) => g.avg < 6 && g.count >= 2)
  if (weakProcess) {
    recs.push({ type: 'warn', text: `Обробка «${weakProcess.key}» дає в середньому лише ${weakProcess.avg.toFixed(1)}/10 — можливо, це не твоє.` })
  }
  return recs
}

function FullTop({ title, items, unit = '/10' }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {items.length === 0 ? (
        <p className="empty" style={{ padding: '12px 0' }}>Немає даних</p>
      ) : (
        <ul className="toplist">
          {items.map((g) => (
            <li key={g.key}>
              <span className="k">{g.key}<span className="cnt">×{g.count}</span></span>
              <span className="v">{g.avg.toFixed(1)}{unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function AnalyticsPage() {
  const coffees = await prisma.coffee.findMany({
    include: { roaster: true, brewLogs: true },
  })
  const s = computeDashboard(coffees)
  const recs = buildRecommendations(coffees, s)

  return (
    <div>
      <div className="page-head">
        <h1>Аналітика</h1>
        <p className="sub">Що саме тобі подобається у каві</p>
      </div>

      <h2>Рекомендації</h2>
      {recs.length === 0 ? (
        <div className="card"><p className="empty" style={{ padding: '12px 0' }}>
          Додай більше оцінених заварювань, щоб зʼявились рекомендації.
        </p></div>
      ) : (
        <div className="card">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recs.map((r, i) => (
              <li key={i} style={{ marginBottom: 6, color: r.type === 'warn' ? 'var(--bad)' : r.type === 'value' ? 'var(--good)' : 'var(--ink)' }}>
                {r.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cols" style={{ marginTop: 12 }}>
        <FullTop title="Обсмажчики за оцінкою" items={s.topRoasters} />
        <FullTop title="Країни за оцінкою" items={s.topCountries} />
        <FullTop title="Обробки за оцінкою" items={s.topProcesses} />
        <FullTop title="Сорти за оцінкою" items={s.topVarieties} />
      </div>

      <p style={{ marginTop: 24 }}>
        <Link href="/dashboard">← Назад до dashboard</Link>
      </p>
    </div>
  )
}
