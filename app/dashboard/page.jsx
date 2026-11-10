import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { averageMonthlyWeightGrams, computeDashboard, coffeeScore } from '../../lib/stats.js'
import { formatWeightGrams, pluralizeUk } from '../../lib/format.js'
import { requireUser } from '../../lib/auth.js'
import { COFFEE_PROCESSES_INCLUDE } from '../../lib/coffee-processes.js'

export const dynamic = 'force-dynamic'

function formatDate(value) {
  return new Date(value).toLocaleDateString('uk', { day: 'numeric', month: 'short', year: 'numeric' })
}

function KpiCard({ value, label, context }) {
  return (
    <div className="dashboard-kpi">
      <span className="dashboard-kpi__value">{value}</span>
      <span className="dashboard-kpi__copy">
        <strong>{label}</strong>
        <small>{context}</small>
      </span>
    </div>
  )
}

function CoffeeRow({ coffee }) {
  const score = coffeeScore(coffee)

  return (
    <Link href={`/coffees/${coffee.id}`} className="dashboard-coffee-row">
      <span className="dashboard-coffee-row__copy">
        <strong>{coffee.name}</strong>
        <small>
          {[coffee.roaster?.name, coffee.originCountry, coffee.price != null ? `${coffee.price} ₴` : null]
            .filter(Boolean).join(' · ')}
        </small>
      </span>
      <span className={`dashboard-coffee-score${score == null ? ' dashboard-coffee-score--empty' : ''}`}>
        {score != null ? score.toFixed(1) : '—'}
      </span>
    </Link>
  )
}

export default async function DashboardPage() {
  const user = await requireUser()
  const coffees = await prisma.coffee.findMany({
    where: { userId: user.id },
    include: { roaster: true, ...COFFEE_PROCESSES_INCLUDE },
  })
  const stats = computeDashboard(coffees)
  const averageMonthlyWeight = averageMonthlyWeightGrams(coffees)
  const activeCount = coffees.filter((coffee) => !coffee.isFinished).length
  const recentCoffees = [...coffees]
    .sort((a, b) => new Date(b.purchaseDate ?? b.createdAt) - new Date(a.purchaseDate ?? a.createdAt))
    .slice(0, 3)
  const latestAdded = [...coffees]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)

  return (
    <div className="dashboard-page">
      <header className="dashboard-head">
        <div>
          <h1>Твоя кава — з першого погляду</h1>
          <p className="sub">Колекція, витрати та останні записи в одному місці</p>
        </div>
        <div className="spacer" />
        <Link href="/coffees/new" className="btn btn--primary">+ Додати каву</Link>
      </header>

      <section className="dashboard-kpi-grid" aria-label="Коротка статистика">
        <KpiCard
          value={stats.totalCoffees}
          label={`${pluralizeUk(stats.totalCoffees, ['кава', 'кави', 'кав'])} у колекції`}
          context={`${activeCount} ${pluralizeUk(activeCount, ['активна пачка', 'активні пачки', 'активних пачок'])}`}
        />
        <KpiCard
          value={formatWeightGrams(averageMonthlyWeight)}
          label="Середній розхід"
          context="кави на місяць"
        />
        <KpiCard
          value={stats.monthCoffees}
          label="Кави цього місяця"
          context={`${stats.monthSpent} ₴ витрачено`}
        />
      </section>

      <div className="dashboard-overview-grid">
        <section className="dashboard-activity">
          <div className="dashboard-section-head">
            <h2>Остання активність</h2>
          </div>
          {latestAdded.length === 0 ? (
            <div className="dashboard-empty">Додай першу каву, і вона з’явиться тут.</div>
          ) : (
            <ol className="dashboard-timeline">
              {latestAdded.map((coffee) => (
                <li key={coffee.id}>
                  <span className="dashboard-timeline__mark" aria-hidden="true">+</span>
                  <div>
                    <strong>Додано {coffee.name}</strong>
                    <p>
                      {[coffee.roaster?.name, coffee.price != null ? `${coffee.price} ₴` : null,
                        coffeeScore(coffee) != null ? `оцінка ${coffeeScore(coffee).toFixed(1)}` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                    <time dateTime={new Date(coffee.createdAt).toISOString()}>{formatDate(coffee.createdAt)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="dashboard-month">
          <span className="dashboard-month__label">Цей місяць</span>
          <strong>
            {stats.monthCoffees} {pluralizeUk(stats.monthCoffees, ['пачка', 'пачки', 'пачок'])}
          </strong>
          <div className="dashboard-month__row">
            <span>Вага</span>
            <b>{formatWeightGrams(stats.monthWeightGrams)}</b>
          </div>
          <div className="dashboard-month__row">
            <span>Витрачено</span>
            <b>{stats.monthSpent} ₴</b>
          </div>
          <div className="dashboard-month__row">
            <span>Середня ціна</span>
            <b>{stats.monthCoffees ? Math.round(stats.monthSpent / stats.monthCoffees) : 0} ₴</b>
          </div>
        </section>
      </div>

      <div className="dashboard-content-grid">
        <section>
          <div className="dashboard-section-head">
            <h2>Останні кави</h2>
            <div className="spacer" />
            <Link href="/coffees">Уся колекція →</Link>
          </div>
          {recentCoffees.length === 0 ? (
            <div className="dashboard-empty">У колекції ще немає кав.</div>
          ) : (
            <div className="dashboard-coffee-list">
              {recentCoffees.map((coffee) => <CoffeeRow key={coffee.id} coffee={coffee} />)}
            </div>
          )}
        </section>

        <section>
          <div className="dashboard-section-head">
            <h2>Найкращі обсмажчики</h2>
          </div>
          <div className="card dashboard-roasters">
            {stats.topRoasters.length === 0 ? (
              <p className="dashboard-empty dashboard-empty--compact">Ще немає даних.</p>
            ) : (
              <ol>
                {stats.topRoasters.slice(0, 3).map((roaster, index) => (
                  <li key={roaster.key}>
                    <span className="dashboard-roasters__index">{index + 1}</span>
                    <span className="dashboard-roasters__copy">
                      <strong>{roaster.key}</strong>
                      <small>{roaster.count} {pluralizeUk(roaster.count, ['кава', 'кави', 'кав'])}</small>
                    </span>
                    <b>{roaster.avg != null ? roaster.avg.toFixed(1) : '—'}</b>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
