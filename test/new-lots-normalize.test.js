import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanLotName,
  detectBadge,
  isNonFilterProduct,
  lotKey,
  mergePackageVariants,
  normalizeCountry,
  normalizeLotName,
  normalizePrice,
  normalizeWhitespace,
  parseTastingNotes,
  parseWeightGrams,
  splitProcessNames,
} from '../lib/new-lots/normalize.js'

function rawLot(overrides = {}) {
  return {
    source: 'penyora',
    roasterName: 'Penyora',
    name: 'Kenya Kaguyu',
    lotKey: 'kenya kaguyu',
    productUrl: 'https://example.com/kenya-kaguyu-250g',
    imageUrl: 'https://example.com/kenya.webp',
    originCountry: 'Kenya',
    region: null,
    processNames: ['washed'],
    tastingNotes: ['лохина', 'гранат'],
    badges: [],
    isAvailable: true,
    packages: [{ grams: 250, price: 540, isAvailable: true }],
    ...overrides,
  }
}

test('whitespace is collapsed, including NBSP and zero-width characters', () => {
  assert.equal(normalizeWhitespace('  Ethiopia  Bombe​ \n'), 'Ethiopia Bombe')
  assert.equal(normalizeWhitespace(null), '')
})

test('prices are parsed from numbers and shop strings', () => {
  assert.equal(normalizePrice(550), 550)
  assert.equal(normalizePrice('1 240 грн'), 1240)
  assert.equal(normalizePrice('1 240,50 ₴'), 1240.5)
  assert.equal(normalizePrice('1,240.00'), 1240)
  assert.equal(normalizePrice('1.240,00'), 1240)
  assert.equal(normalizePrice(''), null)
  assert.equal(normalizePrice(0), null)
  assert.equal(normalizePrice('безкоштовно'), null)
})

test('package weights are converted to grams', () => {
  assert.equal(parseWeightGrams('250g'), 250)
  assert.equal(parseWeightGrams('250 г'), 250)
  assert.equal(parseWeightGrams('1-kg'), 1000)
  assert.equal(parseWeightGrams('1 кг'), 1000)
  assert.equal(parseWeightGrams('0,5 кг'), 500)
  assert.equal(parseWeightGrams('1000'), 1000)
  assert.equal(parseWeightGrams(100), 100)
  assert.equal(parseWeightGrams(''), null)
  assert.equal(parseWeightGrams('6 шт/уп'), null)
})

test('shouting names become title case while grades stay uppercase', () => {
  assert.equal(normalizeLotName('KENYA MUCHAGARА AB FILTER'), 'Kenya Muchagara AB Filter')
  assert.equal(normalizeLotName('Ethiopia Messier 41 FMA'), 'Ethiopia Messier 41 FMA')
  assert.equal(cleanLotName('COLOMBIA GEISHA MIKAVA RESERVA FILTER 80g'), 'Colombia Geisha Mikava Reserva')
})

test('shop noise is removed from lot names', () => {
  assert.equal(cleanLotName('Кава Кенія Kiriri 250 г фільтр'), 'Кенія Kiriri')
  assert.equal(cleanLotName('Кава Кенія Wanrich AA 250г фільтр'), 'Кенія Wanrich AA')
  assert.equal(cleanLotName('KENYA KAGUYU FILTER'), 'Kenya Kaguyu')
  assert.equal(cleanLotName('Кава Вартових 250г фільтр'), 'Кава Вартових')
})

test('lot keys ignore case, weight and mixed-script typos', () => {
  assert.equal(lotKey('KENYA MUCHAGARА AB FILTER'), lotKey('Kenya Muchagara AB filter 250g'))
  assert.equal(lotKey('Colombia Nariño Decaf'), 'colombia narino decaf')
  assert.notEqual(lotKey('COLOMBIA DECAF FILTER'), lotKey('COLOMBIA SANTA MONICA DECAF FILTER'))
})

test('countries are normalized to English names and blends have no country', () => {
  assert.equal(normalizeCountry('Кенія'), 'Kenya')
  assert.equal(normalizeCountry('Кава Коста-Ріка Tarrazu'), 'Costa Rica')
  assert.equal(normalizeCountry('Сальвадор'), 'El Salvador')
  assert.equal(normalizeCountry('Ethiopia Sirius ACR'), 'Ethiopia')
  assert.equal(normalizeCountry('Lachen -Rwanda&Ethiopia'), null)
  assert.equal(normalizeCountry('Кава Вартових'), null)
})

test('tasting notes are split, trimmed, lower-cased and deduplicated', () => {
  assert.deepEqual(
    parseTastingNotes('Смак: Порічка,  журавлина , брусниця з цукром, порічка.'),
    ['порічка', 'журавлина', 'брусниця з цукром'],
  )
  assert.deepEqual(parseTastingNotes(''), [])
})

test('combined processes are returned as separate canonical values', () => {
  assert.deepEqual(splitProcessNames('натуральна, анаеробна'), ['natural', 'anaerobic'])
  assert.deepEqual(splitProcessNames('мита/декаф'), ['washed', 'decaf'])
  assert.deepEqual(splitProcessNames('washed/anaerobic'), ['washed', 'anaerobic'])
  assert.deepEqual(splitProcessNames('анаеробний натуральний'), ['anaerobic', 'natural'])
  assert.deepEqual(splitProcessNames('natural_anaerobic'), ['natural', 'anaerobic'])
  assert.deepEqual(splitProcessNames('natural-anaerobic-72-hours'), ['natural', 'anaerobic'])
  assert.deepEqual(splitProcessNames(' хані, виноградна ко-ферментація'), ['honey', 'co-fermentation'])
  assert.deepEqual(splitProcessNames('натуральна, карбонічна мацерація'), ['natural', 'carbonic maceration'])
  assert.deepEqual(splitProcessNames('мита, термалшок'), ['washed', 'thermal shock'])
  assert.deepEqual(splitProcessNames('аеробна, натуральна'), ['aerobic', 'natural'])
  assert.deepEqual(splitProcessNames('напівмитий'), ['semi-washed'])
  assert.deepEqual(splitProcessNames('non_caffeine'), ['decaf'])
})

test('a single process is not split and unknown methods are kept', () => {
  assert.deepEqual(splitProcessNames('Мита'), ['washed'])
  assert.deepEqual(splitProcessNames('Natural'), ['natural'])
  assert.deepEqual(splitProcessNames('Perla Negra'), ['perla negra'])
  assert.deepEqual(splitProcessNames(''), [])
})

test('shop badges are recognized', () => {
  assert.equal(detectBadge(['Новинка']), 'Новинка')
  assert.equal(detectBadge(['NEW']), 'Новинка')
  assert.equal(detectBadge(['БЕЗ КОФЕЇНУ', 'Свіжий Врожай']), 'Свіжий врожай')
  assert.equal(detectBadge(['Свіжий врожай', 'New']), 'Новинка')
  assert.equal(detectBadge(['Мікролот', 'Top', 'Newcastle']), null)
  assert.equal(detectBadge([]), null)
})

test('non-filter products are recognized by title', () => {
  assert.equal(isNonFilterProduct('HONDURAS MARIO SAMUEL ESPRESSO'), true)
  assert.equal(isNonFilterProduct('Кава Колумбія Cauca Decaf 250 г Еспресо'), true)
  assert.equal(isNonFilterProduct('Дріп Коста Ріка Tarrazu 1 шт х 10 г'), true)
  assert.equal(isNonFilterProduct('Капсули Nespresso Brazil'), true)
  assert.equal(isNonFilterProduct('Набір для приготування кави з AeroPress'), true)
  assert.equal(isNonFilterProduct('Fellow Stagg EKG Kettle'), true)
  assert.equal(isNonFilterProduct('KENYA KAGUYU FILTER'), false)
  assert.equal(isNonFilterProduct('Кава Кенія Kiriri 250 г фільтр'), false)
})

test('package sizes of one lot are merged into one record', () => {
  const lots = mergePackageVariants([
    rawLot({ productUrl: 'https://example.com/kenya-kaguyu-1000g', packages: [{ grams: 1000, price: 1840, isAvailable: true }] }),
    rawLot({ name: 'Kenya Kaguyu', badges: ['Свіжий врожай'] }),
  ])

  assert.equal(lots.length, 1)
  assert.deepEqual(lots[0].packageSizes, ['250 г', '1 кг'])
  assert.equal(lots[0].price, 540)
  assert.equal(lots[0].currency, 'UAH')
  assert.equal(lots[0].productUrl, 'https://example.com/kenya-kaguyu-250g')
  assert.equal(lots[0].externalId, 'kenya-kaguyu')
  assert.equal(lots[0].sourceBadge, 'Свіжий врожай')
  assert.equal(lots[0].isAvailable, true)
})

test('duplicate package entries keep the lowest price', () => {
  const [lot] = mergePackageVariants([
    rawLot({ packages: [{ grams: 250, price: '560 грн', isAvailable: true }] }),
    rawLot({ packages: [{ grams: 250, price: 540, isAvailable: true }] }),
  ])
  assert.deepEqual(lot.packageSizes, ['250 г'])
  assert.equal(lot.price, 540)
})

test('different lots with similar names are not merged', () => {
  const lots = mergePackageVariants([
    rawLot({ name: 'Colombia Decaf', lotKey: lotKey('COLOMBIA DECAF FILTER'), processNames: ['decaf'] }),
    rawLot({ name: 'Colombia Santa Monica Decaf', lotKey: lotKey('COLOMBIA SANTA MONICA DECAF FILTER'), processNames: ['decaf'] }),
    rawLot({ name: 'Colombia Santa Monica', lotKey: lotKey('COLOMBIA SANTA MONICA FILTER'), processNames: ['natural', 'anaerobic'] }),
  ])
  assert.equal(lots.length, 3)
  assert.equal(new Set(lots.map((lot) => lot.externalId)).size, 3)
})

test('same name with a different process stays a separate lot with a unique id', () => {
  const lots = mergePackageVariants([
    rawLot({ processNames: ['washed'] }),
    rawLot({ processNames: ['natural'] }),
  ])
  assert.equal(lots.length, 2)
  assert.deepEqual(lots.map((lot) => lot.externalId), ['kenya-kaguyu--washed', 'kenya-kaguyu--natural'])
})

test('lots from different sources are never merged', () => {
  const lots = mergePackageVariants([rawLot(), rawLot({ source: 'dam', roasterName: 'DAM Coffee' })])
  assert.equal(lots.length, 2)
})

test('a lot with every package sold out is unavailable', () => {
  const [soldOut] = mergePackageVariants([
    rawLot({ packages: [{ grams: 250, price: 540, isAvailable: false }, { grams: 1000, price: 1840, isAvailable: false }] }),
  ])
  assert.equal(soldOut.isAvailable, false)
  assert.equal(soldOut.price, 540)

  const [partly] = mergePackageVariants([
    rawLot({ packages: [{ grams: 250, price: 540, isAvailable: false }, { grams: 1000, price: 1840, isAvailable: true }] }),
  ])
  assert.equal(partly.isAvailable, true)
  assert.equal(partly.price, 1840)
})

test('merged lots expose exactly the public lot format', () => {
  const [lot] = mergePackageVariants([rawLot()])
  assert.deepEqual(Object.keys(lot).sort(), [
    'currency', 'externalId', 'imageUrl', 'isAvailable', 'name', 'originCountry', 'packageSizes', 'price',
    'processNames', 'productUrl', 'region', 'roasterName', 'source', 'sourceBadge', 'tastingNotes',
  ])
})
