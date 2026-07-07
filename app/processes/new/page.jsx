import Link from 'next/link'
import { createProcess } from '../../../lib/actions.js'

export default function NewProcessPage() {
  return (
    <div>
      <div className="page-head">
        <h1>Нова обробка кави</h1>
        <p className="sub">Спосіб обробки зерна</p>
      </div>

      <form action={createProcess} className="stack card">
        <div className="field">
          <label>Назва *</label>
          <input name="name" required placeholder="washed / natural / anaerobic…" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--primary" type="submit">Зберегти</button>
          <Link href="/roasters" className="btn btn--ghost">Скасувати</Link>
        </div>
      </form>
    </div>
  )
}
