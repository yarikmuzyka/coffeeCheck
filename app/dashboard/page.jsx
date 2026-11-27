import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { requireUser } from '../../lib/auth.js'
import { coffeeScore } from '../../lib/stats.js'
import { getRequestUsage } from '../../lib/request-usage.js'

export const dynamic = 'force-dynamic'

const date = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'Europe/Kyiv' })
const month = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' })
const rating = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default async function DashboardPage() {
  const user = await requireUser()
  const [coffees, usage] = await Promise.all([
    prisma.coffee.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        roaster: true,
        brewLogs: {
          where: { userId: user.id, notes: { not: null } },
          orderBy: { brewedAt: 'desc' },
          take: 1,
          select: { notes: true },
        },
      },
    }),
    getRequestUsage(user.id),
  ])

  const groups = new Map()
  for (const coffee of coffees) {
    const key = month.format(coffee.createdAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(coffee)
  }

  return (
    <div className="coffee-diary">
      <div className="toolbar">
        <div><h1>Щоденник</h1><p className="sub">Мої кави й враження</p></div>
        <div className="spacer" />
        {usage.resources.coffees.reached
          ? <span className="btn btn--disabled" aria-disabled="true">Ліміт кав вичерпано</span>
          : <Link href="/coffees/new" className="btn btn--primary">+ Записати каву</Link>}
      </div>
      {coffees.length === 0 && <p className="empty">Записів поки немає.</p>}
      {[...groups].map(([label, entries]) => (
        <section className="diary-month" key={label}>
          <h2>{label}</h2>
          <ul>
            {entries.map((coffee) => {
              const score = coffeeScore(coffee)
              const initials = coffee.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
              const note = coffee.brewLogs[0]?.notes?.trim()
              return (
                <li key={coffee.id}>
                  <Link className="card diary-row" href={`/coffees/${coffee.id}`}>
                    <span className="diary-mark" aria-hidden="true">{initials}</span>
                    <div>
                      <h3>{coffee.name}</h3>
                      <p className="meta">{[coffee.roaster?.name, date.format(coffee.createdAt)].filter(Boolean).join(' · ')}</p>
                      {note && <p className="diary-note">{note}</p>}
                    </div>
                    <span className={score == null ? 'diary-unrated' : 'diary-rating'}>
                      {score == null ? 'Без оцінки' : `${rating.format(score)} / 5`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
