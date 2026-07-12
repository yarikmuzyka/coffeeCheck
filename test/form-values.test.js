import test from 'node:test'
import assert from 'node:assert/strict'
import { optionalDate, optionalNumber } from '../lib/form-values.js'

test('optionalNumber accepts empty and in-range numeric values', () => {
  assert.equal(optionalNumber('', 'Оцінка', { min: 0, max: 10 }), null)
  assert.equal(optionalNumber('8.5', 'Оцінка', { min: 0, max: 10 }), 8.5)
  assert.equal(optionalNumber('180', 'Час', { min: 1, max: 86400, integer: true }), 180)
})

test('optionalNumber rejects invalid, fractional integer, and out-of-range values', () => {
  assert.throws(() => optionalNumber('abc', 'Оцінка', { min: 0, max: 10 }))
  assert.throws(() => optionalNumber('1.5', 'Час', { min: 1, max: 100, integer: true }))
  assert.throws(() => optionalNumber('11', 'Оцінка', { min: 0, max: 10 }))
})

test('optionalDate validates supplied dates', () => {
  assert.equal(optionalDate('', 'Дата'), null)
  assert.equal(optionalDate('2026-07-12', 'Дата').toISOString(), '2026-07-12T00:00:00.000Z')
  assert.throws(() => optionalDate('not-a-date', 'Дата'))
  assert.throws(() => optionalDate('2026-02-31', 'Дата'))
})
