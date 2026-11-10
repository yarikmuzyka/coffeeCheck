import Link from 'next/link'
import { prisma } from '../../lib/prisma.js'
import { deleteRoaster, deleteProcess } from '../../lib/actions.js'
import { ConfirmSubmitButton } from '../components/ConfirmSubmitButton.jsx'
import { requireUser } from '../../lib/auth.js'
import { getUsageSnapshot } from '../../lib/entitlements.js'
import { pluralizeUk } from '../../lib/format.js'
import { normalizeCatalogSort, sortCatalog } from '../../lib/catalog-sort.js'

export const dynamic = 'force-dynamic'

function catalogHref(sorts) {
  const params = new URLSearchParams()
  if (sorts.roasters !== 'name') params.set('roasters', sorts.roasters)
  if (sorts.processes !== 'name') params.set('processes', sorts.processes)
  const search = params.toString()
  return search ? `/roasters?${search}` : '/roasters'
}

function SortToggle({ list, sorts, label }) {
  const options = [['name', 'А–Я', 'За назвою'], ['count', 'Кількість', 'За кількістю кав']]
  return (
    <nav className="catalog-sort" aria-label={label}>
      {options.map(([value, text, title]) => {
        const active = sorts[list] === value
        return (
          <Link
            key={value}
            href={catalogHref({ ...sorts, [list]: value })}
            className={active ? 'catalog-sort__active' : undefined}
            aria-current={active ? 'true' : undefined}
            title={title}
            scroll={false}
          >
            {text}
          </Link>
        )
      })}
    </nav>
  )
}

function CoffeeCount({ count }) {
  if (count === 0) return <span className="catalog-count catalog-count--empty" title="Ще не використовується">—</span>
  return <span className="catalog-count">{count} {pluralizeUk(count, ['кава', 'кави', 'кав'])}</span>
}

export default async function RoastersPage({ searchParams }) {
  const user = await requireUser()
  const params = await searchParams
  const sorts = {
    roasters: normalizeCatalogSort(params?.roasters),
    processes: normalizeCatalogSort(params?.processes),
  }
  const [roasterRows, processRows, usage] = await Promise.all([
    prisma.roaster.findMany({
      where: { userId: user.id },
      include: { _count: { select: { coffees: true } } },
    }),
    prisma.process.findMany({
      where: { userId: user.id },
      include: { _count: { select: { coffees: true } } },
    }),
    getUsageSnapshot(prisma, user.id),
  ])
  const roasters = sortCatalog(roasterRows, sorts.roasters)
  const processes = sortCatalog(processRows, sorts.processes)

  return (
    <div className="catalog-page">
      <div className="page-head">
        <h1>Обсмажчики та обробки</h1>
        <p className="sub">Каталоги, з яких обираєш у формі кави</p>
      </div>

      <div className="catalog-grid">
        <section className="catalog-section" aria-labelledby="catalog-roasters">
          <div className="catalog-section-head">
            <h2 id="catalog-roasters">Обсмажчики</h2>
            <span className="catalog-total">{roasters.length}</span>
            <SortToggle list="roasters" sorts={sorts} label="Сортування обсмажувачів" />
            {usage.resources.roasters.reached ? (
              <span className="btn btn--sm btn--disabled" aria-disabled="true">Ліміт вичерпано</span>
            ) : (
              <Link href="/roasters/new" className="btn btn--primary btn--sm">+ Додати</Link>
            )}
          </div>

          {roasters.length === 0 ? (
            <p className="empty catalog-empty">Ще немає обсмажчиків.</p>
          ) : (
            <ul className="catalog-list">
              {roasters.map((r) => (
                <li key={r.id} className="catalog-row">
                  <span className="catalog-row__name">
                    {r.name}
                    {(r.city || r.country) && <small>{r.city || r.country}</small>}
                  </span>
                  <CoffeeCount count={r._count.coffees} />
                  <form action={deleteRoaster}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmitButton
                      className="catalog-icon"
                      title="Видалити (разом з кавами)"
                      message={`Видалити «${r.name}» разом з усіма його кавами та заварюваннями?`}
                    >
                      <span aria-hidden="true">✕</span>
                      <span className="sr-only">Видалити {r.name}</span>
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="catalog-section" aria-labelledby="catalog-processes">
          <div className="catalog-section-head">
            <h2 id="catalog-processes">Обробки</h2>
            <span className="catalog-total">{processes.length}</span>
            <SortToggle list="processes" sorts={sorts} label="Сортування обробок" />
            <Link href="/processes/new" className="btn btn--secondary btn--sm">+ Додати</Link>
          </div>

          {processes.length === 0 ? (
            <p className="empty catalog-empty">Ще немає обробок.</p>
          ) : (
            <ul className="catalog-list">
              {processes.map((p) => (
                <li key={p.id} className="catalog-row">
                  <span className="catalog-row__name">{p.name}</span>
                  <CoffeeCount count={p._count.coffees} />
                  <Link href={`/processes/${p.id}/edit`} className="catalog-icon" title="Перейменувати">
                    <span aria-hidden="true">✎</span>
                    <span className="sr-only">Перейменувати {p.name}</span>
                  </Link>
                  <form action={deleteProcess}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton
                      className="catalog-icon"
                      title="Видалити"
                      message={`Видалити обробку «${p.name}»?`}
                    >
                      <span aria-hidden="true">✕</span>
                      <span className="sr-only">Видалити {p.name}</span>
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
