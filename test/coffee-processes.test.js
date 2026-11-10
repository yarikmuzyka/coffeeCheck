import test from 'node:test'
import assert from 'node:assert/strict'
import {
  coffeeHasProcess,
  coffeeProcessIds,
  coffeeProcessLabel,
  coffeeProcessNames,
  matchLotProcesses,
  parseProcessSelection,
  processLabel,
} from '../lib/coffee-processes.js'
import { computeDashboard, computeProcessInsights } from '../lib/stats.js'

function linked(...names) {
  return names.map((name) => ({ processId: `id-${name}`, process: { id: `id-${name}`, name } }))
}

test('linked processes are the source of truth, sorted and deduplicated', () => {
  const coffee = { process: 'washed', processes: linked('natural', 'anaerobic', 'Natural') }
  assert.deepEqual(coffeeProcessNames(coffee), ['anaerobic', 'natural'])
  assert.equal(coffeeProcessLabel(coffee), 'anaerobic + natural')
  assert.deepEqual(coffeeProcessIds(coffee), ['id-natural', 'id-anaerobic', 'id-Natural'])
})

test('coffees without links fall back to the legacy text field', () => {
  assert.deepEqual(coffeeProcessNames({ process: '  anaerobic   natural ', processes: [] }), ['anaerobic natural'])
  assert.deepEqual(coffeeProcessNames({ process: null }), [])
  assert.deepEqual(coffeeProcessNames(null), [])
})

test('combination labels do not depend on selection order', () => {
  assert.equal(processLabel(['natural', 'anaerobic']), processLabel(['anaerobic', 'natural']))
  assert.equal(processLabel([]), '')
})

test('process filter matches any linked method case-insensitively', () => {
  const coffee = { processes: linked('natural', 'anaerobic') }
  assert.equal(coffeeHasProcess(coffee, 'Anaerobic'), true)
  assert.equal(coffeeHasProcess(coffee, 'washed'), false)
})

test('form selection separates catalog ids from suggested new processes', () => {
  assert.deepEqual(
    parseProcessSelection(['id-1', ' id-2 ', 'id-1', 'new:natural', 'new: Natural', 'new:', '']),
    { ids: ['id-1', 'id-2'], newNames: ['natural'] },
  )
  assert.deepEqual(parseProcessSelection(undefined), { ids: [], newNames: [] })
})

test('saved lot processes are matched to the catalog and missing ones suggested', () => {
  const catalog = [{ id: 'p-natural', name: 'Natural' }, { id: 'p-washed', name: 'washed' }]
  assert.deepEqual(matchLotProcesses(['natural', 'anaerobic', 'natural'], catalog), {
    selectedIds: ['p-natural'],
    missingNames: ['anaerobic'],
  })
  assert.deepEqual(matchLotProcesses([], catalog), { selectedIds: [], missingNames: [] })
})

const COFFEES = [
  { id: 'a', name: 'A', originCountry: 'Colombia', myScore: 5, processes: linked('natural', 'anaerobic') },
  { id: 'b', name: 'B', originCountry: 'Kenya', myScore: 3, processes: linked('washed') },
  { id: 'c', name: 'C', originCountry: 'Ethiopia', myScore: 4, processes: linked('natural') },
  { id: 'd', name: 'D', originCountry: 'Colombia', myScore: 4, processes: linked('anaerobic', 'natural') },
  { id: 'legacy', name: 'Legacy', originCountry: 'Brazil', myScore: 2, process: 'pulped natural' },
]

test('method analytics count a coffee in each of its methods', () => {
  const methods = computeProcessInsights(COFFEES)
  const byKey = Object.fromEntries(methods.map((method) => [method.key, method]))

  assert.deepEqual(methods.map((method) => method.key), ['anaerobic', 'natural', 'washed', 'pulped natural'])
  assert.equal(byKey.natural.count, 3)
  assert.equal(byKey.natural.avg, 13 / 3)
  assert.equal(byKey.anaerobic.count, 2)
  assert.equal(byKey.anaerobic.avg, 4.5)
  assert.deepEqual(byKey.natural.pairedWith, [{ key: 'anaerobic', count: 2 }])
  assert.deepEqual(byKey.washed.pairedWith, [])
})

test('combination analytics group coffees by their exact set of methods', () => {
  const combinations = computeProcessInsights(COFFEES, { mode: 'combination' })
  const byKey = Object.fromEntries(combinations.map((group) => [group.key, group]))

  assert.deepEqual(Object.keys(byKey).sort(), ['anaerobic + natural', 'natural', 'pulped natural', 'washed'])
  assert.equal(byKey['anaerobic + natural'].count, 2)
  assert.equal(byKey['anaerobic + natural'].avg, 4.5)
  assert.deepEqual(byKey['anaerobic + natural'].methods, ['anaerobic', 'natural'])
  assert.equal(byKey.natural.count, 1)
  assert.equal(combinations[0].key, 'anaerobic + natural')
})

test('dashboard top processes count individual methods', () => {
  const { topProcesses } = computeDashboard(COFFEES)
  const natural = topProcesses.find((group) => group.key === 'natural')
  assert.equal(natural.count, 3)
  assert.ok(!topProcesses.some((group) => group.key.includes('+')))
})
