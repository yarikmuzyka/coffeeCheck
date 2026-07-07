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
  if (grams < 1000) return `${grams} г`
  // округлення до 2 знаків без зайвих нулів: 1000→1, 1500→1.5, 1250→1.25
  const kg = Math.round((grams / 1000) * 100) / 100
  return `${kg} кг`
}
