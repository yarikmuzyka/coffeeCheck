import test from 'node:test'
import assert from 'node:assert/strict'
import { enforceMutationRateLimit } from '../lib/rate-limit.js'

function fakeDb() {
  const counts = new Map()
  return {
    rateLimitBucket: {
      async upsert({ where }) {
        const keyData = where.userId_action_windowStart
        const key = `${keyData.userId}:${keyData.action}:${keyData.windowStart.toISOString()}`
        const count = (counts.get(key) ?? 0) + 1
        counts.set(key, count)
        return { count }
      },
    },
  }
}

test('normal mutations allow 60 requests per minute and block the next one', async () => {
  const db = fakeDb()
  const now = new Date('2026-07-14T12:00:30.000Z')
  for (let index = 0; index < 60; index += 1) {
    await enforceMutationRateLimit(db, 'user-a', { now })
  }
  await assert.rejects(enforceMutationRateLimit(db, 'user-a', { now }), /Забагато запитів/)
})

test('sensitive mutations have a stricter independent limit', async () => {
  const db = fakeDb()
  const now = new Date('2026-07-14T12:00:30.000Z')
  for (let index = 0; index < 10; index += 1) {
    await enforceMutationRateLimit(db, 'user-a', { sensitive: true, now })
  }
  await assert.rejects(
    enforceMutationRateLimit(db, 'user-a', { sensitive: true, now }),
    /Забагато запитів/,
  )
  await assert.doesNotReject(enforceMutationRateLimit(db, 'user-a', { now }))
})
