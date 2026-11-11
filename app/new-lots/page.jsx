import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { requireUser } from '../../lib/auth.js'
import { buildNewCoffeeHref, filterAndSortLots, matchesFeedFilters, newLotCutoff, uniqueSorted } from '../../lib/new-lot-feed.js'
import { removeWishedLot, saveWishedLot } from '../../lib/new-lot-actions.js'
import { COFFEE_PROCESSES_INCLUDE } from '../../lib/coffee-processes.js'
import { recommendLots, sortByRecommendation } from '../../lib/lot-recommendations.js'

export const dynamic = 'force-dynamic'

// Пояснення до емодзі в кутку фото пачки (див. lotMarker).
const LEGEND = [
  ['🎯', 'під твій смак'],
  ['🤩', 'пив, 4.5+'],
  ['🙂', 'пив, 3.5–4.4'],
  ['😐', 'пив, 2.5–3.4'],
  ['😖', 'пив, нижче 2.5'],
  ['🤔', 'пив, без оцінки'],
]

function formatPrice(value, currency = 'UAH') {
  if (value == null) return 'Ціну не вказано'
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(value)
}

function filterHref(tab, filters = {}) {
  const params = new URLSearchParams()
  if (tab !== 'new') params.set('tab', tab)
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const query = params.toString()
  return query ? `/new-lots?${query}` : '/new-lots'
}

function LotImage({ lot, marker }) {
  return (
    <div className="new-lot-media">
      {lot.imageUrl ? (
        <img className="new-lot-image" src={lot.imageUrl} alt={`Пачка ${lot.name}`} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="new-lot-image new-lot-image--empty" aria-hidden="true">V60</div>
      )}
      {marker && (
        <span className="new-lot-marker" title={marker.label} role="img" aria-label={marker.label}>{marker.emoji}</span>
      )}
    </div>
  )
}

function LotCard({ lot, isWished, wishCreatedAt, recommendation }) {
  const recommended = recommendation?.recommended
  const marker = recommendation?.marker
  return (
    <article className="new-lot-card card">
      <LotImage lot={lot} marker={marker} />
      <div className="new-lot-card__copy">
        <div className="new-lot-card__eyebrow">
          <span>{lot.roasterName}</span>
          {lot.sourceBadge && <span className="pill">{lot.sourceBadge}</span>}
          {!lot.isAvailable && <span className="pill new-lot-pill--muted">Не в продажу</span>}
        </div>
        <h2>{lot.name}</h2>
        <p className="meta">
          {[lot.originCountry, lot.region, lot.processNames.join(' + ')].filter(Boolean).join(' · ') || 'Деталі уточнюються'}
        </p>
        {lot.tastingNotes.length > 0 && <p className="new-lot-notes">{lot.tastingNotes.join(', ')}</p>}
        {recommended && recommendation.reasonText && (
          <p className="new-lot-why">🎯 {recommendation.reasonText}</p>
        )}
        {recommendation?.tried && (
          <p className="new-lot-tried">
            <Link href={`/coffees/${recommendation.triedCoffeeId}`}>{marker.label}</Link>
          </p>
        )}
        <p className="new-lot-seen">
          {wishCreatedAt ? `У списку з ${formatDate(wishCreatedAt)}` : `Знайдено ${formatDate(lot.firstSeenAt)}`}
          {lot.packageSizes.length > 0 ? ` · ${lot.packageSizes.join(' / ')}` : ''}
        </p>
      </div>
      <div className="new-lot-card__actions">
        <strong>{formatPrice(lot.price, lot.currency)}</strong>
        <div className="new-lot-card__buttons">
          <a className="btn btn--ghost" href={lot.productUrl} target="_blank" rel="noreferrer">До магазину ↗</a>
          {isWished ? (
            <>
              <Link className="btn btn--primary" href={buildNewCoffeeHref(lot.id)}>Купив — у колекцію</Link>
              <form action={removeWishedLot}>
                <input type="hidden" name="lotId" value={lot.id} />
                <button className="btn btn--ghost" type="submit">Прибрати зі списку</button>
              </form>
            </>
          ) : (
            <form action={saveWishedLot}>
              <input type="hidden" name="lotId" value={lot.id} />
              <button className="btn btn--primary" type="submit">♡ Хочу спробувати</button>
            </form>
          )}
        </div>
      </div>
    </article>
  )
}

export default async function NewLotsPage({ searchParams }) {
  const user = await requireUser()
  const params = await searchParams
  const tab = ['wish', 'match'].includes(params?.tab) ? params.tab : 'new'
  const filters = {
    roaster: params?.roaster ?? '',
    country: params?.country ?? '',
    process: params?.process ?? '',
  }

  const [recentLots, wishedItems, latestSync, coffees] = await Promise.all([
    prisma.externalLot.findMany({
      where: { isAvailable: true, firstSeenAt: { gte: newLotCutoff() } },
      include: { wishedBy: { where: { userId: user.id }, select: { createdAt: true } } },
      orderBy: { firstSeenAt: 'desc' },
    }),
    prisma.wishedLot.findMany({
      where: { userId: user.id },
      include: { lot: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.externalLot.aggregate({ _max: { lastSeenAt: true } }),
    prisma.coffee.findMany({
      where: { userId: user.id },
      include: { roaster: true, ...COFFEE_PROCESSES_INCLUDE },
    }),
  ])

  const recommendations = recommendLots(
    [...recentLots, ...wishedItems.map((item) => item.lot)],
    coffees,
  )
  const matchedLots = sortByRecommendation(
    recentLots.filter((lot) => recommendations.get(lot.id)?.recommended),
    recommendations,
  )
  const allFilterLots = tab === 'wish' ? wishedItems.map((item) => item.lot) : tab === 'match' ? matchedLots : recentLots
  const lots = tab === 'new'
    ? filterAndSortLots(allFilterLots, filters)
    : allFilterLots.filter((lot) => matchesFeedFilters(lot, filters))
  const roasters = uniqueSorted(allFilterLots.map((lot) => lot.roasterName))
  const countries = uniqueSorted(allFilterLots.map((lot) => lot.originCountry))
  const processes = uniqueSorted(allFilterLots.flatMap((lot) => lot.processNames))
  const wishedByLot = new Map(wishedItems.map((item) => [item.lotId, item.createdAt]))

  return (
    <div className="new-lots-page">
      <header className="new-lots-head">
        <div>
          <h1>Нові лоти</h1>
          <p className="sub">Свіжа фільтр-кава від DAM Coffee, Foundation і Penyora</p>
        </div>
        <p className="new-lots-updated">
          {latestSync._max.lastSeenAt ? `Перевірено ${formatDate(latestSync._max.lastSeenAt)}` : 'Очікуємо перше оновлення'}
          <small>Оновлення раз на два дні</small>
        </p>
      </header>

      <nav className="new-lots-tabs" aria-label="Розділи нових лотів">
        <Link href={filterHref('new')} className={tab === 'new' ? 'new-lots-tabs__active' : undefined}>
          Новинки <span>{recentLots.length}</span>
        </Link>
        <Link href={filterHref('match')} className={tab === 'match' ? 'new-lots-tabs__active' : undefined}>
          🎯 Для мене <span>{matchedLots.length}</span>
        </Link>
        <Link href={filterHref('wish')} className={tab === 'wish' ? 'new-lots-tabs__active' : undefined}>
          Хочу спробувати <span>{wishedItems.length}</span>
        </Link>
      </nav>

      <ul className="new-lots-legend" aria-label="Що означають емодзі на пачках">
        {LEGEND.map(([emoji, label]) => (
          <li key={emoji}><span aria-hidden="true">{emoji}</span> {label}</li>
        ))}
      </ul>

      <form className="new-lots-filters card" action="/new-lots">
        {tab !== 'new' && <input type="hidden" name="tab" value={tab} />}
        <label className="field">
          <span>Обсмажчик</span>
          <select name="roaster" defaultValue={filters.roaster}>
            <option value="">Усі</option>
            {roasters.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Країна</span>
          <select name="country" defaultValue={filters.country}>
            <option value="">Усі</option>
            {countries.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Обробка</span>
          <select name="process" defaultValue={filters.process}>
            <option value="">Усі</option>
            {processes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button className="btn btn--primary" type="submit">Застосувати</button>
        <Link className="btn btn--ghost" href={filterHref(tab)}>Скинути</Link>
      </form>

      {lots.length > 0 ? (
        <div className="new-lots-list">
          {lots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              isWished={wishedByLot.has(lot.id)}
              wishCreatedAt={wishedByLot.get(lot.id)}
              recommendation={recommendations.get(lot.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card new-lots-empty">
          <h2>{tab === 'wish' ? 'Список поки порожній' : tab === 'match' ? 'Поки нічого під твій смак' : 'Новинок за цими фільтрами немає'}</h2>
          <p>
            {tab === 'wish'
              ? 'Збережи цікаві лоти у вкладці «Новинки».'
              : tab === 'match'
                ? 'Рекомендації рахуються з твоїх оцінок за країною, обробкою й обсмажчиком. Що більше оцінених кав, то точніше.'
                : 'Спробуй скинути фільтри або зазирни після наступного оновлення.'}
          </p>
          {tab === 'wish' && <Link className="btn btn--primary" href="/new-lots">Переглянути новинки</Link>}
        </div>
      )}
    </div>
  )
}
