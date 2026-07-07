import Link from 'next/link'
import { prisma } from '../../../lib/prisma.js'
import { createCoffee } from '../../../lib/actions.js'
import {
  ORIGIN_COUNTRIES, VARIETIES, ROAST_LEVELS,
} from '../../../lib/constants.js'

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
            <label>Ферма</label>
            <input name="farm" />
          </div>
          <div className="field">
            <label>Виробник</label>
            <input name="producer" />
          </div>
          <div className="field">
            <label>Обробка</label>
            <input name="process" list="processes" placeholder="washed" />
            <Datalist id="processes" options={processes.map((p) => p.name)} />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label>Рівень обсмаження</label>
            <input name="roastLevel" list="roasts" placeholder="light" />
            <Datalist id="roasts" options={ROAST_LEVELS} />
          </div>
          <div className="field">
            <label>Дата обсмаження</label>
            <input type="date" name="roastDate" />
          </div>
          <div className="field">
            <label>Дата купівлі</label>
            <input type="date" name="purchaseDate" />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label>Ціна (₴)</label>
            <input type="number" step="0.01" name="price" placeholder="420" />
          </div>
          <div className="field">
            <label>Вага (г)</label>
            <input type="number" name="weightGrams" placeholder="250" />
          </div>
          <div className="field">
            <label>Ціна / 100г</label>
            <input disabled placeholder="рахується автоматично" />
          </div>
        </div>

        <div className="field">
          <label>Заявлені ноти (від обсмажчика)</label>
          <input name="declaredNotes" placeholder="jasmine, bergamot, lemon" />
        </div>
        <div className="field">
          <label>Власні нотатки</label>
          <textarea name="userNotes" rows={2} />
        </div>

        <div className="row">
          <div className="field">
            <label>Посилання на товар</label>
            <input name="productUrl" type="url" placeholder="https://…" />
          </div>
          <div className="field">
            <label>Фото пакету (URL)</label>
            <input name="imageUrl" type="url" placeholder="https://…" />
          </div>
        </div>

        <div className="row">
          <label className="field checkbox">
            <input type="checkbox" name="isFinished" value="true" /> Вже завершена
          </label>
          <label className="field checkbox">
            <input type="checkbox" name="wouldBuyAgain" value="true" /> Купив би ще раз
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти каву</button>
          <Link href="/coffees" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
