// Українська плюралізація: 1 → one, 2-4 → few, 5+ (і 11-14) → many.
export function pluralizeUk(n, [one, few, many]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function formatWeightGrams(grams) {
  if (grams >= 1000) {
    return `${Number((grams / 1000).toFixed(1))} кг`
  }
  return `${grams} г`
}
