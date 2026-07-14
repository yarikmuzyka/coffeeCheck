import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertWithinLimit,
  getLimitState,
  withCreationLimit,
} from '../lib/entitlements.js'

test('Free boundary permits limit - 1 and blocks limit and limit + 1', () => {
  assert.doesNotThrow(() => assertWithinLimit(4, 5, 'Обсмажчики'))
  assert.throws(() => assertWithinLimit(5, 5, 'Обсмажчики'), /досягнуто ліміт Free/)
  assert.throws(() => assertWithinLimit(6, 5, 'Обсмажчики'), /досягнуто ліміт Free/)
})

test('limit state warns from 80% and marks 100% as reached', () => {
  assert.deepEqual(getLimitState(3, 5), {
    used: 3, limit: 5, percent: 60, warning: false, reached: false,
  })
  assert.deepEqual(getLimitState(4, 5), {
    used: 4, limit: 5, percent: 80, warning: true, reached: false,
  })
  assert.deepEqual(getLimitState(5, 5), {
    used: 5, limit: 5, percent: 100, warning: true, reached: true,
  })
})

test('Pro resources with no limit stay available', () => {
  assert.doesNotThrow(() => assertWithinLimit(10_000, null, 'Кави'))
  assert.deepEqual(getLimitState(10_000, null), {
    used: 10_000, limit: null, percent: 0, warning: false, reached: false,
  })
})

function fakeQuotaDb({ plan = 'FREE', roasters = 0 } = {}) {
  const state = { roasters }
  const tx = {
    async $queryRaw() {},
    user: { async findUnique() { return { plan } } },
    roaster: {
      async count() { return state.roasters },
      async create() { state.roasters += 1; return { id: `r-${state.roasters}` } },
    },
  }
  return {
    state,
    async $transaction(operation) { return operation(tx) },
  }
}

test('creation guard blocks direct writes at the server boundary', async () => {
  const available = fakeQuotaDb({ roasters: 4 })
  await withCreationLimit(available, { userId: 'user-a', resource: 'roasters' }, (tx) => tx.roaster.create())
  assert.equal(available.state.roasters, 5)

  await assert.rejects(
    withCreationLimit(available, { userId: 'user-a', resource: 'roasters' }, (tx) => tx.roaster.create()),
    /досягнуто ліміт Free/,
  )
  assert.equal(available.state.roasters, 5)
})

test('deleting a record frees one place in the quota', async () => {
  const db = fakeQuotaDb({ roasters: 5 })
  db.state.roasters -= 1

  await withCreationLimit(db, { userId: 'user-a', resource: 'roasters' }, (tx) => tx.roaster.create())

  assert.equal(db.state.roasters, 5)
})

test('quota counters are scoped to the current user query', async () => {
  const countedUserIds = []
  const tx = {
    async $queryRaw() {},
    user: { async findUnique() { return { plan: 'FREE' } } },
    coffee: {
      async count({ where }) { countedUserIds.push(where.userId); return 0 },
      async create() { return { id: 'coffee-a' } },
    },
  }
  const db = { async $transaction(operation) { return operation(tx) } }

  await withCreationLimit(db, { userId: 'user-a', resource: 'coffees' }, (client) => client.coffee.create())
  assert.deepEqual(countedUserIds, ['user-a'])
})
