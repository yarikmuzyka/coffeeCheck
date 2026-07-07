import Link from 'next/link'
import { ORIGIN_COUNTRIES, VARIETIES } from '../../lib/constants.js'

function Datalist({ id, options }) {
  return <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
}

function toDateInput(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

export function CoffeeForm({ action, roasters, processes, coffee, submitLabel, cancelHref }) {
  return (
    <form action={action} className="stack card">
      {coffee && <input type="hidden" name="id" value={coffee.id} />}
      <div className="row">
        <div className="field">
          <label>Назва *</label>
          <input name="name" required defaultValue={coffee?.name ?? ''} placeholder="Ethiopia Yirgacheffe Konga" />
        </div>
        <div className="field">
          <label>Обсмажчик *</label>
          <select name="roasterId" required defaultValue={coffee?.roasterId ?? ''}>
            <option value="" disabled>оберіть…</option>
            {roasters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label>Країна</label>
          <input name="originCountry" list="countries" defaultValue={coffee?.originCountry ?? ''} placeholder="Ethiopia" />
          <Datalist id="countries" options={ORIGIN_COUNTRIES} />
        </div>
        <div className="field">
          <label>Регіон</label>
          <input name="region" defaultValue={coffee?.region ?? ''} placeholder="Yirgacheffe" />
        </div>
        <div className="field">
          <label>Сорт</label>
          <input name="variety" list="varieties" defaultValue={coffee?.variety ?? ''} placeholder="Heirloom" />
          <Datalist id="varieties" options={VARIETIES} />
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label>Обробка</label>
          <input name="process" list="processes" defaultValue={coffee?.process ?? ''} placeholder="washed" />
          <Datalist id="processes" options={processes.map((p) => p.name)} />
        </div>
        <div className="field">
          <label>Дата купівлі</label>
          <input type="date" name="purchaseDate" defaultValue={toDateInput(coffee?.purchaseDate)} />
        </div>
        <div className="field">
          <label>Ціна (₴)</label>
          <input type="number" step="0.01" name="price" defaultValue={coffee?.price ?? ''} placeholder="420" />
        </div>
      </div>

      <div className="row" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Моя оцінка (з 10)</label>
          <input type="number" step="0.5" min="0" max="10" name="myScore" defaultValue={coffee?.myScore ?? ''} placeholder="8.5" />
        </div>
        <div className="field">
          <label>Оцінка SCA</label>
          <input type="number" step="0.25" min="0" max="100" name="scaScore" defaultValue={coffee?.scaScore ?? ''} placeholder="86.5" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn--primary" type="submit">{submitLabel}</button>
        <Link href={cancelHref} className="btn btn--ghost">Скасувати</Link>
      </div>
    </form>
  )
}
