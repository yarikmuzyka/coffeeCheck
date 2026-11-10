import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCatalogSort, sortCatalog } from '../lib/catalog-sort.js'

const items = [
  { name: 'washed', _count: { coffees: 7 } },
  { name: 'Omni', _count: { coffees: 0 } },
  { name: 'natural', _count: { coffees: 5 } },
  { name: 'anaerobic', _count: { coffees: 5 } },
]

test('catalog sorts alphabetically ignoring case by default', () => {
  assert.deepEqual(sortCatalog(items).map((item) => item.name), ['anaerobic', 'natural', 'Omni', 'washed'])
})

test('catalog sorts by coffee count with alphabetical tie-break', () => {
  assert.deepEqual(sortCatalog(items, 'count').map((item) => item.name), ['washed', 'anaerobic', 'natural', 'Omni'])
})

test('unknown sort values fall back to name and input is not mutated', () => {
  const copy = [...items]
  assert.equal(normalizeCatalogSort('price'), 'name')
  assert.equal(normalizeCatalogSort(undefined), 'name')
  sortCatalog(items, 'count')
  assert.deepEqual(items, copy)
})
