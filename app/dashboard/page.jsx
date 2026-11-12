import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { averageMonthlyWeightGrams, coffeeScore, computeHomeSummary, computeTasteLeaders } from '../../lib/stats.js'
import { formatWeightGrams, pluralizeUk } from '../../lib/format.js'
import { requireUser } from '../../lib/auth.js'
import { COFFEE_PROCESSES_INCLUDE, coffeeProcessLabel } from '../../lib/coffee-processes.js'
import { newLotCutoff } from '../../lib/new-lot-feed.js'
import { recommendLots, sortByRecommendation } from '../../lib/lot-recommendations.js'

export const dynamic = 'force-dynamic'

const OPEN_COFFEES_LIMIT = 5
const NEW_LOTS_LIMIT = 3

function formatScore(value) {
  return value == null ? '—' : value.toFixed(1)
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('uk-UA').format(value)} ₴`
}

function firstName(name) {
  return (name ?? '').trim().split(/\s+/)[0] || null
}

function StatTile({ value, label }) {
  return (
    <div className="home-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function OpenCoffeeRow({ coffee }) {
  const score = coffeeScore(coffee)
  const meta = [coffee.roaster?.name, coffeeProcessLabel(coffee), coffee.price != null ? `${coffee.price} ₴` : null]
    .filter(Boolean).join(' · ')

  return (
    <li className="home-row">
      <Link href={`/coffees/${coffee.id}`} className="home-row__main">
        <strong>{coffee.name}</strong>
        <small>{meta}</small>
      </Link>
      <Link href={`/brew-logs/new?coffee=${coffee.id}`} className="home-brew" title="Додати заварювання">
        Заварити<span className="sr-only"> {coffee.name}</span>
      </Link>
      {score != null ? (
        <span className="home-score" title="Моя оцінка">{formatScore(score)}</span>
      ) : (
        <Link href={`/coffees/${coffee.id}/edit`} className="home-score home-score--empty">Оцінити</Link>
      )}
    </li>
  )
}

function TasteTile({ label, leader, href }) {
  if (!leader) {
    return (
      <div className="home-taste home-taste--empty">
        <small>{label}</small>
        <strong>—</strong>
      </div>
    )
  }
  return (
    <Link href={href} className="home-taste">
      <small>{label}</small>
      <strong title={leader.key}>{leader.key}</strong>
      <b>{formatScore(leader.avg)}</b>
    </Link>
  )
}

export default async function DashboardPage() {
  const user = await requireUser()
  const lotWindow = { isAvailable: true, firstSeenAt: { gte: newLotCutoff() } }
  const [coffees, newLots, newLotCount, wishedCount] = await Promise.all([
    prisma.coffee.findMany({
      where: { userId: user.id },
      include: { roaster: true, ...COFFEE_PROCESSES_INCLUDE },
    }),
    prisma.externalLot.findMany({ where: lotWindow, orderBy: { firstSeenAt: 'desc' }, take: 40 }),
    prisma.externalLot.count({ where: lotWindow }),
    prisma.wishedLot.count({ where: { userId: user.id } }),
  ])

  const summary = computeHomeSummary(coffees)
  const taste = computeTasteLeaders(coffees)
  const monthlyWeight = averageMonthlyWeightGrams(coffees)
  const roasterId = taste.roaster ? coffees.find((coffee) => coffee.roaster?.name === taste.roaster.key)?.roasterId : null
  // Неоцінені кави — першими, щоб підказка «Оцінити» була на виду.
  const openCoffees = [
    ...summary.openCoffees.filter((coffee) => coffeeScore(coffee) == null),
    ...summary.openCoffees.filter((coffee) => coffeeScore(coffee) != null),
  ].slice(0, OPEN_COFFEES_LIMIT)
  // Спершу лоти під смак користувача, далі — з міткою магазину, далі найсвіжіші.
  const recommendations = recommendLots(newLots, coffees)
  const featuredLots = sortByRecommendation(
    [...newLots].sort((a, b) => Number(Boolean(b.sourceBadge)) - Number(Boolean(a.sourceBadge))),
    recommendations,
  ).slice(0, NEW_LOTS_LIMIT)

  const name = firstName(user.name)
  const nudges = [
    summary.unratedOpenCount > 0
      ? `${summary.unratedOpenCount} ${pluralizeUk(summary.unratedOpenCount, ['кава чекає', 'кави чекають', 'кав чекають'])} на оцінку`
      : null,
    newLotCount > 0 ? `${newLotCount} ${pluralizeUk(newLotCount, ['новий лот', 'нові лоти', 'нових лотів'])}` : null,
  ].filter(Boolean)

  return (
    <div className="home-page">
      <header className="home-head">
        <div>
          <h1>{name ? `Привіт, ${name}` : 'Привіт'}</h1>
          <p className="sub">{nudges.length ? nudges.join(' · ') : 'Колекція, покупки та твій смак в одному місці'}</p>
        </div>
        <div className="home-head__actions">
          <Link href="/brew-logs/new" className="btn btn--secondary btn--sm">+ Заварювання</Link>
          <Link href="/coffees/new" className="btn btn--primary btn--sm">+ Кава</Link>
        </div>
      </header>

      <section className="home-stats" aria-label="Коротка статистика">
        <StatTile
          value={summary.totalCoffees}
          label={`${pluralizeUk(summary.totalCoffees, ['кава', 'кави', 'кав'])} · ${summary.openCount} ${pluralizeUk(summary.openCount, ['відкрита', 'відкриті', 'відкритих'])}`}
        />
        <StatTile value={formatWeightGrams(monthlyWeight)} label="розхід на місяць" />
        <StatTile
          value={summary.recentCount > 0 ? `${summary.recentCount} · ${formatMoney(summary.recentSpent)}` : '0'}
          label={`${pluralizeUk(summary.recentCount, ['пачка', 'пачки', 'пачок'])} за ${summary.recentDays} днів`}
        />
        <StatTile value={formatScore(summary.averageScore)} label="середня оцінка" />
      </section>

      <div className="home-grid">
        <section className="home-card" aria-labelledby="home-open">
          <div className="home-card__head">
            <h2 id="home-open">Зараз відкриті</h2>
            <Link href="/coffees?status=active">Уся колекція →</Link>
          </div>
          {openCoffees.length === 0 ? (
            <p className="home-empty">
              Немає відкритих пачок. <Link href="/coffees/new">Додай каву →</Link>
            </p>
          ) : (
            <ul className="home-list">
              {openCoffees.map((coffee) => <OpenCoffeeRow key={coffee.id} coffee={coffee} />)}
            </ul>
          )}
        </section>

        <section className="home-card" aria-labelledby="home-lots">
          <div className="home-card__head">
            <h2 id="home-lots">Нові лоти</h2>
            <Link href="/new-lots">{newLotCount > 0 ? `Усі ${newLotCount} →` : 'Відкрити →'}</Link>
          </div>
          {featuredLots.length === 0 ? (
            <p className="home-empty">Нових лотів поки немає — оновлення раз на два дні.</p>
          ) : (
            <ul className="home-list">
              {featuredLots.map((lot) => (
                <li key={lot.id} className="home-row">
                  {recommendations.get(lot.id)?.marker && (
                    <span
                      className="home-marker"
                      role="img"
                      title={recommendations.get(lot.id).marker.label}
                      aria-label={recommendations.get(lot.id).marker.label}
                    >
                      {recommendations.get(lot.id).marker.emoji}
                    </span>
                  )}
                  <a href={lot.productUrl} target="_blank" rel="noreferrer" className="home-row__main">
                    <strong>{lot.name}</strong>
                    <small>{[lot.roasterName, lot.price != null ? formatMoney(lot.price) : null].filter(Boolean).join(' · ')}</small>
                  </a>
                  {lot.sourceBadge && <span className="home-tag">{lot.sourceBadge}</span>}
                </li>
              ))}
            </ul>
          )}
          <Link href="/new-lots?tab=wish" className="home-card__foot">
            Хочу спробувати: {wishedCount}
          </Link>
        </section>
      </div>

      <section aria-labelledby="home-taste">
        <h2 id="home-taste" className="home-section-title">
          Твій смак <small>за твоїми оцінками</small>
        </h2>
        <div className="home-taste-grid">
          <TasteTile
            label="Обсмажчик"
            leader={taste.roaster}
            href={roasterId ? `/coffees?roaster=${encodeURIComponent(roasterId)}` : '/coffees'}
          />
          <TasteTile
            label="Країна"
            leader={taste.country}
            href={taste.country ? `/analytics?country=${encodeURIComponent(taste.country.key)}` : '/analytics'}
          />
          <TasteTile
            label="Обробка"
            leader={taste.process}
            href={taste.process ? `/analytics?view=process&process=${encodeURIComponent(taste.process.key)}` : '/analytics?view=process'}
          />
        </div>
      </section>
    </div>
  )
}
