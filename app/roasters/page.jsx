import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { deleteRoaster, deleteProcess } from '../../lib/actions.js'
import { ConfirmSubmitButton } from '../components/ConfirmSubmitButton.jsx'
import { requireUser } from '../../lib/auth.js'

export const dynamic = 'force-dynamic'

export default async function RoastersPage() {
  const user = await requireUser()
  const [roasters, processes] = await Promise.all([
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Обсмажчики</h1>
          <p className="sub">{roasters.length} шт</p>
        </div>
        <div className="spacer" />
        <Link href="/processes/new" className="btn btn--secondary">+ Додати обробку кави</Link>
        <Link href="/roasters/new" className="btn btn--primary">+ Додати обсмажчика</Link>
      </div>

      {roasters.length === 0 ? (
        <p className="empty">Ще немає обсмажчиків.</p>
      ) : (
        <div className="coffee-list">
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

      <h2>Обробки кави</h2>
      {processes.length === 0 ? (
        <p className="empty" style={{ padding: '24px 0' }}>Ще немає обробок.</p>
      ) : (
        <div className="coffee-list">
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
    </div>
  )
}
