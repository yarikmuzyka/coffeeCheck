import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma.js'
import { coffeeScore } from '../../../lib/stats.js'
import { deleteCoffee, toggleCoffeeFinished, toggleWouldBuyAgain } from '../../../lib/actions.js'
import { ConfirmSubmitButton } from '../../components/ConfirmSubmitButton.jsx'
import { requireUser } from '../../../lib/auth.js'

export const dynamic = 'force-dynamic'

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('uk') : '—'
}

export default async function CoffeeDetailPage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const coffee = await prisma.coffee.findFirst({
    where: { id, userId: user.id },
    include: {
      roaster: true,
      brewLogs: { where: { userId: user.id }, orderBy: { brewedAt: 'desc' } },
    },
  })
  if (!coffee) notFound()

  const score = coffeeScore(coffee)

  const info = [
    ['Обсмажчик', coffee.roaster?.name],
    ['Країна', coffee.originCountry],
    ['Регіон', coffee.region],
    ['Сорт', coffee.variety],
    ['Обробка', coffee.process],
    ['Оцінка SCA', coffee.scaScore != null ? coffee.scaScore : null],
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
        <Link href={`/coffees/${coffee.id}/edit`} className="btn btn--secondary btn--sm">Редагувати</Link>
        <div className="score-pill" style={{ fontSize: '2rem' }}>
          {score != null ? score.toFixed(1) : '—'}<br /><small>моя оцінка /10</small>
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
          <form action={toggleCoffeeFinished} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={coffee.id} />
            <input type="hidden" name="value" value={coffee.isFinished ? 'false' : 'true'} />
            <button className={`btn btn--sm ${coffee.isFinished ? 'btn--secondary' : 'btn--ghost'}`}>
              {coffee.isFinished ? '✓ Пачка завершена — повернути в активні' : 'Позначити пачку завершеною'}
            </button>
          </form>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>Журнал заварювань</h2>
          <p className="sub">{coffee.brewLogs.length} записів</p>
        </div>
        <div className="spacer" />
        <Link href={`/brew-logs/new?coffee=${coffee.id}`} className="btn btn--primary">
          + Додати заварювання
        </Link>
      </div>

      {coffee.brewLogs.length === 0 ? (
        <p className="empty">Ще немає заварювань для цієї кави.</p>
      ) : (
        <div className="coffee-list">
          {coffee.brewLogs.map((log) => (
            <article key={log.id} className="card">
              <div className="toolbar">
                <div>
                  <h3 style={{ margin: 0 }}>
                    {log.method}{log.recipeName ? ` — ${log.recipeName}` : ''}
                  </h3>
                  <p className="meta">
                    {[fmtDate(log.brewedAt), log.ratio, log.doseGrams != null ? `${log.doseGrams} г кави` : null,
                      log.waterGrams != null ? `${log.waterGrams} г води` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="spacer" />
                <div className="score-pill">
                  {log.overallScore ?? '—'}<br /><small>/10</small>
                </div>
              </div>
              {log.perceivedNotes && <p><strong>Ноти:</strong> {log.perceivedNotes}</p>}
              {log.notes && <p className="meta">{log.notes}</p>}
            </article>
          ))}
        </div>
      )}

      <form action={deleteCoffee} style={{ marginTop: 32 }}>
        <input type="hidden" name="id" value={coffee.id} />
        <ConfirmSubmitButton
          className="btn btn--ghost"
          message="Видалити цю каву разом з усіма її заварюваннями? Цю дію не можна скасувати."
        >
          Видалити каву
        </ConfirmSubmitButton>
      </form>
    </div>
  )
}
