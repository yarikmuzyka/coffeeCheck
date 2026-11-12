import test from 'node:test'
import assert from 'node:assert/strict'
import { pickRandomLot } from '../lib/random-lot.js'

const LOTS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('empty list gives no lot', () => {
  assert.equal(pickRandomLot([]), null)
  assert.equal(pickRandomLot(undefined), null)
})

test('a single lot is returned even when it was the previous one', () => {
  assert.equal(pickRandomLot([{ id: 'a' }], 'a').id, 'a')
})

test('the previous lot is never picked twice in a row', () => {
  for (let i = 0; i < 200; i += 1) {
    assert.notEqual(pickRandomLot(LOTS, 'b').id, 'b')
  }
})

test('every candidate is reachable', () => {
  const values = [0, 0.4, 0.99]
  assert.deepEqual(values.map((value) => pickRandomLot(LOTS, null, () => value).id), ['a', 'b', 'c'])
  assert.deepEqual([0, 0.99].map((value) => pickRandomLot(LOTS, 'a', () => value).id), ['b', 'c'])
})
