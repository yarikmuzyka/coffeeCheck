'use client'

import { useState } from 'react'

export default function FeedControls({ filterCount, filters, legend }) {
  const [panel, setPanel] = useState(null)
  return (
    <div className="feed-controls">
      <div className="feed-controls__buttons">
        <button type="button" className="btn btn--secondary" aria-controls="feed-filters" aria-expanded={panel === 'filters'} onClick={() => setPanel(panel === 'filters' ? null : 'filters')}>
          Фільтри{filterCount > 0 && ` · ${filterCount}`}
        </button>
        <button type="button" className="btn btn--ghost" aria-controls="feed-legend" aria-expanded={panel === 'legend'} onClick={() => setPanel(panel === 'legend' ? null : 'legend')}>
          Позначки
        </button>
      </div>
      <div id="feed-legend" className="feed-controls__panel" data-expanded={panel === 'legend'}>{legend}</div>
      <div id="feed-filters" className="feed-controls__panel" data-expanded={panel === 'filters'}>{filters}</div>
    </div>
  )
}
