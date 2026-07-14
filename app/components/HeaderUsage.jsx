import Link from 'next/link'

const ITEMS = [
  { key: 'roasters', label: 'Обсмажчики', compactLabel: 'обсмажчиків' },
  { key: 'coffees', label: 'Кави', compactLabel: 'кав' },
]

function amount(state, separator = ' із ') {
  return state.limit == null ? `${state.used}${separator}∞` : `${state.used}${separator}${state.limit}`
}

export function HeaderUsage({ usage }) {
  return (
    <details className="header-usage">
      <summary className="header-usage-summary" aria-label="Показати використання плану">
        <strong>{usage.label}</strong>
        {ITEMS.map(({ key, compactLabel }) => (
          <span key={key} className="header-usage-compact">
            {amount(usage.resources[key], '/')} {compactLabel}
          </span>
        ))}
        <span className="header-usage-chevron" aria-hidden="true" />
      </summary>

      <div className="header-usage-popover">
        <h2>Використання плану {usage.label}</h2>
        {ITEMS.map(({ key, label }) => {
          const state = usage.resources[key]
          return (
            <div key={key} className={`header-usage-item${state.reached ? ' header-usage-item--reached' : state.warning ? ' header-usage-item--warning' : ''}`}>
              <div className="header-usage-meta">
                <strong>{label}</strong>
                <span>{amount(state)}</span>
              </div>
              {state.limit != null && (
                <div className="header-usage-bar" role="progressbar" aria-label={label} aria-valuenow={state.used} aria-valuemin="0" aria-valuemax={state.limit}>
                  <span style={{ width: `${state.percent}%` }} />
                </div>
              )}
            </div>
          )
        })}
        <Link href="/plans" className="header-usage-link">Порівняти плани →</Link>
      </div>
    </details>
  )
}
