import test from 'node:test'
import assert from 'node:assert/strict'
import {
  averageMonthlyWeightGrams,
  computeDashboard,
  computeOriginInsights,
  computeProcessInsights,
} from '../lib/stats.js'

test('current-month summary includes a coffee purchased earlier in the same month', () => {
  const coffees = [{
    id: 'july-coffee',
    purchaseDate: new Date('2026-07-09T00:00:00.000Z'),
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    price: 780,
    roaster: { name: 'Світ Кави' },
  }]

  const dashboard = computeDashboard(coffees, new Date('2026-07-14T12:00:00.000Z'))

  assert.equal(dashboard.monthCoffees, 1)
  assert.equal(dashboard.monthSpent, 780)
  assert.equal(dashboard.monthWeightGrams, 250)
})

test('average monthly coffee usage includes months without purchases', () => {
  const coffees = [
    { purchaseDate: new Date('2026-01-10T00:00:00.000Z') },
    { purchaseDate: new Date('2026-03-10T00:00:00.000Z') },
  ]

  const average = averageMonthlyWeightGrams(coffees, new Date('2026-04-20T00:00:00.000Z'))

  assert.equal(average, 125)
})

test('origin insights rank countries and regions by average personal score', () => {
  const coffees = [
    { id: 'huila-a', name: 'Huila A', originCountry: 'Colombia', region: 'Huila', myScore: 4.5 },
    { id: 'huila-b', name: 'Huila B', originCountry: 'Colombia', region: 'Huila', myScore: 5 },
    { id: 'cauca', name: 'Cauca', originCountry: 'Colombia', region: 'Cauca', myScore: 3.5 },
    { id: 'adjuntas', name: 'Adjuntas', originCountry: 'Puerto Rico', region: 'Adjuntas', myScore: 4 },
    { id: 'unrated', name: 'No score', originCountry: 'Puerto Rico', region: 'Lares', myScore: null },
  ]

  const origins = computeOriginInsights(coffees)

  assert.deepEqual(origins.map((origin) => origin.key), ['Colombia', 'Puerto Rico'])
  assert.equal(origins[0].avg, 13 / 3)
  assert.equal(origins[0].regions[0].key, 'Huila')
  assert.equal(origins[0].regions[0].avg, 4.75)
  assert.equal(origins[0].topCoffee.id, 'huila-b')
  assert.equal(origins[1].count, 2)
  assert.equal(origins[1].ratedCount, 1)
})

test('origin insights keep unrated countries after rated ones', () => {
  const origins = computeOriginInsights([
    { id: 'rated', originCountry: 'Kenya', region: 'Nyeri', myScore: 4 },
    { id: 'unrated', originCountry: 'Brazil', region: 'Cerrado', myScore: null },
  ])

  assert.deepEqual(origins.map((origin) => origin.key), ['Kenya', 'Brazil'])
  assert.equal(origins[1].avg, null)
})

test('process insights rank exact processing methods and their best countries', () => {
  const coffees = [
    { id: 'natural-colombia', name: 'Natural Colombia', process: 'natural', originCountry: 'Colombia', myScore: 4.5 },
    { id: 'natural-ethiopia', name: 'Natural Ethiopia', process: 'natural', originCountry: 'Ethiopia', myScore: 4 },
    { id: 'thermal', name: 'Thermal Shock', process: 'natural thermal shock', originCountry: 'Colombia', myScore: 5 },
    { id: 'washed', name: 'Washed Kenya', process: 'washed', originCountry: 'Kenya', myScore: 3.5 },
  ]

  const processes = computeProcessInsights(coffees)

  assert.deepEqual(processes.map((process) => process.key), ['natural thermal shock', 'natural', 'washed'])
  assert.equal(processes[0].topCoffee.id, 'thermal')
  assert.equal(processes[1].countries[0].key, 'Colombia')
  assert.equal(processes[1].avg, 4.25)
})
