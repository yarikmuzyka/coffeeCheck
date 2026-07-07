import Link from 'next/link'
import { createRoaster } from '../../../lib/actions.js'

export default function NewRoasterPage() {
  return (
    <div>
      <div className="page-head">
        <h1>Новий обсмажчик</h1>
        <p className="sub">Хто смажив цю каву</p>
      </div>

      <form action={createRoaster} className="stack card">
        <div className="field">
          <label>Назва *</label>
          <input name="name" required placeholder="Foundation Coffee Roasters" />
        </div>
        <div className="row">
          <div className="field">
            <label>Країна</label>
            <input name="country" placeholder="Ukraine" />
          </div>
          <div className="field">
            <label>Місто</label>
            <input name="city" placeholder="Kyiv" />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Вебсайт</label>
            <input name="website" type="url" placeholder="https://…" />
          </div>
          <div className="field">
            <label>Instagram</label>
            <input name="instagram" placeholder="@handle" />
          </div>
        </div>
        <div className="field">
          <label>Нотатки</label>
          <textarea name="notes" rows={2} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти</button>
          <Link href="/roasters" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
