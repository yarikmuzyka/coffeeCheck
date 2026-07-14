import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDashboard } from '../lib/stats.js'

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
