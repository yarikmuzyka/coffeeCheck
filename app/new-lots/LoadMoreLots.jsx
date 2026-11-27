'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export default function LoadMoreLots({ initialEntries, initialOffset, hasMore, batchSize, loadBatch }) {
  const [extra, setExtra] = useState([])
  const [offset, setOffset] = useState(initialOffset)
  const [more, setMore] = useState(hasMore)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const trigger = useRef(null)
  const pending = useRef(false)

  const load = useCallback(async () => {
    if (!more || pending.current) return
    pending.current = true
    setLoading(true)
    setFailed(false)
    try {
      const result = await loadBatch(offset)
      setExtra((previous) => [...previous, ...result.entries])
      setOffset(offset + batchSize)
      setMore(result.hasMore)
    } catch {
      setFailed(true)
    } finally {
      pending.current = false
      setLoading(false)
    }
  }, [batchSize, loadBatch, more, offset])

  useEffect(() => {
    if (!trigger.current || !more || loading || failed || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void load()
    }, { rootMargin: '0px 0px 200px 0px' })
    observer.observe(trigger.current)
    return () => observer.disconnect()
  }, [failed, load, loading, more])

  const entries = new Map([...initialEntries, ...extra].map(({ id, card }) => [id, card]))
  return (
    <>
      <div className="new-lots-list" aria-busy={loading}>{[...entries.values()]}</div>
      {more && <div style={{ justifySelf: 'center', textAlign: 'center' }}>
        {failed && <p role="status">Не вдалося завантажити лоти.</p>}
        <button ref={trigger} type="button" className="btn btn--secondary" onClick={load} disabled={loading}>
          {loading ? 'Завантажуємо…' : failed ? 'Спробувати ще раз' : 'Показати ще'}
        </button>
      </div>}
    </>
  )
}
