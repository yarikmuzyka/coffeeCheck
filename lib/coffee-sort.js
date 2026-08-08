const collator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true })

function compareOptionalText(a, b) {
  const left = a?.trim() ?? ''
  const right = b?.trim() ?? ''
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return collator.compare(left, right)
}

function compareByName(a, b) {
  return compareOptionalText(a.c.name, b.c.name)
}

export function sortCoffeeEntries(entries, sort = 'date') {
  return entries.toSorted((a, b) => {
    if (sort === 'rating') {
      if (a.score == null && b.score == null) return compareByName(a, b)
      if (a.score == null) return 1
      if (b.score == null) return -1
      return b.score - a.score || compareByName(a, b)
    }

    if (sort === 'name') return compareByName(a, b)

    if (sort === 'roaster') {
      return compareOptionalText(a.c.roaster?.name, b.c.roaster?.name) || compareByName(a, b)
    }

    if (sort === 'price') {
      return (b.c.price ?? 0) - (a.c.price ?? 0) || compareByName(a, b)
    }

    const leftDate = new Date(a.c.purchaseDate ?? a.c.createdAt)
    const rightDate = new Date(b.c.purchaseDate ?? b.c.createdAt)
    return rightDate - leftDate || compareByName(a, b)
  })
}
