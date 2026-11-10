import { fetchDamLots, DAM_SOURCE } from './sources/dam.js'
import { fetchFoundationLots, FOUNDATION_SOURCE } from './sources/foundation.js'
import { fetchPenyoraLots, PENYORA_SOURCE } from './sources/penyora.js'

export const NEW_LOT_SOURCES = [
  { source: DAM_SOURCE, fetchLots: fetchDamLots },
  { source: FOUNDATION_SOURCE, fetchLots: fetchFoundationLots },
  { source: PENYORA_SOURCE, fetchLots: fetchPenyoraLots },
]

function errorMessage(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'Request timed out'
  return error?.message ? String(error.message) : String(error)
}

/**
 * Fetches filter-coffee lots from every shop in parallel.
 * A failing shop never stops the others: its error is reported in `errors`.
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] custom fetch (tests, proxies)
 * @param {number} [options.timeoutMs] per-request timeout
 * @param {Array<{source: string, fetchLots: Function}>} [options.sources]
 * @returns {Promise<{ lots: object[], errors: { source: string, message: string }[] }>}
 */
export async function fetchAllNewLots({ fetchImpl, timeoutMs, sources = NEW_LOT_SOURCES } = {}) {
  const settled = await Promise.allSettled(
    sources.map(({ fetchLots }) => Promise.resolve().then(() => fetchLots({ fetchImpl, timeoutMs }))),
  )

  const lots = []
  const errors = []
  settled.forEach((result, index) => {
    const { source } = sources[index]
    if (result.status === 'fulfilled') {
      lots.push(...(Array.isArray(result.value) ? result.value : []))
    } else {
      errors.push({ source, message: errorMessage(result.reason) })
    }
  })

  return { lots, errors }
}

export {
  fetchDamLots,
  fetchFoundationLots,
  fetchPenyoraLots,
}
