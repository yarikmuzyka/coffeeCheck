import Link from 'next/link'

export function LimitReached({ resourceLabel, state, backHref }) {
  return (
    <div className="card limit-message">
      <h2>Ліміт {resourceLabel.toLowerCase()} вичерпано</h2>
      <p>На плані Free доступно {state.limit} записів. Видали непотрібний запис або перейди на Pro, щоб додати новий.</p>
      <div className="limit-actions">
        <Link href={backHref} className="btn btn--secondary">Назад до списку</Link>
        <Link href="/plans" className="btn btn--primary">Порівняти плани</Link>
      </div>
    </div>
  )
}
