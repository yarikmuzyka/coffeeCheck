'use client'

import { useState } from 'react'
import { pickRandomLot } from '../../lib/random-lot.js'
import { saveWishedLot } from '../../lib/new-lot-actions.js'
import { pluralizeUk } from '../../lib/format.js'

// Кнопка «Хоба»: показує випадковий лот із видимого списку «Новинок».
// Кандидати приходять із сервера вже відфільтрованими.
export default function HobaPicker({ lots }) {
  const [pickedId, setPickedId] = useState(null)
  const [round, setRound] = useState(0)

  if (!lots?.length) return null
  // Беремо лот зі свіжих пропсів: після «Хочу спробувати» сторінка
  // ревалідується, і картка одразу показує «У списку».
  const picked = lots.find((lot) => lot.id === pickedId) ?? null

  function roll() {
    setPickedId((previousId) => pickRandomLot(lots, previousId)?.id ?? null)
    setRound((value) => value + 1)
  }

  return (
    <section className="hoba" aria-label="Випадкова кава">
      <div className="hoba__bar">
        <p>Не можеш вибрати? Хай вирішить випадок — серед {lots.length} {pluralizeUk(lots.length, ['лота', 'лотів', 'лотів'])}.</p>
        <button type="button" className="btn btn--primary hoba__button" onClick={roll}>
          🎲 Хоба
        </button>
      </div>

      {picked && (
        <article key={round} className="new-lot-card card hoba__card" aria-live="polite">
          <div className="new-lot-media">
            {picked.imageUrl ? (
              <img className="new-lot-image" src={picked.imageUrl} alt={`Пачка ${picked.name}`} referrerPolicy="no-referrer" />
            ) : (
              <div className="new-lot-image new-lot-image--empty" aria-hidden="true">V60</div>
            )}
            {picked.marker && (
              <span className="new-lot-marker" title={picked.marker.label} role="img" aria-label={picked.marker.label}>
                {picked.marker.emoji}
              </span>
            )}
          </div>
          <div className="new-lot-card__copy">
            <div className="new-lot-card__eyebrow">
              <span>{picked.roasterName}</span>
              <span className="pill">Хоба!</span>
            </div>
            <h2>{picked.name}</h2>
            <p className="meta">{picked.meta}</p>
          </div>
          <div className="new-lot-card__actions">
            <strong>{picked.priceText}</strong>
            <div className="new-lot-card__buttons">
              <a className="btn btn--ghost" href={picked.productUrl} target="_blank" rel="noreferrer">До магазину ↗</a>
              {picked.isWished ? (
                <span className="btn btn--ghost hoba__saved">♡ У списку</span>
              ) : (
                <form action={saveWishedLot}>
                  <input type="hidden" name="lotId" value={picked.id} />
                  <button className="btn btn--primary" type="submit">♡ Хочу спробувати</button>
                </form>
              )}
            </div>
          </div>
          <button type="button" className="hoba__close" onClick={() => setPickedId(null)} aria-label="Закрити результат">×</button>
        </article>
      )}
    </section>
  )
}
