import test from 'node:test'
import assert from 'node:assert/strict'
import { computeHomeSummary, computeTasteLeaders } from '../lib/stats.js'

const NOW = new Date('2026-11-10T12:00:00.000Z')

const COFFEES = [
  { id: 'new', purchaseDate: new Date('2026-11-01'), price: 500, myScore: 4, isFinished: false },
  { id: 'oct', purchaseDate: new Date('2026-10-20'), price: 450.4, myScore: null, isFinished: false },
  { id: 'old', purchaseDate: new Date('2026-08-01'), price: 400, myScore: 5, isFinished: true },
  { id: 'no-date', createdAt: new Date('2026-09-01'), price: null, myScore: 3, isFinished: false },
]

test('home summary counts purchases from the last 30 days, not the calendar month', () => {
  const summary = computeHomeSummary(COFFEES, NOW)
  assert.equal(summary.recentDays, 30)
  assert.equal(summary.recentCount, 2)
  assert.equal(summary.recentSpent, 950)
})

test('home summary lists open coffees newest first and counts unrated ones', () => {
  const summary = computeHomeSummary(COFFEES, NOW)
  assert.equal(summary.totalCoffees, 4)
  assert.equal(summary.openCount, 3)
  assert.equal(summary.unratedOpenCount, 1)
  assert.deepEqual(summary.openCoffees.map((coffee) => coffee.id), ['new', 'oct', 'no-date'])
})

test('home summary averages only rated coffees and handles an empty collection', () => {
  assert.equal(computeHomeSummary(COFFEES, NOW).averageScore, 4)
  const empty = computeHomeSummary([], NOW)
  assert.equal(empty.averageScore, null)
  assert.equal(empty.recentCount, 0)
  assert.deepEqual(empty.openCoffees, [])
})

test('taste leaders pick the best rated roaster, country and process', () => {
  const coffees = [
    { roaster: { name: 'DAM' }, originCountry: 'Colombia', process: 'natural', myScore: 5 },
    { roaster: { name: 'DAM' }, originCountry: 'Kenya', process: 'washed', myScore: 2 },
    { roaster: { name: 'Flames' }, originCountry: 'Kenya', process: 'washed', myScore: 4 },
    { roaster: { name: 'Loumi' }, originCountry: 'Peru', process: 'honey', myScore: null },
  ]
  const leaders = computeTasteLeaders(coffees)
  assert.deepEqual(leaders.roaster, { key: 'Flames', avg: 4, count: 1 })
  assert.deepEqual(leaders.country, { key: 'Colombia', avg: 5, count: 1 })
  assert.deepEqual(leaders.process, { key: 'natural', avg: 5, count: 1 })
})

test('taste leaders are empty without ratings', () => {
  assert.deepEqual(computeTasteLeaders([{ roaster: { name: 'DAM' }, myScore: null }]), {
    roaster: null,
    country: null,
    process: null,
  })
})
