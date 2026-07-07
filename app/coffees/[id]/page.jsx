import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma.js'
import { coffeeAvgScore, coffeeBestBrew } from '../../../lib/stats.js'
import { deleteCoffee, deleteBrewLog, toggleWouldBuyAgain } from '../../../lib/actions.js'
import { SCORE_FIELDS } from '../../../lib/constants.js'

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
  const best = coffeeBestBrew(coffee)

  const info = [
    ['Обсмажчик', coffee.roaster?.name],
    ['Країна', coffee.originCountry],
    ['Регіон', coffee.region],
    ['Ферма', coffee.farm],
    ['Виробник', coffee.producer],
    ['Сорт', coffee.variety],
    ['Обробка', coffee.process],
    ['Обсмаження', coffee.roastLevel],
    ['Дата обсмаження', fmtDate(coffee.roastDate)],
    ['Дата купівлі', fmtDate(coffee.purchaseDate)],
    ['Ціна', coffee.price != null ? `${coffee.price} ₴ / ${coffee.weightGrams ?? '?'} г` : null],
    ['Ціна / 100г', coffee.pricePer100g != null ? `${coffee.pricePer100g} ₴` : null],
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
          {coffee.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coffee.imageUrl} alt={coffee.name}
              style={{ width: '100%', borderRadius: 10, marginBottom: 12 }} />
          )}
          <dl className="detail-grid">
            {info.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt><dd>{v}</dd>
              </Fragment>
            ))}
          </dl>
          {coffee.declaredNotes && (
            <p className="notes"><strong>Заявлені ноти:</strong> {coffee.declaredNotes}</p>
          )}
          {coffee.userNotes && (
            <p className="notes"><strong>Мої нотатки:</strong> {coffee.userNotes}</p>
          )}
          {coffee.productUrl && (
            <p><a href={coffee.productUrl} target="_blank" rel="noreferrer">Сторінка товару ↗</a></p>
          )}

          <form action={toggleWouldBuyAgain} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={coffee.id} />
            <input type="hidden" name="value" value={coffee.wouldBuyAgain ? 'false' : 'true'} />
            <button className={`btn btn--sm ${coffee.wouldBuyAgain ? 'btn--secondary' : 'btn--primary'}`}>
              {coffee.wouldBuyAgain ? '✓ Купив би ще раз' : 'Позначити «купив би ще раз»'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Найкращий рецепт</h2>
          {best ? (
            <div>
              <p style={{ margin: '0 0 8px' }}>
                <strong>{best.method}</strong>
                {best.recipeName ? ` · ${best.recipeName}` : ''} — <strong>{best.overallScore}/10</strong>
              </p>
              <div>
                {best.doseGrams && <span className="chip">{best.doseGrams} г кави</span>}
                {best.waterGrams && <span className="chip">{best.waterGrams} г води</span>}
                {best.ratio && <span className="chip">{best.ratio}</span>}
                {best.grindSize && <span className="chip">помел: {best.grindSize}</span>}
                {best.waterTempC && <span className="chip">{best.waterTempC}°C</span>}
                {best.brewTimeSeconds && <span className="chip">{best.brewTimeSeconds} с</span>}
              </div>
              {best.perceivedNotes && <p className="notes" style={{ marginTop: 8 }}>{best.perceivedNotes}</p>}
            </div>
          ) : (
            <p className="empty" style={{ padding: '12px 0' }}>Ще немає оцінених заварювань</p>
          )}
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0 }}>Заварювання ({coffee.brewLogs.length})</h2>
        <div className="spacer" />
        <Link href={`/brew-logs/new?coffee=${coffee.id}`} className="btn btn--primary btn--sm">
          + Додати заварювання
        </Link>
      </div>

      {coffee.brewLogs.length === 0 ? (
        <p className="empty">Ще немає заварювань для цієї кави.</p>
      ) : (
        <div>
          {coffee.brewLogs.map((b) => (
            <div key={b.id} className="brew-item">
              <div className="head">
                <div>
                  <strong>{b.method}</strong>
                  {b.recipeName ? ` · ${b.recipeName}` : ''}
                  <span className="cnt" style={{ color: 'var(--muted)', marginLeft: 8 }}>
                    {fmtDate(b.brewedAt)}
                  </span>
                </div>
                <strong style={{ color: 'var(--accent)' }}>
                  {b.overallScore != null ? `${b.overallScore}/10` : '—'}
                </strong>
              </div>
              <div style={{ margin: '4px 0' }}>
                {b.doseGrams && <span className="chip">{b.doseGrams}г</span>}
                {b.waterGrams && <span className="chip">{b.waterGrams}г H₂O</span>}
                {b.ratio && <span className="chip">{b.ratio}</span>}
                {b.grinder && <span className="chip">{b.grinder}</span>}
                {b.waterTempC && <span className="chip">{b.waterTempC}°C</span>}
                {b.brewTimeSeconds && <span className="chip">{b.brewTimeSeconds}с</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {SCORE_FIELDS.filter((f) => f.key !== 'overallScore' && b[f.key] != null)
                  .map((f) => `${f.label} ${b[f.key]}`).join(' · ')}
              </div>
              {b.perceivedNotes && <p className="notes" style={{ margin: '4px 0' }}>{b.perceivedNotes}</p>}
              {b.defects && <p className="notes" style={{ margin: '4px 0', color: 'var(--bad)' }}>Дефекти: {b.defects}</p>}
              <form action={deleteBrewLog}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="coffeeId" value={coffee.id} />
                <button className="btn btn--ghost btn--sm">Видалити заварювання</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={deleteCoffee} style={{ marginTop: 32 }}>
        <input type="hidden" name="id" value={coffee.id} />
        <button className="btn btn--ghost">Видалити каву</button>
      </form>
    </div>
  )
}
