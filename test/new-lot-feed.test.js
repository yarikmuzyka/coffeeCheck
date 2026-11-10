import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNewCoffeeHref,
  filterAndSortLots,
  matchesFeedFilters,
  newLotCutoff,
  uniqueSorted,
} from '../lib/new-lot-feed.js'
import { sourcesSafeToReconcile, syncNewLots } from '../lib/new-lot-sync.js'

const lots = [
  {
    id: 'older',
    roasterName: 'DAM Coffee',
    originCountry: 'Colombia',
    processNames: ['Honey', 'Co-fermentation'],
    firstSeenAt: new Date('2026-11-01T10:00:00Z'),
  },
  {
    id: 'newer',
    roasterName: 'Penyora',
    originCountry: 'Ethiopia',
    processNames: ['Natural'],
    firstSeenAt: new Date('2026-11-08T10:00:00Z'),
  },
]

test('matchesFeedFilters applies case-insensitive exact facet filters', () => {
  assert.equal(matchesFeedFilters(lots[0], { roaster: 'dam coffee', country: 'COLOMBIA' }), true)
  assert.equal(matchesFeedFilters(lots[0], { process: 'co-fermentation' }), true)
  assert.equal(matchesFeedFilters(lots[0], { process: 'natural' }), false)
})

test('filterAndSortLots keeps matching lots newest first without mutating input', () => {
  const input = [...lots]
  assert.deepEqual(filterAndSortLots(input).map((lot) => lot.id), ['newer', 'older'])
  assert.deepEqual(input.map((lot) => lot.id), ['older', 'newer'])
  assert.deepEqual(filterAndSortLots(input, { country: 'Colombia' }).map((lot) => lot.id), ['older'])
})

test('feed helpers build stable facets, links, and a 30 day cutoff', () => {
  assert.deepEqual(uniqueSorted(['Penyora', null, 'DAM Coffee', 'Penyora']), ['DAM Coffee', 'Penyora'])
  assert.equal(buildNewCoffeeHref('lot / 1'), '/coffees/new?lot=lot%20%2F%201')
  assert.equal(newLotCutoff(new Date('2026-11-10T00:00:00Z')).toISOString(), '2026-10-11T00:00:00.000Z')
})

test('sync reconciles only successful sources that returned inventory', () => {
  const sourceLots = [
    { source: 'dam', externalId: '1' },
    { source: 'penyora', externalId: '2' },
  ]
  assert.deepEqual(
    sourcesSafeToReconcile(sourceLots, [{ source: 'penyora', message: 'timeout' }]),
    ['dam'],
  )
})

test('sync upserts normalized lots and only hides unseen products for safe sources', async () => {
  const upserts = []
  const updates = []
  const db = {
    $transaction: async (operation) => operation({
      externalLot: {
        upsert: async (query) => upserts.push(query),
        updateMany: async (query) => updates.push(query),
      },
    }),
  }
  const fetchAll = async () => ({
    lots: [{
      source: 'dam',
      externalId: 'lot-1',
      roasterName: 'DAM Coffee',
      name: 'Colombia',
      productUrl: 'https://example.com/lot-1',
      processNames: [' honey ', 'honey'],
      tastingNotes: ['lychee'],
      packageSizes: ['250 g'],
      price: 650,
    }],
    errors: [{ source: 'foundation', message: 'timeout' }],
  })
  const now = new Date('2026-11-10T12:00:00Z')

  const result = await syncNewLots(db, fetchAll, now)

  assert.equal(result.synced, 1)
  assert.deepEqual(result.reconciledSources, ['dam'])
  assert.deepEqual(upserts[0].update.processNames, ['honey'])
  assert.equal(upserts[0].create.firstSeenAt, now)
  assert.deepEqual(updates[0].where.externalId, { notIn: ['lot-1'] })
})
