import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { computeDashboard, coffeeAvgScore } from '../../lib/stats.js'
import { SpendChart, ScoreChart } from './Charts.jsx'

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
              <span className="v">{g.avg.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const coffees = await prisma.coffee.findMany({
    include: { roaster: true, brewLogs: true },
  })
  const s = computeDashboard(coffees)

  const recentBrews = await prisma.brewLog.findMany({
    orderBy: { brewedAt: 'desc' },
    take: 5,
    include: { coffee: true },
  })

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
        <div className="stat">
          <div className="label">Сер. ціна / 100г</div>
          <div className="value">{s.avgPricePer100g ?? '—'} <small>₴</small></div>
        </div>
        <div className="stat">
          <div className="label">Сер. оцінка</div>
          <div className="value">{s.avgScore ?? '—'} <small>/10</small></div>
        </div>
      </div>

      {(s.bestCoffee || s.bestValue) && (
        <div className="cols" style={{ marginTop: 12 }}>
          {s.bestCoffee && (
            <div className="card">
              <div className="label" style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>🏆 Найкраща кава</div>
              <h3 style={{ margin: '6px 0' }}>
                <Link href={`/coffees/${s.bestCoffee.coffee.id}`}>{s.bestCoffee.coffee.name}</Link>
              </h3>
              <p className="sub" style={{ margin: 0 }}>
                {s.bestCoffee.coffee.roaster?.name} · оцінка {s.bestCoffee.score.toFixed(1)}/10
              </p>
            </div>
          )}
          {s.bestValue && (
            <div className="card">
              <div className="label" style={{ color: 'var(--good)', fontSize: '0.82rem' }}>💸 Найкраще ціна / якість</div>
              <h3 style={{ margin: '6px 0' }}>
                <Link href={`/coffees/${s.bestValue.coffee.id}`}>{s.bestValue.coffee.name}</Link>
              </h3>
              <p className="sub" style={{ margin: 0 }}>
                оцінка {s.bestValue.score.toFixed(1)} за {s.bestValue.coffee.pricePer100g} ₴/100г
              </p>
            </div>
          )}
        </div>
      )}

      <div className="cols" style={{ marginTop: 12 }}>
        <TopList title="Топ обсмажчиків" items={s.topRoasters} />
        <TopList title="Топ країн" items={s.topCountries} />
        <TopList title="Топ обробок" items={s.topProcesses} />
        <TopList title="Топ сортів" items={s.topVarieties} />
      </div>

      <h2>Витрати по місяцях</h2>
      <div className="card"><SpendChart data={s.spendChart} /></div>

      <h2>Оцінки по місяцях</h2>
      <div className="card"><ScoreChart data={s.scoreChart} /></div>

      <h2>Останні заварювання</h2>
      <div className="card">
        {recentBrews.length === 0 ? (
          <p className="empty" style={{ padding: '16px 0' }}>
            Ще немає заварювань. <Link href="/brew-logs/new">Додати перше →</Link>
          </p>
        ) : (
          <ul className="toplist">
            {recentBrews.map((b) => (
              <li key={b.id}>
                <span className="k">
                  <Link href={`/coffees/${b.coffeeId}`}>{b.coffee.name}</Link>
                  <span className="cnt">{b.method} · {new Date(b.brewedAt).toLocaleDateString('uk')}</span>
                </span>
                <span className="v">{b.overallScore != null ? `${b.overallScore}/10` : '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
