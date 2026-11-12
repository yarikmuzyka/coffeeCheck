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

const KYIV = 'Europe/Kyiv'

function capitalize(text) {
  return text ? text[0].toLocaleUpperCase('uk') + text.slice(1) : text
}

function todayLabel(now = new Date()) {
  return capitalize(new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: KYIV }).format(now))
}

function entryDate(coffee) {
  const value = coffee.purchaseDate ?? coffee.createdAt
  if (!value) return null
  const date = new Date(value)
  return {
    day: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', timeZone: KYIV }).format(date),
    month: new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: KYIV }).format(date).replace('.', ''),
    full: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: KYIV }).format(date),
  }
}

function JournalEntry({ coffee }) {
  const score = coffeeScore(coffee)
  const date = entryDate(coffee)
  const meta = [coffee.roaster?.name, coffeeProcessLabel(coffee), coffee.price != null ? `${coffee.price} ₴` : null]
    .filter(Boolean).join(' · ')

  return (
    <li className="journal-entry">
      <span className="journal-entry__date" title={date?.full}>
        {date ? <><b>{date.day}</b><small>{date.month}</small></> : <b>—</b>}
      </span>
      <div className="journal-entry__main">
        <Link href={`/coffees/${coffee.id}`} className="journal-entry__name">{coffee.name}</Link>
        <small>{meta}</small>
        <Link href={`/brew-logs/new?coffee=${coffee.id}`} className="journal-entry__brew">
          Заварити<span className="sr-only"> {coffee.name}</span>
        </Link>
      </div>
      {score != null ? (
        <span className="journal-entry__score" title="Моя оцінка">
          {formatScore(score)}<small>/5</small>
        </span>
      ) : (
        <Link href={`/coffees/${coffee.id}/edit`} className="journal-entry__rate">
          <span aria-hidden="true">○</span> Оцінити
        </Link>
      )}
    </li>
  )
}

function TasteLink({ leader, href }) {
  return (
    <Link href={href} className="home-taste__link">
      <em>{leader.key}</em> ({formatScore(leader.avg)})
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
  // Щоденник: відкриті кави, найновіші першими (дата покупки або додавання).
  const recentCoffees = summary.openCoffees.slice(0, OPEN_COFFEES_LIMIT)
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

  const hasTaste = taste.roaster || taste.country || taste.process

  return (
    <div className="home-page">
      <header className="home-head">
        <div className="home-head__greeting">
          <p className="home-kicker">{todayLabel()}</p>
          <h1>{name ? <>Привіт, <em>{name}</em></> : 'Привіт'}</h1>
          <p className="sub">{nudges.length ? nudges.join(' · ') : 'Колекція, покупки та твій смак в одному місці'}</p>
        </div>
        <section className="home-cta" aria-labelledby="home-cta-title">
          <h2 id="home-cta-title">Що п'ємо сьогодні?</h2>
          <p>Запиши нову пачку або заварювання.</p>
          <div className="home-cta__actions">
            <Link href="/coffees/new" className="btn btn--primary">+ Додати каву</Link>
            <Link href="/brew-logs/new" className="btn btn--secondary">+ Заварювання</Link>
          </div>
        </section>
      </header>

      <p className="home-stats" aria-label="Коротка статистика">
        <span><b>{summary.totalCoffees}</b> {pluralizeUk(summary.totalCoffees, ['кава', 'кави', 'кав'])} у колекції, {summary.openCount} {pluralizeUk(summary.openCount, ['відкрита', 'відкриті', 'відкритих'])}</span>
        <span><b>{formatWeightGrams(monthlyWeight)}</b> на місяць</span>
        <span><b>{summary.recentCount}</b> {pluralizeUk(summary.recentCount, ['пачка', 'пачки', 'пачок'])}{summary.recentCount > 0 ? ` · ${formatMoney(summary.recentSpent)}` : ''} за {summary.recentDays} днів</span>
        <span><b>{formatScore(summary.averageScore)}</b> середня оцінка</span>
      </p>

      <div className="home-grid">
        <section className="home-journal" aria-labelledby="home-journal-title">
          <div className="home-section-head">
            <h2 id="home-journal-title">Останні записи</h2>
            <span className="home-section-head__hint">відкриті пачки</span>
            <Link href="/coffees?status=active">Уся колекція →</Link>
          </div>
          {recentCoffees.length === 0 ? (
            <p className="home-empty">
              Немає відкритих пачок. <Link href="/coffees/new">Додай каву →</Link>
            </p>
          ) : (
            <ol className="journal-list">
              {recentCoffees.map((coffee) => <JournalEntry key={coffee.id} coffee={coffee} />)}
            </ol>
          )}
        </section>

        <aside className="home-side">
          <section className="home-card" aria-labelledby="home-lots">
            <div className="home-card__head">
              <h2 id="home-lots">Нові лоти</h2>
              <Link href="/new-lots">{newLotCount > 0 ? `Усі ${newLotCount} →` : 'Відкрити →'}</Link>
            </div>
            {featuredLots.length === 0 ? (
              <p className="home-empty">Нових лотів поки немає — оновлення раз на два дні.</p>
            ) : (
              <ul className="home-list">
                {featuredLots.map((lot) => {
                  const marker = recommendations.get(lot.id)?.marker
                  return (
                    <li key={lot.id} className="home-row">
                      <span className="home-marker" aria-hidden="true">{marker?.emoji}</span>
                      <a href={lot.productUrl} target="_blank" rel="noreferrer" className="home-row__main">
                        <strong>{lot.name}</strong>
                        <small>
                          {[lot.roasterName, lot.price != null ? formatMoney(lot.price) : null, marker?.short ?? lot.sourceBadge]
                            .filter(Boolean).join(' · ')}
                        </small>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link href="/new-lots?tab=wish" className="home-card__foot">
              Хочу спробувати: {wishedCount}
            </Link>
          </section>

          <section className="home-taste" aria-labelledby="home-taste">
            <h2 id="home-taste" className="home-kicker">Твій смак</h2>
            {hasTaste ? (
              <p className="home-taste__text">
                Найвище оцінюєш
                {taste.country && <> країну <TasteLink leader={taste.country} href={`/analytics?country=${encodeURIComponent(taste.country.key)}`} /></>}
                {taste.process && <>{taste.country ? ',' : ''} обробку <TasteLink leader={taste.process} href={`/analytics?view=process&process=${encodeURIComponent(taste.process.key)}`} /></>}
                {taste.roaster && <>{taste.country || taste.process ? ' і' : ''} обсмажчика <TasteLink leader={taste.roaster} href={roasterId ? `/coffees?roaster=${encodeURIComponent(roasterId)}` : '/coffees'} /></>}.
              </p>
            ) : (
              <p className="home-taste__text">Оціни кілька кав — і тут з'явиться, що тобі смакує найбільше.</p>
            )}
            <Link href="/analytics" className="home-taste__more">Детальніше в аналітиці →</Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
