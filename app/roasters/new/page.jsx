import Link from 'next/link'
import { createRoaster } from '../../../lib/actions.js'
import { prisma } from '../../../lib/prisma.js'
import { requireUser } from '../../../lib/auth.js'
import { getUsageSnapshot } from '../../../lib/entitlements.js'
import { LimitReached } from '../../components/UsagePanel.jsx'

export const dynamic = 'force-dynamic'

export default async function NewRoasterPage() {
  const user = await requireUser()
  const usage = await getUsageSnapshot(prisma, user.id)
  if (usage.resources.roasters.reached) {
    return <LimitReached resourceLabel="Обсмажчики" state={usage.resources.roasters} backHref="/roasters" />
  }

  return (
    <div>
      <div className="page-head">
        <h1>Новий обсмажчик</h1>
        <p className="sub">Хто смажив цю каву</p>
      </div>

      <form action={createRoaster} className="stack card">
        <div className="field">
          <label>Назва *</label>
          <input name="name" required placeholder="Foundation Coffee Roasters" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти</button>
          <Link href="/roasters" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
