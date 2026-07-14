import Link from 'next/link'
import { prisma } from '../../../lib/prisma.js'
import { createCoffee } from '../../../lib/actions.js'
import { CoffeeForm } from '../CoffeeForm.jsx'
import { requireUser } from '../../../lib/auth.js'

export const dynamic = 'force-dynamic'

export default async function NewCoffeePage() {
  const user = await requireUser()
  const [roasters, processes] = await Promise.all([
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <div className="page-head">
        <h1>Нова кава</h1>
        <p className="sub">Додай пакет, який купив</p>
      </div>

      {roasters.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          Спершу <Link href="/roasters/new">додай обсмажчика →</Link>
        </div>
      )}

      <CoffeeForm
        action={createCoffee}
        roasters={roasters}
        processes={processes}
        submitLabel="Зберегти каву"
        cancelHref="/coffees"
      />
    </div>
  )
}
