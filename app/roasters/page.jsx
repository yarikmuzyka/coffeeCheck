import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { deleteRoaster, deleteProcess } from '../../lib/actions.js'
import { ConfirmSubmitButton } from '../components/ConfirmSubmitButton.jsx'
import { requireUser } from '../../lib/auth.js'
import { getUsageSnapshot } from '../../lib/entitlements.js'

export const dynamic = 'force-dynamic'

export default async function RoastersPage() {
  const user = await requireUser()
  const [roasters, processes, usage] = await Promise.all([
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    getUsageSnapshot(prisma, user.id),
  ])

  return (
    <div className="catalog-page">
      <div className="page-head">
        <h1>Обсмажчики</h1>
      </div>

      <div className="catalog-grid">
        <section className="catalog-section">
          <div className="catalog-section-head">
            <div className="catalog-title">
              <h2>Обсмажчики</h2>
              <span>{roasters.length} шт</span>
            </div>
            {usage.resources.roasters.reached ? (
              <span className="btn btn--disabled" aria-disabled="true">Ліміт вичерпано</span>
            ) : (
              <Link href="/roasters/new" className="btn btn--primary">+ Додати обсмажчика</Link>
            )}
          </div>

          {roasters.length === 0 ? (
            <p className="empty catalog-empty">Ще немає обсмажчиків.</p>
          ) : (
            <div className="coffee-list catalog-list">
              {roasters.map((r) => (
                <div key={r.id} className="card coffee-row">
                  <h3>{r.name}</h3>
                  <form action={deleteRoaster}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmitButton
                      className="btn btn--ghost btn--sm"
                      title="Видалити (разом з кавами)"
                      message={`Видалити «${r.name}» разом з усіма його кавами та заварюваннями?`}
                    >
                      ✕
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="catalog-section">
          <div className="catalog-section-head">
            <div className="catalog-title">
              <h2>Обробки кави</h2>
              <span>{processes.length} шт</span>
            </div>
            <Link href="/processes/new" className="btn btn--secondary">+ Додати обробку кави</Link>
          </div>

          {processes.length === 0 ? (
            <p className="empty catalog-empty">Ще немає обробок.</p>
          ) : (
            <div className="coffee-list catalog-list">
              {processes.map((p) => (
                <div key={p.id} className="card coffee-row">
                  <h3>{p.name}</h3>
                  <form action={deleteProcess}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton
                      className="btn btn--ghost btn--sm"
                      title="Видалити"
                      message={`Видалити обробку «${p.name}»?`}
                    >
                      ✕
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
