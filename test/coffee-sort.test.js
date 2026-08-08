import test from 'node:test'
import assert from 'node:assert/strict'
import { sortCoffeeEntries } from '../lib/coffee-sort.js'

function entry(name, { score = null, roaster = null } = {}) {
  return { c: { name, roaster: roaster ? { name: roaster } : null }, score }
}

test('sorts coffees by score descending and leaves unrated coffees last', () => {
  const result = sortCoffeeEntries([
    entry('Без оцінки'),
    entry('Вища', { score: 9 }),
    entry('Нижча', { score: 7 }),
  ], 'rating')

  assert.deepEqual(result.map(({ c }) => c.name), ['Вища', 'Нижча', 'Без оцінки'])
})

test('sorts coffees by name using Ukrainian collation', () => {
  const result = sortCoffeeEntries([
    entry('Ягідна'),
    entry('Ароматна'),
    entry('Бразилія 10'),
    entry('Бразилія 2'),
  ], 'name')

  assert.deepEqual(result.map(({ c }) => c.name), ['Ароматна', 'Бразилія 2', 'Бразилія 10', 'Ягідна'])
})

test('sorts by roaster and uses coffee name as a stable secondary key', () => {
  const result = sortCoffeeEntries([
    entry('Друга', { roaster: 'Б обсмажчик' }),
    entry('Без обсмажчика'),
    entry('Перша', { roaster: 'А обсмажчик' }),
    entry('Альфа', { roaster: 'Б обсмажчик' }),
  ], 'roaster')

  assert.deepEqual(result.map(({ c }) => c.name), ['Перша', 'Альфа', 'Друга', 'Без обсмажчика'])
})
