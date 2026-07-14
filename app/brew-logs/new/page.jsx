import Link from 'next/link'
import { prisma } from '../../../lib/prisma.js'
import { createBrewLog } from '../../../lib/actions.js'
import { BREW_METHODS, SCORE_FIELDS } from '../../../lib/constants.js'
import { requireUser } from '../../../lib/auth.js'
import { getUsageSnapshot } from '../../../lib/entitlements.js'
import { LimitReached } from '../../components/UsagePanel.jsx'

export const dynamic = 'force-dynamic'

export default async function NewBrewLogPage({ searchParams }) {
  const user = await requireUser()
  const sp = await searchParams
  const preselect = sp.coffee ?? ''
  const [coffees, usage] = await Promise.all([
    prisma.coffee.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { roaster: true },
    }),
    getUsageSnapshot(prisma, user.id),
  ])

  if (usage.resources.brewLogs.reached) {
    return <LimitReached resourceLabel="Заварювання" state={usage.resources.brewLogs} backHref="/coffees" />
  }

  return (
    <div>
      <div className="page-head">
        <h1>Нове заварювання</h1>
        <p className="sub">Запиши рецепт і оціни чашку</p>
      </div>

      {coffees.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          Спершу <Link href="/coffees/new">додай каву →</Link>
        </div>
      )}

      <form action={createBrewLog} className="stack card">
        <div className="row">
          <div className="field">
            <label>Кава *</label>
            <select name="coffeeId" required defaultValue={preselect}>
              <option value="" disabled>оберіть…</option>
              {coffees.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.roaster?.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Дата</label>
            <input type="date" name="brewedAt" />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label>Метод *</label>
            <select name="method" required defaultValue="V60">
              {BREW_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Назва рецепту</label>
            <input name="recipeName" placeholder="Tetsu 4:6" />
          </div>
          <div className="field">
            <label>Ратіо (авто, якщо порожньо)</label>
            <input name="ratio" placeholder="1:16.7" />
          </div>
        </div>

        <fieldset>
          <legend>Параметри</legend>
          <div className="row-3">
            <div className="field"><label>Доза (г)</label><input type="number" step="0.1" min="0.1" max="1000" name="doseGrams" placeholder="15" /></div>
            <div className="field"><label>Вода (г)</label><input type="number" step="0.1" min="0.1" max="10000" name="waterGrams" placeholder="250" /></div>
            <div className="field"><label>Темп. води (°C)</label><input type="number" step="0.5" min="0" max="100" name="waterTempC" placeholder="94" /></div>
            <div className="field"><label>Помел</label><input name="grindSize" placeholder="medium-fine" /></div>
            <div className="field"><label>Кавомолка</label><input name="grinder" placeholder="Comandante C40" /></div>
            <div className="field"><label>Час (с)</label><input type="number" min="1" max="86400" name="brewTimeSeconds" placeholder="165" /></div>
            <div className="field"><label>Вода (назва)</label><input name="waterName" placeholder="Third Wave Water" /></div>
            <div className="field"><label>Фільтр</label><input name="filterType" placeholder="Hario tabbed" /></div>
            <div className="field"><label>Воронка / девайс</label><input name="brewer" placeholder="Hario V60 02" /></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Оцінка (1–10)</legend>
          <div className="scores">
            {SCORE_FIELDS.map((f) => (
              <div key={f.key} className="field score-field">
                <label>{f.label}</label>
                <input type="number" min="1" max="10" name={f.key} />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label>Сприйняті ноти</label>
          <input name="perceivedNotes" placeholder="jasmine, lemon zest, black tea" />
        </div>
        <div className="row">
          <div className="field">
            <label>Дефекти</label>
            <input name="defects" placeholder="надмірна екстракція…" />
          </div>
          <label className="field checkbox" style={{ alignSelf: 'end', paddingBottom: 10 }}>
            <input type="checkbox" name="wouldBrewAgain" value="true" /> Варив би ще раз
          </label>
        </div>
        <div className="field">
          <label>Нотатки</label>
          <textarea name="notes" rows={2} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти заварювання</button>
          <Link href="/coffees" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
