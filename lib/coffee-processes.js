// Helpers for coffees with several processing methods (natural + anaerobic).
// Pure functions — shared by server actions, pages and analytics.

export const PROCESS_SEPARATOR = ' + '
export const NEW_PROCESS_PREFIX = 'new:'

// Prisma include that loads the processing methods of a coffee.
export const COFFEE_PROCESSES_INCLUDE = {
  processes: { include: { process: { select: { id: true, name: true } } } },
}

function cleanName(value) {
  return (value ?? '').toString().replace(/\s+/g, ' ').trim()
}

function compareNames(a, b) {
  return a.localeCompare(b, 'uk', { sensitivity: 'base' })
}

export function sameProcessName(a, b) {
  return cleanName(a).localeCompare(cleanName(b), 'uk', { sensitivity: 'accent' }) === 0
}

/** Unique names, compared case-insensitively, sorted alphabetically. */
export function uniqueProcessNames(names) {
  const result = []
  for (const name of names.map(cleanName).filter(Boolean)) {
    if (!result.some((existing) => sameProcessName(existing, name))) result.push(name)
  }
  return result.sort(compareNames)
}

/**
 * Processing method names of a coffee. Uses linked processes; falls back to
 * the legacy text field for coffees that have not been migrated yet.
 */
export function coffeeProcessNames(coffee) {
  const linked = (coffee?.processes ?? [])
    .map((link) => link?.process?.name ?? link?.name)
    .filter(Boolean)
  if (linked.length > 0) return uniqueProcessNames(linked)
  const legacy = cleanName(coffee?.process)
  return legacy ? [legacy] : []
}

export function coffeeProcessIds(coffee) {
  return (coffee?.processes ?? []).map((link) => link?.processId ?? link?.process?.id).filter(Boolean)
}

/** "anaerobic + natural" — display label and analytics key of a combination. */
export function processLabel(names) {
  return uniqueProcessNames(names).join(PROCESS_SEPARATOR)
}

export function coffeeProcessLabel(coffee) {
  return processLabel(coffeeProcessNames(coffee))
}

export function coffeeHasProcess(coffee, processName) {
  return coffeeProcessNames(coffee).some((name) => sameProcessName(name, processName))
}

/**
 * Reads the coffee form selection: existing process ids and names of new
 * processes suggested by a saved lot (`new:<name>`).
 */
export function parseProcessSelection(values) {
  const ids = []
  const newNames = []
  for (const raw of values ?? []) {
    const value = cleanName(raw)
    if (!value) continue
    if (value.startsWith(NEW_PROCESS_PREFIX)) {
      const name = cleanName(value.slice(NEW_PROCESS_PREFIX.length))
      if (name && !newNames.some((existing) => sameProcessName(existing, name))) newNames.push(name)
    } else if (!ids.includes(value)) {
      ids.push(value)
    }
  }
  return { ids, newNames }
}

/**
 * Maps a saved lot's processing names onto the user's catalog:
 * known ones are pre-selected, unknown ones are offered as new processes.
 */
export function matchLotProcesses(lotProcessNames, catalog) {
  const selectedIds = []
  const missingNames = []
  for (const name of uniqueProcessNames(lotProcessNames ?? [])) {
    const existing = catalog.find((process) => sameProcessName(process.name, name))
    if (existing) {
      if (!selectedIds.includes(existing.id)) selectedIds.push(existing.id)
    } else {
      missingNames.push(name)
    }
  }
  return { selectedIds, missingNames }
}
