import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma.js'
import { updateProcess } from '../../../../lib/actions.js'
import { requireUser } from '../../../../lib/auth.js'

export const dynamic = 'force-dynamic'

export default async function EditProcessPage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const process = await prisma.process.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { coffees: true } } },
  })
  if (!process) notFound()

  return (
    <div>
      <div className="page-head">
        <h1>Редагувати обробку</h1>
        <p className="sub">
          {process._count.coffees > 0
            ? `Нова назва зʼявиться в усіх кавах з цією обробкою (${process._count.coffees})`
            : 'Ця обробка ще не використовується в кавах'}
        </p>
      </div>

      <form action={updateProcess} className="stack card">
        <input type="hidden" name="id" value={process.id} />
        <div className="field">
          <label>Назва *</label>
          <input name="name" required defaultValue={process.name} placeholder="washed / natural / anaerobic…" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти</button>
          <Link href="/roasters" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
