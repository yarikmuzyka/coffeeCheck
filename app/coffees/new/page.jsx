import Link from 'next/link'
import { prisma } from '../../../lib/prisma.js'
import { createCoffee } from '../../../lib/actions.js'
import { ORIGIN_COUNTRIES, VARIETIES } from '../../../lib/constants.js'

export const dynamic = 'force-dynamic'

function Datalist({ id, options }) {
  return <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
}

export default async function NewCoffeePage() {
  const [roasters, processes] = await Promise.all([
    prisma.roaster.findMany({ orderBy: { name: 'asc' } }),
    prisma.process.findMany({ orderBy: { name: 'asc' } }),
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

      <form action={createCoffee} className="stack card">
        <div className="row">
          <div className="field">
            <label>Назва *</label>
            <input name="name" required placeholder="Ethiopia Yirgacheffe Konga" />
          </div>
          <div className="field">
            <label>Обсмажчик *</label>
            <select name="roasterId" required defaultValue="">
              <option value="" disabled>оберіть…</option>
              {roasters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label>Країна</label>
            <input name="originCountry" list="countries" placeholder="Ethiopia" />
            <Datalist id="countries" options={ORIGIN_COUNTRIES} />
          </div>
          <div className="field">
            <label>Регіон</label>
            <input name="region" placeholder="Yirgacheffe" />
          </div>
          <div className="field">
            <label>Сорт</label>
            <input name="variety" list="varieties" placeholder="Heirloom" />
            <Datalist id="varieties" options={VARIETIES} />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label>Обробка</label>
            <input name="process" list="processes" placeholder="washed" />
            <Datalist id="processes" options={processes.map((p) => p.name)} />
          </div>
          <div className="field">
            <label>Дата купівлі</label>
            <input type="date" name="purchaseDate" />
          </div>
          <div className="field">
            <label>Ціна (₴)</label>
            <input type="number" step="0.01" name="price" placeholder="420" />
          </div>
        </div>

        <div className="field" style={{ maxWidth: 200 }}>
          <label>Оцінка SCA</label>
          <input type="number" step="0.25" min="0" max="100" name="scaScore" placeholder="86.5" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти каву</button>
          <Link href="/coffees" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
