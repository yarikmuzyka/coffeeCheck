import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deleteOwnedCoffee,
  findOwnedCoffee,
  requireOwnedCoffee,
  updateOwnedCoffee,
} from '../lib/owned-coffees.js'

function fakeDb(initialRecords) {
  const records = initialRecords.map((record) => ({ ...record }))
  const matches = (record, where) => record.id === where.id && record.userId === where.userId

  return {
    records,
    coffee: {
      async findFirst({ where }) {
        return records.find((record) => matches(record, where)) ?? null
      },
      async updateMany({ where, data }) {
        const found = records.filter((record) => matches(record, where))
        found.forEach((record) => Object.assign(record, data))
        return { count: found.length }
      },
      async deleteMany({ where }) {
        const index = records.findIndex((record) => matches(record, where))
        if (index === -1) return { count: 0 }
        records.splice(index, 1)
        return { count: 1 }
      },
    },
  }
}

test('user A cannot read user B coffee by direct id', async () => {
  const db = fakeDb([{ id: 'coffee-b', userId: 'user-b', name: 'Private lot' }])

  const coffee = await findOwnedCoffee(db, { id: 'coffee-b', userId: 'user-a' })

  assert.equal(coffee, null)
})

test('user A cannot update user B coffee', async () => {
  const db = fakeDb([{ id: 'coffee-b', userId: 'user-b', name: 'Private lot' }])

  const result = await updateOwnedCoffee(db, {
    id: 'coffee-b',
    userId: 'user-a',
    data: { name: 'Changed' },
  })

  assert.equal(result.count, 0)
  assert.equal(db.records[0].name, 'Private lot')
})

test('user A cannot delete user B coffee', async () => {
  const db = fakeDb([{ id: 'coffee-b', userId: 'user-b', name: 'Private lot' }])

  const result = await deleteOwnedCoffee(db, { id: 'coffee-b', userId: 'user-a' })

  assert.equal(result.count, 0)
  assert.equal(db.records.length, 1)
})

test('nested writes reject a coffee owned by another user without leaking its data', async () => {
  const db = fakeDb([{ id: 'coffee-b', userId: 'user-b', name: 'Private lot' }])

  await assert.rejects(
    requireOwnedCoffee(db, { id: 'coffee-b', userId: 'user-a' }),
    { message: 'Каву не знайдено' },
  )
})

test('owner can read, update, and delete own coffee', async () => {
  const db = fakeDb([{ id: 'coffee-a', userId: 'user-a', name: 'My lot' }])

  assert.equal((await findOwnedCoffee(db, { id: 'coffee-a', userId: 'user-a' })).name, 'My lot')
  assert.equal((await updateOwnedCoffee(db, {
    id: 'coffee-a',
    userId: 'user-a',
    data: { name: 'Updated lot' },
  })).count, 1)
  assert.equal(db.records[0].name, 'Updated lot')
  assert.equal((await deleteOwnedCoffee(db, { id: 'coffee-a', userId: 'user-a' })).count, 1)
  assert.equal(db.records.length, 0)
})
