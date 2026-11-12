// Кнопка «Хоба»: випадковий лот зі списку, без повтору того самого поспіль.

/**
 * Picks a lot uniformly at random. With two or more lots the one with
 * `previousId` is excluded; a single lot is always returned as is.
 * `random` returns a number in [0, 1) and can be replaced in tests.
 */
export function pickRandomLot(lots, previousId = null, random = Math.random) {
  if (!Array.isArray(lots) || lots.length === 0) return null
  if (lots.length === 1) return lots[0]
  const candidates = lots.filter((lot) => lot.id !== previousId)
  const pool = candidates.length > 0 ? candidates : lots
  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
  return pool[index]
}
