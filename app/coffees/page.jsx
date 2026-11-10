import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { coffeeScore } from '../../lib/stats.js'
import { requireUser } from '../../lib/auth.js'
import { getUsageSnapshot } from '../../lib/entitlements.js'
import { sortCoffeeEntries } from '../../lib/coffee-sort.js'
import { COFFEE_PROCESSES_INCLUDE, coffeeHasProcess, coffeeProcessLabel } from '../../lib/coffee-processes.js'

export const dynamic = 'force-dynamic'

export default async function CoffeesPage({ searchParams }) {
  const user = await requireUser()
  const sp = await searchParams
  const query = (sp.q ?? '').trim()
  const q = query.toLowerCase()
  const roasterId = sp.roaster ?? ''
  const country = sp.country ?? ''
  const process = sp.process ?? ''
  const status = sp.status ?? ''
  const sort = sp.sort ?? 'date'

  const coffeeHref = (overrides = {}) => {
    const values = {
      q: query,
      roaster: roasterId,
      country,
      process,
      status,
      sort,
      ...overrides,
    }
    const params = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const search = params.toString()
    return search ? `/coffees?${search}` : '/coffees'
  }

  const [allCoffees, roasters, processes, usage] = await Promise.all([
    prisma.coffee.findMany({ where: { userId: user.id }, include: { roaster: true, ...COFFEE_PROCESSES_INCLUDE } }),
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    getUsageSnapshot(prisma, user.id),
  ])

  const countries = [...new Set(allCoffees.map((c) => c.originCountry).filter(Boolean))].sort()

  let list = allCoffees.filter((c) => {
    if (roasterId && c.roasterId !== roasterId) return false
    if (country && c.originCountry !== country) return false
    if (process && !coffeeHasProcess(c, process)) return false
    if (status === 'active' && c.isFinished) return false
    if (status === 'finished' && !c.isFinished) return false
    if (q) {
      const hay = [c.name, c.roaster?.name, c.originCountry, c.region, c.variety]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const withScore = sortCoffeeEntries(
    list.map((c) => ({ c, score: coffeeScore(c) })),
    sort,
  )
  const activeFilterCount = [roasterId, country, process, status].filter(Boolean).length
  const sortOptions = [
    ['date', 'Дата'],
    ['rating', 'Оцінка ↓'],
    ['name', 'Назва'],
    ['roaster', 'Обсмажчик'],
    ['price', 'Ціна'],
  ]

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Кави</h1>
          <p className="sub">{list.length} із {allCoffees.length}</p>
        </div>
        <div className="spacer" />
        {usage.resources.coffees.reached ? (
          <span className="btn btn--disabled" aria-disabled="true">Ліміт кав вичерпано</span>
        ) : (
          <Link href="/coffees/new" className="btn btn--primary">+ Додати каву</Link>
        )}
      </div>

      <div className="coffee-controls">
        <details className="coffee-control" open={Boolean(query)}>
          <summary className="btn btn--secondary btn--sm">
            <span className="coffee-control-icon coffee-control-icon--search" aria-hidden="true" />
            Пошук
            {query && <span className="coffee-control-count">1</span>}
          </summary>
          <form className="card coffee-control-panel coffee-search-panel" method="get">
            <input type="hidden" name="roaster" value={roasterId} />
            <input type="hidden" name="country" value={country} />
            <input type="hidden" name="process" value={process} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="sort" value={sort} />
            <div className="field">
              <label htmlFor="coffee-search">Пошук за кавою</label>
              <input id="coffee-search" name="q" defaultValue={query} placeholder="назва, регіон, сорт…" />
            </div>
            <div className="coffee-control-actions">
              <button className="btn btn--secondary btn--sm" type="submit">Знайти</button>
              {query && <Link href={coffeeHref({ q: '' })} className="btn btn--ghost btn--sm">Очистити</Link>}
            </div>
          </form>
        </details>

        <details className="coffee-control" open={activeFilterCount > 0}>
          <summary className="btn btn--secondary btn--sm">
            <span className="coffee-control-icon coffee-control-icon--filters" aria-hidden="true" />
            Фільтри
            {activeFilterCount > 0 && <span className="coffee-control-count">{activeFilterCount}</span>}
          </summary>
          <form className="card coffee-control-panel" method="get">
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="sort" value={sort} />
            <div className="coffee-filter-grid">
              <div className="field">
                <label>Обсмажчик</label>
                <select name="roaster" defaultValue={roasterId}>
                  <option value="">усі</option>
                  {roasters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Країна</label>
                <select name="country" defaultValue={country}>
                  <option value="">усі</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Обробка</label>
                <select name="process" defaultValue={process}>
                  <option value="">усі</option>
                  {processes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Статус</label>
                <select name="status" defaultValue={status}>
                  <option value="">усі</option>
                  <option value="active">активна</option>
                  <option value="finished">завершена</option>
                </select>
              </div>
            </div>
            <div className="coffee-control-actions">
              <button className="btn btn--secondary btn--sm" type="submit">Застосувати фільтри</button>
              {activeFilterCount > 0 && (
                <Link
                  href={coffeeHref({ roaster: '', country: '', process: '', status: '' })}
                  className="btn btn--ghost btn--sm"
                >
                  Скинути фільтри
                </Link>
              )}
            </div>
          </form>
        </details>
      </div>

      <nav className="coffee-sort" aria-label="Сортування кав">
        <strong>Сортувати:</strong>
        {sortOptions.map(([value, label]) => (
          <Link
            key={value}
            href={coffeeHref({ sort: value })}
            className={`coffee-sort-option${sort === value ? ' coffee-sort-option--active' : ''}`}
            aria-current={sort === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {withScore.length === 0 ? (
        <p className="empty">Нічого не знайдено.</p>
      ) : (
        <div className="coffee-list">
          {withScore.map(({ c, score }) => (
            <Link key={c.id} href={`/coffees/${c.id}`} className="card coffee-row">
              <div>
                <h3>
                  {c.name}
                  {c.wouldBuyAgain && <span className="badge badge--value">купив би ще</span>}
                  {c.isFinished && <span className="badge badge--finished">завершена</span>}
                </h3>
                <p className="meta">
                  {[c.roaster?.name, c.originCountry, c.variety, coffeeProcessLabel(c)]
                    .filter(Boolean).join(' · ')}
                  {c.price ? ` · ${c.price} ₴` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {c.scaScore != null && (
                  <div className="score-pill score-pill--sca">
                    {c.scaScore}<br /><small>SCA</small>
                  </div>
                )}
                <div className="score-pill">
                  {score != null ? score.toFixed(1) : '—'}<br /><small>/5</small>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
