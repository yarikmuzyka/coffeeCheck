import Link from 'next/link'
import { ORIGIN_COUNTRIES, VARIETIES } from '../../lib/constants.js'
import { NEW_PROCESS_PREFIX } from '../../lib/coffee-processes.js'

function Datalist({ id, options }) {
  return <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
}

function toDateInput(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

function ProcessPicker({ processes, selectedIds, newProcessNames }) {
  const selected = new Set(selectedIds)
  return (
    <fieldset className="coffee-form__section process-picker">
      <legend className="coffee-form__title">
        Обробка * <small>можна обрати кілька</small>
      </legend>
      <div className="process-picker__options">
        {processes.map((p) => (
          <label key={p.id} className="process-option">
            <input type="checkbox" name="processIds" value={p.id} defaultChecked={selected.has(p.id)} />
            <span>{p.name}</span>
          </label>
        ))}
        {newProcessNames.map((name) => (
          <label key={`new-${name}`} className="process-option process-option--new">
            <input type="checkbox" name="processIds" value={`${NEW_PROCESS_PREFIX}${name}`} defaultChecked />
            <span>{name} <small>буде додано</small></span>
          </label>
        ))}
        <details className="process-add">
          <summary>+ нова</summary>
          <input
            name="newProcessName"
            maxLength={60}
            placeholder="Назва обробки"
            aria-label="Нова обробка"
          />
        </details>
      </div>
    </fieldset>
  )
}

export function CoffeeForm({
  action,
  roasters,
  processes,
  selectedProcessIds = [],
  newProcessNames = [],
  coffee,
  sourceLotId,
  submitLabel,
  cancelHref,
}) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={action} className="card coffee-form">
      {coffee?.id && <input type="hidden" name="id" value={coffee.id} />}
      {sourceLotId && <input type="hidden" name="sourceLotId" value={sourceLotId} />}

      <section className="coffee-form__section" aria-labelledby="coffee-form-about">
        <h2 id="coffee-form-about" className="coffee-form__title">Про каву</h2>
        <div className="coffee-form__grid coffee-form__grid--main">
          <div className="field">
            <label htmlFor="coffee-name">Назва *</label>
            <input id="coffee-name" name="name" required defaultValue={coffee?.name ?? ''} placeholder="Ethiopia Yirgacheffe Konga" />
          </div>
          <div className="field">
            <label htmlFor="coffee-roaster">Обсмажчик *</label>
            <select id="coffee-roaster" name="roasterId" required defaultValue={coffee?.roasterId ?? ''}>
              <option value="" disabled>оберіть…</option>
              {roasters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div className="coffee-form__grid coffee-form__grid--origin">
          <div className="field">
            <label htmlFor="coffee-country">Країна</label>
            <input id="coffee-country" name="originCountry" list="countries" defaultValue={coffee?.originCountry ?? ''} placeholder="Ethiopia" />
            <Datalist id="countries" options={ORIGIN_COUNTRIES} />
          </div>
          <div className="field">
            <label htmlFor="coffee-region">Регіон</label>
            <input id="coffee-region" name="region" defaultValue={coffee?.region ?? ''} placeholder="Yirgacheffe" />
          </div>
          <div className="field">
            <label htmlFor="coffee-variety">Сорт</label>
            <input id="coffee-variety" name="variety" list="varieties" defaultValue={coffee?.variety ?? ''} placeholder="Heirloom" />
            <Datalist id="varieties" options={VARIETIES} />
          </div>
        </div>
      </section>

      <ProcessPicker processes={processes} selectedIds={selectedProcessIds} newProcessNames={newProcessNames} />

      <section className="coffee-form__section" aria-labelledby="coffee-form-purchase">
        <h2 id="coffee-form-purchase" className="coffee-form__title">Покупка й оцінка</h2>
        <div className="coffee-form__grid coffee-form__grid--purchase">
          <div className="field">
            <label htmlFor="coffee-date">Дата купівлі</label>
            <input id="coffee-date" type="date" name="purchaseDate" max={today} defaultValue={toDateInput(coffee?.purchaseDate)} />
          </div>
          <div className="field">
            <label htmlFor="coffee-price">Ціна</label>
            <span className="input-suffix" data-suffix="₴">
              <input id="coffee-price" type="number" inputMode="decimal" step="0.01" min="0" max="1000000" name="price" defaultValue={coffee?.price ?? ''} placeholder="420" />
            </span>
          </div>
          <div className="field">
            <label htmlFor="coffee-score">Моя оцінка</label>
            <span className="input-suffix" data-suffix="/5">
              <input id="coffee-score" type="number" inputMode="decimal" step="0.5" min="1" max="5" name="myScore" defaultValue={coffee?.myScore ?? ''} placeholder="4.5" />
            </span>
          </div>
          <div className="field">
            <label htmlFor="coffee-sca">SCA</label>
            <input id="coffee-sca" type="number" inputMode="decimal" step="0.25" min="0" max="100" name="scaScore" defaultValue={coffee?.scaScore ?? ''} placeholder="86.5" />
          </div>
        </div>
      </section>

      <div className="coffee-form__actions">
        <button className="btn btn--primary" type="submit">{submitLabel}</button>
        <Link href={cancelHref} className="btn btn--ghost">Скасувати</Link>
      </div>
    </form>
  )
}
