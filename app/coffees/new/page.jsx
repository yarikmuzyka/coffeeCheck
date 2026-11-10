import Link from 'next/link'
import { prisma } from '../../../lib/prisma.js'
import { createCoffee } from '../../../lib/actions.js'
import { CoffeeForm } from '../CoffeeForm.jsx'
import { requireUser } from '../../../lib/auth.js'
import { getUsageSnapshot } from '../../../lib/entitlements.js'
import { LimitReached } from '../../components/UsagePanel.jsx'
import { matchLotProcesses } from '../../../lib/coffee-processes.js'

export const dynamic = 'force-dynamic'

export default async function NewCoffeePage({ searchParams }) {
  const user = await requireUser()
  const params = await searchParams
  const sourceLotId = (params?.lot ?? '').toString().trim()
  const [roasters, processes, usage, wishedLot] = await Promise.all([
    prisma.roaster.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.process.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    getUsageSnapshot(prisma, user.id),
    sourceLotId
      ? prisma.wishedLot.findUnique({
        where: { userId_lotId: { userId: user.id, lotId: sourceLotId } },
        include: { lot: true },
      })
      : null,
  ])

  if (usage.resources.coffees.reached) {
    return <LimitReached resourceLabel="Кави" state={usage.resources.coffees} backHref="/coffees" />
  }

  const sourceLot = wishedLot?.lot ?? null
  const sourceRoaster = sourceLot
    ? roasters.find((roaster) => roaster.name.localeCompare(sourceLot.roasterName, 'uk', { sensitivity: 'accent' }) === 0)
    : null
  const lotProcesses = matchLotProcesses(sourceLot?.processNames ?? [], processes)
  const formRoasters = sourceLot && !sourceRoaster
    ? [...roasters, { id: `external:${sourceLot.id}`, name: `${sourceLot.roasterName} (буде додано)` }]
    : roasters
  const coffeeDraft = sourceLot ? {
    name: sourceLot.name,
    roasterId: sourceRoaster?.id ?? `external:${sourceLot.id}`,
    originCountry: sourceLot.originCountry,
    region: sourceLot.region,
    price: sourceLot.price,
  } : null

  return (
    <div>
      <div className="page-head">
        <h1>Нова кава</h1>
        <p className="sub">{sourceLot ? `Дані збереженого лота «${sourceLot.name}» уже підставлено` : 'Додай пакет, який купив'}</p>
      </div>

      {roasters.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          Спершу <Link href="/roasters/new">додай обсмажчика →</Link>
        </div>
      )}

      <CoffeeForm
        action={createCoffee}
        roasters={formRoasters}
        processes={processes}
        selectedProcessIds={lotProcesses.selectedIds}
        newProcessNames={lotProcesses.missingNames}
        coffee={coffeeDraft}
        sourceLotId={sourceLot?.id}
        submitLabel="Зберегти каву"
        cancelHref={sourceLot ? '/new-lots?tab=wish' : '/coffees'}
      />
    </div>
  )
}
