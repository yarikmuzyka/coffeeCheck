import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { coffeeAvgScore } from '../../lib/stats.js'

export const dynamic = 'force-dynamic'

export default async function CoffeesPage({ searchParams }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const roasterId = sp.roaster ?? ''
  const country = sp.country ?? ''
  const process = sp.process ?? ''
  const status = sp.status ?? ''
  const sort = sp.sort ?? 'date'

  const [allCoffees, roasters, processes] = await Promise.all([
    prisma.coffee.findMany({ include: { roaster: true, brewLogs: true } }),
    prisma.roaster.findMany({ orderBy: { name: 'asc' } }),
    prisma.process.findMany({ orderBy: { name: 'asc' } }),
  ])

  const countries = [...new Set(allCoffees.map((c) => c.originCountry).filter(Boolean))].sort()

  let list = allCoffees.filter((c) => {
    if (roasterId && c.roasterId !== roasterId) return false
    if (country && c.originCountry !== country) return false
    if (process && c.process !== process) return false
    if (status === 'active' && c.isFinished) return false
    if (status === 'finished' && !c.isFinished) return false
    if (q) {
      const hay = [c.name, c.roaster?.name, c.originCountry, c.region, c.variety]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const withScore = list.map((c) => ({ c, score: coffeeAvgScore(c) }))
  withScore.sort((a, b) => {
    if (sort === 'rating') return (b.score ?? -1) - (a.score ?? -1)
    if (sort === 'price') return (b.c.price ?? 0) - (a.c.price ?? 0)
    return new Date(b.c.purchaseDate ?? b.c.createdAt) - new Date(a.c.purchaseDate ?? a.c.createdAt)
  })

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Кави</h1>
          <p className="sub">{list.length} із {allCoffees.length}</p>
        </div>
        <div className="spacer" />
        <Link href="/coffees/new" className="btn btn--primary">+ Додати каву</Link>
      </div>

      <form className="card" method="get" style={{ marginBottom: 18 }}>
        <div className="row-3">
          <div className="field">
            <label>Пошук</label>
            <input name="q" defaultValue={sp.q ?? ''} placeholder="назва, регіон, сорт…" />
          </div>
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
          <div className="field">
            <label>Сортування</label>
            <select name="sort" defaultValue={sort}>
              <option value="date">за датою</option>
              <option value="rating">за рейтингом</option>
              <option value="price">за ціною</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <button className="btn btn--secondary btn--sm" type="submit">Застосувати</button>
          <Link href="/coffees" className="btn btn--ghost btn--sm">Скинути</Link>
        </div>
      </form>

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
                  {[c.roaster?.name, c.originCountry, c.variety, c.process]
                    .filter(Boolean).join(' · ')}
                  {c.price ? ` · ${c.price} ₴` : ''}
                </p>
              </div>
              <div className="score-pill">
                {score != null ? score.toFixed(1) : '—'}<br /><small>/10</small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
