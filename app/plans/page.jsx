import Link from 'next/link'
import { PLAN_CONFIG } from '../../lib/entitlements.js'

export default function PlansPage() {
  const free = PLAN_CONFIG.FREE

  return (
    <div>
      <div className="page-head">
        <h1>Тарифи</h1>
        <p className="sub">Порівняй можливості coffeeCheck</p>
      </div>

      <div className="plan-grid">
        <article className="card plan-card plan-card--active">
          <span className="badge badge--value">Поточний план</span>
          <h2>Free</h2>
          <p className="plan-price">0 ₴</p>
          <ul className="plan-features">
            <li>До {free.limits.roasters} обсмажчиків</li>
            <li>До {free.limits.coffees} кав</li>
            <li>До {free.limits.brewLogs} заварювань</li>
            <li>Базова статистика</li>
          </ul>
          <Link href="/dashboard" className="btn btn--secondary">Повернутися до Dashboard</Link>
        </article>

        <article className="card plan-card">
          <span className="badge">Незабаром</span>
          <h2>Pro</h2>
          <p className="plan-price">Ціна буде оголошена</p>
          <ul className="plan-features">
            <li>Необмежені обсмажчики, кави й заварювання</li>
            <li>Повна аналітика</li>
            <li>Експорт даних</li>
          </ul>
          <span className="btn btn--disabled" aria-disabled="true">Pro ще недоступний</span>
        </article>
      </div>
    </div>
  )
}
