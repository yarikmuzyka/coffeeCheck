import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma.js'
import { updateCoffee } from '../../../../lib/actions.js'
import { CoffeeForm } from '../../CoffeeForm.jsx'
import { requireUser } from '../../../../lib/auth.js'

export const dynamic = 'force-dynamic'

export default async function EditCoffeePage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const [coffee, roasters, processes] = await Promise.all([
    prisma.coffee.findFirst({ where: { id, userId: user.id } }),
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
  ])
  if (!coffee) notFound()

  return (
    <div>
      <div className="page-head">
        <h1>Редагувати каву</h1>
        <p className="sub">{coffee.name}</p>
      </div>

      <CoffeeForm
        action={updateCoffee}
        roasters={roasters}
        processes={processes}
        coffee={coffee}
        submitLabel="Зберегти зміни"
        cancelHref={`/coffees/${coffee.id}`}
      />
    </div>
  )
}
