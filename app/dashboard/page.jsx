import { prisma } from '../../lib/prisma.js'
import { computeDashboard } from '../../lib/stats.js'

export const dynamic = 'force-dynamic'

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
        <div className="stat">
          <div className="label">Куплено кав</div>
          <div className="value">{s.totalCoffees}</div>
        </div>
        <div className="stat">
          <div className="label">Витрачено</div>
          <div className="value">{s.totalSpent} <small>₴</small></div>
        </div>
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
