export function optionalNumber(value, label, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const raw = (value ?? '').toString().trim()
  if (raw === '') return null

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${label}: введіть коректне ${integer ? 'ціле ' : ''}число`)
  }
  if (parsed < min || parsed > max) {
    throw new Error(`${label}: значення має бути від ${min} до ${max}`)
  }
  return parsed
}

export function optionalDate(value, label, { min, max } = {}) {
  const raw = (value ?? '').toString().trim()
  if (raw === '') return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${label}: введіть коректну дату`)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new Error(`${label}: введіть коректну дату`)
  }
  if (min && raw < min) throw new Error(`${label}: дата не може бути раніше ${min}`)
  if (max && raw > max) throw new Error(`${label}: дата не може бути пізніше ${max}`)
  return parsed
}
