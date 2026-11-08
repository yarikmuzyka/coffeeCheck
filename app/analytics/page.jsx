import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { computeOriginInsights, computeProcessInsights, coffeeScore } from '../../lib/stats.js'
import { pluralizeUk } from '../../lib/format.js'
import { requireUser } from '../../lib/auth.js'

export const dynamic = 'force-dynamic'

function formatScore(value) {
  return value == null ? '—' : value.toFixed(1)
}

function originHref(country) {
  return `/analytics?country=${encodeURIComponent(country)}`
}

function processHref(process) {
  return `/analytics?view=process&process=${encodeURIComponent(process)}`
}

function OriginRanking({ origins, selectedKey }) {
  return (
    <ol className="origin-ranking" aria-label="Рейтинг країн">
      {origins.map((origin, index) => {
        const isSelected = origin.key === selectedKey
        const width = origin.avg == null ? 0 : Math.round((origin.avg / 5) * 100)

        return (
          <li key={origin.key}>
            <Link
              href={originHref(origin.key)}
              className={`origin-ranking__row${isSelected ? ' origin-ranking__row--active' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              <span className="origin-ranking__index">{index + 1}</span>
              <span className="origin-ranking__copy">
                <strong>{origin.key}</strong>
                <small>
                  {origin.count} {pluralizeUk(origin.count, ['кава', 'кави', 'кав'])}
                  {' · '}{origin.regions.length} {pluralizeUk(origin.regions.length, ['регіон', 'регіони', 'регіонів'])}
                </small>
              </span>
              <b>{formatScore(origin.avg)}</b>
              <span className="origin-ranking__meter" aria-hidden="true">
                <i style={{ width: `${width}%` }} />
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

function ProcessRanking({ processes, selectedKey }) {
  return (
    <ol className="origin-ranking" aria-label="Рейтинг обробок">
      {processes.map((process, index) => {
        const isSelected = process.key === selectedKey
        const width = process.avg == null ? 0 : Math.round((process.avg / 5) * 100)

        return (
          <li key={process.key}>
            <Link
              href={processHref(process.key)}
              className={`origin-ranking__row${isSelected ? ' origin-ranking__row--active' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              <span className="origin-ranking__index">{index + 1}</span>
              <span className="origin-ranking__copy">
                <strong>{process.key}</strong>
                <small>
                  {process.count} {pluralizeUk(process.count, ['кава', 'кави', 'кав'])}
                  {' · '}{process.countries.length} {pluralizeUk(process.countries.length, ['країна', 'країни', 'країн'])}
                </small>
              </span>
              <b>{formatScore(process.avg)}</b>
              <span className="origin-ranking__meter" aria-hidden="true">
                <i style={{ width: `${width}%` }} />
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

function OriginDetail({ origin }) {
  const topRegion = origin.regions.find((region) => region.avg != null)
  const topCoffee = origin.topCoffee

  return (
    <section className="origin-detail" aria-label={`Деталі про ${origin.key}`}>
      <header className="origin-detail__head">
        <div>
          <span>Лідер за твоїми оцінками</span>
          <h2>{origin.key}</h2>
        </div>
        <div className="origin-detail__score">
          <strong>{formatScore(origin.avg)}</strong>
          <small>/5 середня</small>
        </div>
      </header>

      <div className="origin-regions" aria-label="Регіони">
        {origin.regions.slice(0, 3).map((region) => (
          <div key={region.key}>
            <strong>{region.key}</strong>
            <small>
              {formatScore(region.avg)} /5 · {region.count}{' '}
              {pluralizeUk(region.count, ['кава', 'кави', 'кав'])}
            </small>
          </div>
        ))}
      </div>

      <p className="origin-detail__label">Твоя найкраща кава звідси</p>
      {topCoffee ? (
        <Link href={`/coffees/${topCoffee.id}`} className="origin-winner">
          <span className="origin-winner__mark">TOP</span>
          <span>
            <strong>{topCoffee.name}</strong>
            <small>
              {[topCoffee.roaster?.name, topCoffee.region, topCoffee.process].filter(Boolean).join(' · ')}
            </small>
          </span>
          <b>{formatScore(coffeeScore(topCoffee))}</b>
        </Link>
      ) : (
        <div className="origin-detail__empty">Додай оцінку, щоб побачити фаворита.</div>
      )}

      {topRegion && (
        <p className="origin-insight">
          Найбільше тобі заходить <strong>{topRegion.key}</strong>:
          {' '}середня оцінка <strong>{formatScore(topRegion.avg)}/5</strong> на основі{' '}
          {topRegion.ratedCount} {pluralizeUk(topRegion.ratedCount, ['оцінки', 'оцінок', 'оцінок'])}.
        </p>
      )}
    </section>
  )
}

function ProcessDetail({ process }) {
  const topCountry = process.countries.find((country) => country.avg != null)
  const topCoffee = process.topCoffee

  return (
    <section className="origin-detail" aria-label={`Деталі про обробку ${process.key}`}>
      <header className="origin-detail__head">
        <div>
          <span>Обробка за твоїми оцінками</span>
          <h2>{process.key}</h2>
        </div>
        <div className="origin-detail__score">
          <strong>{formatScore(process.avg)}</strong>
          <small>/5 середня</small>
        </div>
      </header>

      <div className="origin-regions" aria-label="Країни">
        {process.countries.slice(0, 3).map((country) => (
          <div key={country.key}>
            <strong>{country.key}</strong>
            <small>
              {formatScore(country.avg)} /5 · {country.count}{' '}
              {pluralizeUk(country.count, ['кава', 'кави', 'кав'])}
            </small>
          </div>
        ))}
      </div>

      <p className="origin-detail__label">Твоя найкраща кава з цією обробкою</p>
      {topCoffee ? (
        <Link href={`/coffees/${topCoffee.id}`} className="origin-winner">
          <span className="origin-winner__mark">TOP</span>
          <span>
            <strong>{topCoffee.name}</strong>
            <small>
              {[topCoffee.roaster?.name, topCoffee.originCountry, topCoffee.region].filter(Boolean).join(' · ')}
            </small>
          </span>
          <b>{formatScore(coffeeScore(topCoffee))}</b>
        </Link>
      ) : (
        <div className="origin-detail__empty">Додай оцінку, щоб побачити фаворита.</div>
      )}

      {topCountry && (
        <p className="origin-insight">
          Ця обробка найкраще заходить у каві з <strong>{topCountry.key}</strong>:
          {' '}середня оцінка <strong>{formatScore(topCountry.avg)}/5</strong> на основі{' '}
          {topCountry.ratedCount} {pluralizeUk(topCountry.ratedCount, ['оцінки', 'оцінок', 'оцінок'])}.
        </p>
      )}
    </section>
  )
}

export default async function AnalyticsPage({ searchParams }) {
  const user = await requireUser()
  const params = await searchParams
  const coffees = await prisma.coffee.findMany({
    where: { userId: user.id },
    include: { roaster: true },
  })
  const view = params?.view === 'process' ? 'process' : 'origin'
  const origins = computeOriginInsights(coffees)
  const processes = computeProcessInsights(coffees)
  const requestedCountry = params?.country
  const requestedProcess = params?.process
  const selectedOrigin = origins.find((origin) => origin.key === requestedCountry) ?? origins[0]
  const selectedProcess = processes.find((process) => process.key === requestedProcess) ?? processes[0]

  return (
    <div className="analytics-page">
      <header className="analytics-head">
        <div>
          <span className="analytics-kicker">Аналітика смаку</span>
          <h1>Що тобі заходить найбільше</h1>
          <p className="sub">Походження, обробки та найкращі лоти за твоїми оцінками</p>
        </div>
        <span className="analytics-period">Увесь час</span>
      </header>

      <nav className="analytics-tabs" aria-label="Тип аналітики">
        <Link href="/analytics" className={view === 'origin' ? 'analytics-tabs__active' : undefined}>Походження</Link>
        <Link href="/analytics?view=process" className={view === 'process' ? 'analytics-tabs__active' : undefined}>Обробка</Link>
      </nav>

      {view === 'origin' && origins.length === 0 ? (
        <div className="card analytics-empty">
          <h2>Ще немає даних про походження</h2>
          <p>Додай країну та регіон у картках кави.</p>
          <Link href="/coffees" className="btn btn--primary">Перейти до кав</Link>
        </div>
      ) : view === 'origin' ? (
        <div className="origin-analytics-grid">
          <OriginRanking origins={origins} selectedKey={selectedOrigin.key} />
          <OriginDetail origin={selectedOrigin} />
        </div>
      ) : processes.length === 0 ? (
        <div className="card analytics-empty">
          <h2>Ще немає даних про обробку</h2>
          <p>Додай обробку у картках кави.</p>
          <Link href="/coffees" className="btn btn--primary">Перейти до кав</Link>
        </div>
      ) : (
        <div className="origin-analytics-grid">
          <ProcessRanking processes={processes} selectedKey={selectedProcess.key} />
          <ProcessDetail process={selectedProcess} />
        </div>
      )}
    </div>
  )
}
