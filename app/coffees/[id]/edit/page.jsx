import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma.js'
import { updateCoffee } from '../../../../lib/actions.js'
import { CoffeeForm } from '../../CoffeeForm.jsx'
import { requireUser } from '../../../../lib/auth.js'
import { findOwnedCoffee } from '../../../../lib/owned-coffees.js'
import { COFFEE_PROCESSES_INCLUDE, coffeeProcessIds, sameProcessName } from '../../../../lib/coffee-processes.js'

export const dynamic = 'force-dynamic'

export default async function EditCoffeePage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const [coffee, roasters, processes] = await Promise.all([
    findOwnedCoffee(prisma, { id, userId: user.id, include: COFFEE_PROCESSES_INCLUDE }),
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
  ])
  if (!coffee) notFound()

  // Кава до міграції має лише текстову назву — підбираємо її в каталозі.
  const linkedIds = coffeeProcessIds(coffee)
  const legacyMatch = linkedIds.length === 0 && coffee.process
    ? processes.find((process) => sameProcessName(process.name, coffee.process))
    : null
  const selectedProcessIds = legacyMatch ? [legacyMatch.id] : linkedIds

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
        selectedProcessIds={selectedProcessIds}
        coffee={coffee}
        submitLabel="Зберегти зміни"
        cancelHref={`/coffees/${coffee.id}`}
      />
    </div>
  )
}
