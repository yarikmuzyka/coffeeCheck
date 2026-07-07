import { prisma } from '../../lib/prisma.js'
import { computeDashboard } from '../../lib/stats.js'
import { pluralizeUk, formatWeightGrams } from '../../lib/format.js'

export const dynamic = 'force-dynamic'

function SummaryStat({ label, count, weightGrams, spent }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">
        {count} {pluralizeUk(count, ['пачка', 'пачки', 'пачок'])} / {formatWeightGrams(weightGrams)} / {spent} <small>₴</small>
      </div>
    </div>
  )
}

function TopList({ title, items }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {items.length === 0 ? (
        <p className="empty" style={{ padding: '16px 0' }}>Ще немає даних</p>
      ) : (
        <ul className="toplist">
          {items.slice(0, 5).map((g) => (
            <li key={g.key}>
              <span className="k">
                {g.key}<span className="cnt">×{g.count}</span>
              </span>
              <span className="v">{g.avg != null ? g.avg.toFixed(1) : '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const coffees = await prisma.coffee.findMany({
    include: { roaster: true },
  })
  const s = computeDashboard(coffees)

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p className="sub">Твоя кавова статистика з першого погляду</p>
      </div>

      <div className="stat-grid">
        <SummaryStat label="Всього" count={s.totalCoffees} weightGrams={s.totalWeightGrams} spent={s.totalSpent} />
        <SummaryStat label="Цей місяць" count={s.monthCoffees} weightGrams={s.monthWeightGrams} spent={s.monthSpent} />
      </div>

      <div className="cols" style={{ marginTop: 12 }}>
        <TopList title="Топ обсмажчиків" items={s.topRoasters} />
        <TopList title="Топ країн" items={s.topCountries} />
        <TopList title="Топ обробок" items={s.topProcesses} />
        <TopList title="Топ сортів" items={s.topVarieties} />
      </div>
    </div>
  )
}
