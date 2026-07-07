import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma.js'
import { coffeeAvgScore } from '../../../lib/stats.js'
import { deleteCoffee, toggleWouldBuyAgain } from '../../../lib/actions.js'

export const dynamic = 'force-dynamic'

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('uk') : '—'
}

export default async function CoffeeDetailPage({ params }) {
  const { id } = await params
  const coffee = await prisma.coffee.findUnique({
    where: { id },
    include: { roaster: true, brewLogs: { orderBy: { brewedAt: 'desc' } } },
  })
  if (!coffee) notFound()

  const avg = coffeeAvgScore(coffee)

  const info = [
    ['Обсмажчик', coffee.roaster?.name],
    ['Країна', coffee.originCountry],
    ['Регіон', coffee.region],
    ['Сорт', coffee.variety],
    ['Обробка', coffee.process],
    ['Дата купівлі', fmtDate(coffee.purchaseDate)],
    ['Ціна', coffee.price != null ? `${coffee.price} ₴` : null],
  ].filter(([, v]) => v)

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>{coffee.name}</h1>
          <p className="sub">{coffee.roaster?.name}</p>
        </div>
        <div className="spacer" />
        <div className="score-pill" style={{ fontSize: '2rem' }}>
          {avg != null ? avg.toFixed(1) : '—'}<br /><small>сер. оцінка /10</small>
        </div>
      </div>

      <div className="cols">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Інформація</h2>
          <dl className="detail-grid">
            {info.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt><dd>{v}</dd>
              </Fragment>
            ))}
          </dl>

          <form action={toggleWouldBuyAgain} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={coffee.id} />
            <input type="hidden" name="value" value={coffee.wouldBuyAgain ? 'false' : 'true'} />
            <button className={`btn btn--sm ${coffee.wouldBuyAgain ? 'btn--secondary' : 'btn--primary'}`}>
              {coffee.wouldBuyAgain ? '✓ Купив би ще раз' : 'Позначити «купив би ще раз»'}
            </button>
          </form>
        </div>
      </div>

      <form action={deleteCoffee} style={{ marginTop: 32 }}>
        <input type="hidden" name="id" value={coffee.id} />
        <button className="btn btn--ghost">Видалити каву</button>
      </form>
    </div>
  )
}
