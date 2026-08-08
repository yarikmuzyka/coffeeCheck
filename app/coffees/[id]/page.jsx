import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma.js'
import { coffeeScore } from '../../../lib/stats.js'
import { deleteCoffee, toggleCoffeeFinished, toggleWouldBuyAgain } from '../../../lib/actions.js'
import { ConfirmSubmitButton } from '../../components/ConfirmSubmitButton.jsx'
import { requireUser } from '../../../lib/auth.js'
import { findOwnedCoffee } from '../../../lib/owned-coffees.js'
import { getUsageSnapshot } from '../../../lib/entitlements.js'

export const dynamic = 'force-dynamic'

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('uk') : '—'
}

export default async function CoffeeDetailPage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const [coffee, usage] = await Promise.all([
    findOwnedCoffee(prisma, {
      id,
      userId: user.id,
      include: {
        roaster: true,
        brewLogs: { where: { userId: user.id }, orderBy: { brewedAt: 'desc' } },
      },
    }),
    getUsageSnapshot(prisma, user.id),
  ])
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
    <div className="coffee-detail-page">
      <Link href="/coffees" className="coffee-detail-back">← Усі кави</Link>

      <header className="coffee-detail-header">
        <div className="coffee-detail-title">
          <h1>{coffee.name}</h1>
          <p className="sub">{coffee.roaster?.name}</p>
        </div>
        <div className="coffee-detail-head-actions">
          <div className="coffee-detail-action-stack">
            <Link href={`/coffees/${coffee.id}/edit`} className="btn btn--secondary btn--sm">
              <span aria-hidden="true">✎</span> Редагувати
            </Link>
            <form action={deleteCoffee}>
              <input type="hidden" name="id" value={coffee.id} />
              <ConfirmSubmitButton
                className="btn btn--danger-outline btn--sm"
                dialogTitle="Видалити цю каву?"
                message="Разом із кавою буде видалено всі пов’язані заварювання. Цю дію неможливо скасувати."
                confirmLabel="Так, видалити"
              >
                <span aria-hidden="true">×</span> Видалити
              </ConfirmSubmitButton>
            </form>
          </div>
          <div className="score-pill score-pill--detail">
            {score != null ? score.toFixed(1) : '—'}<br /><small>моя оцінка /10</small>
          </div>
        </div>
      </header>

      <div className="coffee-detail-layout">
        <div className="card">
          <h2 className="coffee-detail-section-title">Інформація</h2>
          <dl className="detail-grid">
            {info.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt><dd>{v}</dd>
              </Fragment>
            ))}
          </dl>

          <div className="coffee-detail-state-actions">
            <form action={toggleWouldBuyAgain}>
              <input type="hidden" name="id" value={coffee.id} />
              <input type="hidden" name="value" value={coffee.wouldBuyAgain ? 'false' : 'true'} />
              <button className={`btn btn--sm ${coffee.wouldBuyAgain ? 'btn--secondary' : 'btn--primary'}`}>
                {coffee.wouldBuyAgain ? '✓ Купив би ще раз' : 'Позначити «купив би ще раз»'}
              </button>
            </form>
            <form action={toggleCoffeeFinished}>
              <input type="hidden" name="id" value={coffee.id} />
              <input type="hidden" name="value" value={coffee.isFinished ? 'false' : 'true'} />
              <button className={`btn btn--sm ${coffee.isFinished ? 'btn--secondary' : 'btn--ghost'}`}>
                {coffee.isFinished ? '✓ Пачка завершена — повернути в активні' : 'Позначити пачку завершеною'}
              </button>
            </form>
          </div>
        </div>

        <section className="coffee-detail-journal">
          <div className="coffee-detail-journal-head">
            <div>
              <h2>Журнал заварювань</h2>
              <p className="sub">{coffee.brewLogs.length} записів</p>
            </div>
            <div className="spacer" />
            {usage.resources.brewLogs.reached ? (
              <span className="btn btn--disabled" aria-disabled="true">Ліміт заварювань вичерпано</span>
            ) : (
              <Link href={`/brew-logs/new?coffee=${coffee.id}`} className="btn btn--primary">
                + Додати заварювання
              </Link>
            )}
          </div>

          {coffee.brewLogs.length === 0 ? (
            <div className="coffee-detail-empty">
              <span aria-hidden="true">◇</span>
              <p>Ще немає заварювань для цієї кави.</p>
            </div>
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
        </section>
      </div>
    </div>
  )
}
