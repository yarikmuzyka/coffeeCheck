import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { coffeeAvgScore } from '../../lib/stats.js'
import { deleteRoaster } from '../../lib/actions.js'

export const dynamic = 'force-dynamic'

export default async function RoastersPage() {
  const roasters = await prisma.roaster.findMany({
    orderBy: { name: 'asc' },
    include: { coffees: { include: { brewLogs: true } } },
  })

  const rows = roasters.map((r) => {
    const scores = r.coffees.map((c) => coffeeAvgScore(c)).filter((s) => s != null)
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return { r, avg, coffeeCount: r.coffees.length }
  }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Обсмажчики</h1>
          <p className="sub">{roasters.length} шт · відсортовано за середньою оцінкою</p>
        </div>
        <div className="spacer" />
        <Link href="/roasters/new" className="btn btn--primary">+ Додати обсмажчика</Link>
      </div>

      {rows.length === 0 ? (
        <p className="empty">Ще немає обсмажчиків.</p>
      ) : (
        <div className="coffee-list">
          {rows.map(({ r, avg, coffeeCount }) => (
            <div key={r.id} className="card coffee-row">
              <div>
                <h3>{r.name}</h3>
                <p className="meta">
                  {[r.city, r.country].filter(Boolean).join(', ')}
                  {coffeeCount > 0 ? ` · ${coffeeCount} кав` : ' · ще немає кав'}
                  {r.website && <> · <a href={r.website} target="_blank" rel="noreferrer">сайт</a></>}
                  {r.instagram && <> · <a href={`https://instagram.com/${r.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">ig</a></>}
                </p>
                {r.notes && <p className="notes">{r.notes}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="score-pill">
                  {avg != null ? avg.toFixed(1) : '—'}<br /><small>/10</small>
                </div>
                <form action={deleteRoaster}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn--ghost btn--sm" title="Видалити (разом з кавами)">✕</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
