import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTasteProfile,
  canonicalProcessNames,
  isLotTried,
  recommendLots,
  roasterKey,
  sortByRecommendation,
} from '../lib/lot-recommendations.js'

const coffee = (name, roaster, country, process, myScore) => ({
  name,
  roaster: { name: roaster },
  originCountry: country,
  processes: [{ process: { name: process } }],
  myScore,
})

const COFFEES = [
  coffee('Huila', 'Flames', 'Colombia', 'хані', 5),
  coffee('Cauca', 'Flames', 'Colombia', 'washed', 4.5),
  coffee('Guji', 'Loumi', 'Ethiopia', 'natural', 2.5),
  coffee('Sidamo', 'Loumi', 'Ethiopia', 'natural', 3),
  coffee('Nyeri', 'DAM', 'Kenya', 'washed', 4),
]

const lot = (id, extra) => ({ id, name: `Lot ${id}`, roasterName: 'Foundation', originCountry: null, processNames: [], ...extra })

test('roaster keys ignore generic words so DAM and DAM Coffee match', () => {
  assert.equal(roasterKey('DAM Coffee'), 'dam')
  assert.equal(roasterKey('DAM'), 'dam')
  assert.equal(roasterKey('3 Champs Roastery'), '3 champs')
})

test('user process names are canonicalized like lot processes', () => {
  assert.deepEqual(canonicalProcessNames(['хані', 'anaerobic natural']), ['honey', 'anaerobic', 'natural'])
  assert.deepEqual(canonicalProcessNames(['КАРБОНІК МАЦЕРЕЙШН']), ['carbonic maceration'])
})

test('taste profile smooths single ratings toward the mean', () => {
  const profile = buildTasteProfile(COFFEES)
  assert.equal(profile.mean, 3.8)
  const colombia = profile.stats.country.get('Colombia')
  assert.equal(colombia.count, 2)
  assert.ok(colombia.delta > 0 && colombia.delta < colombia.avg - profile.mean)
  assert.ok(profile.stats.country.get('Ethiopia').delta < 0)
})

test('lots matching well rated country and process are recommended with reasons', () => {
  const recs = recommendLots([
    lot('good', { originCountry: 'Колумбія', processNames: ['honey'] }),
    lot('bad', { originCountry: 'Ethiopia', processNames: ['natural'] }),
    lot('unknown', { originCountry: 'Peru', processNames: ['aerobic'] }),
  ], COFFEES)
  assert.equal(recs.get('good').recommended, true)
  assert.match(recs.get('good').reasonText, /Colombia 4\.8/)
  assert.equal(recs.get('bad').recommended, false)
  assert.equal(recs.get('unknown').recommended, false)
})

test('a single high rating alone is not enough for a recommendation', () => {
  const recs = recommendLots([lot('honey', { processNames: ['honey'] })], COFFEES)
  assert.equal(recs.get('honey').recommended, false)
})

test('lots already in the collection are marked tried, not recommended', () => {
  const tried = lot('tried', { name: 'Kenya Nyeri AA', roasterName: 'DAM Coffee', originCountry: 'Colombia', processNames: ['honey'] })
  assert.equal(isLotTried(tried, COFFEES), true)
  const recs = recommendLots([tried], COFFEES)
  assert.equal(recs.get('tried').tried, true)
  assert.equal(recs.get('tried').recommended, false)
})

test('no recommendations until enough coffees are rated', () => {
  const recs = recommendLots([lot('good', { originCountry: 'Colombia', processNames: ['honey'] })], COFFEES.slice(0, 2))
  assert.equal(recs.get('good').recommended, false)
})

test('sorting puts recommended lots first by score and keeps the rest in order', () => {
  const lots = [lot('a'), lot('b'), lot('c'), lot('d')]
  const recs = new Map([
    ['a', { recommended: false, score: 0 }],
    ['b', { recommended: true, score: 0.3 }],
    ['c', { recommended: false, score: 0.9 }],
    ['d', { recommended: true, score: 0.8 }],
  ])
  assert.deepEqual(sortByRecommendation(lots, recs).map((item) => item.id), ['d', 'b', 'a', 'c'])
})

test('markers reflect recommendation or the score of the tried coffee', async () => {
  const { lotMarker } = await import('../lib/lot-recommendations.js')
  assert.equal(lotMarker({ recommended: true, tried: false }).emoji, '🎯')
  assert.equal(lotMarker({ tried: true, triedScore: 4.8 }).emoji, '🤩')
  assert.equal(lotMarker({ tried: true, triedScore: 4 }).emoji, '🙂')
  assert.equal(lotMarker({ tried: true, triedScore: 3 }).emoji, '😐')
  assert.equal(lotMarker({ tried: true, triedScore: 2 }).emoji, '😖')
  assert.equal(lotMarker({ tried: true, triedScore: null }).emoji, '🤔')
  assert.equal(lotMarker({ recommended: false, tried: false }), null)
})

test('tried lots carry the score of the matching coffee', () => {
  const recs = recommendLots([lot('nyeri', { name: 'Kenya Nyeri AA', roasterName: 'DAM Coffee' })], COFFEES)
  assert.equal(recs.get('nyeri').triedScore, 4)
  assert.equal(recs.get('nyeri').marker.emoji, '🙂')
})
