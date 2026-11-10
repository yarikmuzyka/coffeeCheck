import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAllNewLots } from '../lib/new-lots/index.js'
import { DAM_URL, fetchDamLots, parseDamCatalog } from '../lib/new-lots/sources/dam.js'
import {
  buildFoundationRawLot,
  fetchFoundationLots,
  FOUNDATION_LIST_API,
  isFoundationFilterCard,
} from '../lib/new-lots/sources/foundation.js'
import { fetchPenyoraLots, parsePenyoraCatalog, PENYORA_URL } from '../lib/new-lots/sources/penyora.js'
import { mergePackageVariants } from '../lib/new-lots/normalize.js'

// ---------------------------------------------------------------------------
// Fixtures (trimmed copies of real shop markup / API responses)
// ---------------------------------------------------------------------------

function escapeAttribute(value) {
  return JSON.stringify(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function damCard({ id, slug, title, process, notes, variations, roastedFor = 'filter', extra = '' }) {
  return `<li class="product-card-item product-item product-wrap category-filter" data-card="custom-product-card">
  <div class="product-loop product-boxed product-classic product type-product">
    <figure class="product-media">
      <a href="https://damcoffee.com.ua/shop/${slug}/"><img width="300" src="https://damcoffee.com.ua/img/${slug}.jpg" alt="${title}" />
      <div class="att"><div class="att-coffe roasted-for-${roastedFor}"><p class="att-text">Roasted for</p><p class="att-title">${roastedFor}</p></div></div></a>
    </figure>
    ${extra}
    <div class="product-details">
      <h3 class="woocommerce-loop-product__title"><a href="https://damcoffee.com.ua/shop/${slug}/">${title}</a></h3>
      <div class="product-details-exerpt"><span>Обробка</span>${process}</div>
      <div class="product-details-exerpt"><span>Смак</span>${notes}</div>
      <form class="variations_form cart" data-product_id="${id}" data-product_variations="${escapeAttribute(variations)}">
        <select name="pac_pomel"><option>Домашня еспресо кавоварка</option></select>
      </form>
    </div>
  </div>
</li>`
}

function damVariation(size, price, inStock = true) {
  return { attributes: { attribute_pa_vaga: size }, display_price: price, is_in_stock: inStock, is_purchasable: true, weight: '' }
}

const DAM_HTML = `<html><body><ul class="products" data-load="{&quot;max&quot;:0}">
${damCard({
    id: 20411,
    slug: 'ethiopia-deri-kidame',
    title: 'Ethiopia Deri Kidame',
    process: 'натуральна, анаеробна',
    notes: 'чорний чай, полуниця, темна вишня, лікер',
    variations: [damVariation('250g', 520)],
    extra: '<span class="badge new">Новинка</span>',
  })}
${damCard({
    id: 7557,
    slug: 'colombia-carambolo',
    title: 'Colombia Carambolo',
    process: 'мита, термалшок',
    notes: 'малина, молочний улун, лемонграс, кокос',
    variations: [damVariation('1-kg', 1510), damVariation('250g', 440)],
  })}
${damCard({
    id: 9001,
    slug: 'kenya-sold-out',
    title: 'Kenya Sold&nbsp;Out',
    process: 'мита',
    notes: 'порічка',
    variations: [damVariation('250g', 400, false), damVariation('1-kg', 1300, false)],
  })}
${damCard({
    id: 9002,
    slug: 'brazil-espresso',
    title: 'Brazil Cerrado',
    process: 'натуральна',
    notes: 'горіх',
    variations: [damVariation('250g', 300)],
    roastedFor: 'espresso',
  })}
${damCard({
    id: 9003,
    slug: 'drip-kenya',
    title: 'Дріп Kenya AB',
    process: 'мита',
    notes: 'порічка',
    variations: [damVariation('250g', 300)],
  })}
</ul></body></html>`

function foundationCard(overrides) {
  return {
    id: 1166,
    chpu: 'kava-keniya-kiriri-filtr',
    badge: 0,
    name: 'Кава Кенія Kiriri 250 г фільтр',
    imagePath: 'https://cdn.example.com/kiriri.png',
    filterVariants: [49, 53, 26, 24, 59],
    goods: [{ id: 1, properties: [{ id: 1, name: 'Об`єм', value: '250г' }], price: 555, weight_gr: 250, prices: { UAH: { price: 555 } }, on_off: true }],
    ...overrides,
  }
}

const FOUNDATION_CARDS = [
  foundationCard(),
  foundationCard({
    id: 2001,
    chpu: 'kava-keniya-kiriri-1-kg-filtr',
    name: 'Кава Кенія Kiriri 1 кг фільтр',
    goods: [{ id: 2, properties: [{ id: 1, name: 'Об`єм', value: '1 кг' }], price: 1890, weight_gr: 0, prices: { UAH: { price: 1890 } }, on_off: true }],
  }),
  foundationCard({
    id: 1508,
    chpu: 'kava-kolumbiya-thermal-shock-250g-filtr',
    badge: 2,
    name: 'Кава Колумбія Thermal Shock 250г фільтр',
    filterVariants: [49, 33, 24, 59],
    goods: [{ id: 3, properties: [{ id: 1, name: 'Об`єм', value: '250г' }], price: 680, weight_gr: 0, prices: { UAH: { price: 680 } }, on_off: true }],
  }),
  foundationCard({ id: 1367, chpu: 'kava-kolumbiya-cauca-decaf-250-g-espreso', name: 'Кава Колумбія Cauca Decaf 250 г Еспресо', filterVariants: [52, 34, 59, 48, 35] }),
  foundationCard({ id: 1427, chpu: 'drip-kosta-rika-tarrazu', name: 'Дріп Коста Ріка Tarrazu 1 шт х 10 г', filterVariants: [49, 26, 24] }),
  foundationCard({ id: 1004, chpu: 'nabir-aeropress', name: 'Набір для приготування кави з AeroPress', filterVariants: [] }),
  foundationCard({ id: 470, chpu: 'degustatsinii-nabr', name: 'Дегустаційний набір "Specialty" filter', filterVariants: [1, 8, 9, 49] }),
]

const FOUNDATION_DETAILS = {
  'kava-keniya-kiriri-filtr': {
    badge: 0,
    preview: '*митий\r\nфінік, вишнева настоянка, какао',
    is_available: true,
    features: [
      { name: 'Країна', value: 'Кенія' },
      { name: 'Регіон', value: 'Rift Valley' },
      { name: 'Спосіб обробки', value: 'митий' },
      { name: 'Дескриптори', value: 'фінік, вишнева настоянка, какао' },
    ],
    filters: [{ id: 3, name: 'Ступінь обсмажування', variants: [{ id: 24, name: 'світлий (фільтр)' }] }],
  },
  'kava-kolumbiya-thermal-shock-250g-filtr': {
    badge: 2,
    preview: '*natural thermal shock\r\nмармелад, фруктовий лід, іриска',
    is_available: false,
    features: [{ name: 'Країна', value: 'Колумбія' }, { name: 'Регіон', value: 'Popayan' }],
    filters: [{ id: 2, name: 'Спосіб обробки', variants: [{ id: 33, name: 'експериментальний' }] }],
  },
}

function penyoraProduct(overrides) {
  return {
    _id: overrides.slug,
    category: 'filter',
    country: 'Kenya',
    imgList: [`https://cdn.example.com/${overrides.slug}.webp`],
    otherText: 'Смак: лохина, гранат, слива',
    proc: 'washed',
    title: 'KENYA KAGUYU FILTER',
    weight: '250',
    price: 540,
    tagOne: '',
    tagTwo: '',
    tagSpec: '',
    ...overrides,
  }
}

const PENYORA_PRODUCTS = [
  penyoraProduct({ slug: 'b067-filter-kenya-muchagara-ab-filter-1000g', title: 'KENYA MUCHAGARА AB FILTER', weight: '1000', price: 1840, tagTwo: 'Свіжий врожай' }),
  penyoraProduct({ slug: '3745-filter-kenya-muchagara-ab-filter-250g', title: 'KENYA MUCHAGARA AB FILTER', weight: '250', price: 540, tagTwo: 'Свіжий врожай' }),
  penyoraProduct({ slug: '6a538-colombia-decaf-filter-1000g', title: 'COLOMBIA DECAF FILTER', country: 'Colombia', proc: 'non_caffeine', weight: '1000', price: 1620 }),
  penyoraProduct({ slug: '2081-filter-colombia-santa-monica-decaf-filter-250g', title: 'COLOMBIA SANTA MONICA DECAF FILTER', country: 'Colombia', proc: 'non_caffeine', price: 520 }),
  penyoraProduct({ slug: '47dd-filter-colombia-santa-monica-filter-250g', title: 'COLOMBIA SANTA MONICA FILTER', country: 'Colombia', proc: 'natural_anaerobic', price: 480, tagOne: 'Новинка' }),
  penyoraProduct({ slug: 'x-filter-kenya-gone-250g', title: 'KENYA GONE FILTER', inStock: false }),
  penyoraProduct({ slug: 'de6-espresso-honduras-mario-samuel-250g', title: 'HONDURAS MARIO SAMUEL ESPRESSO', category: 'espresso', country: 'Honduras' }),
  penyoraProduct({ slug: 'drip-kenya', title: 'KENYA DRIP 10psc', category: 'drip' }),
  penyoraProduct({ slug: 'caps', title: 'BRAZIL CAPSULES', category: 'capsules' }),
  penyoraProduct({ slug: 'fellow', title: 'Fellow Stagg EKG PRO', category: 'accessories', country: '', proc: null, weight: '', price: 9200 }),
]

const PENYORA_HTML = `<!DOCTYPE html><html><body><div id="__next"></div>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { category: 'filter', products: PENYORA_PRODUCTS } },
  page: '/shop/[category]',
})}</script></body></html>`

function response(body, { status = 200 } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return { ok: status >= 200 && status < 300, status, text: async () => text }
}

function fakeFetch(routes) {
  return async (url) => {
    const handler = routes[url]
    if (!handler) return response('not found', { status: 404 })
    return typeof handler === 'function' ? handler() : handler
  }
}

function byName(lots, name) {
  return lots.find((lot) => lot.name === name)
}

// ---------------------------------------------------------------------------
// DAM
// ---------------------------------------------------------------------------

test('DAM: parses filter cards and skips espresso and drip products', () => {
  const lots = mergePackageVariants(parseDamCatalog(DAM_HTML))
  assert.deepEqual(lots.map((lot) => lot.name), ['Ethiopia Deri Kidame', 'Colombia Carambolo', 'Kenya Sold Out'])

  const deri = byName(lots, 'Ethiopia Deri Kidame')
  assert.equal(deri.source, 'dam')
  assert.equal(deri.externalId, '20411')
  assert.equal(deri.roasterName, 'DAM Coffee')
  assert.equal(deri.productUrl, 'https://damcoffee.com.ua/shop/ethiopia-deri-kidame/')
  assert.equal(deri.imageUrl, 'https://damcoffee.com.ua/img/ethiopia-deri-kidame.jpg')
  assert.equal(deri.originCountry, 'Ethiopia')
  assert.deepEqual(deri.processNames, ['natural', 'anaerobic'])
  assert.deepEqual(deri.tastingNotes, ['чорний чай', 'полуниця', 'темна вишня', 'лікер'])
  assert.equal(deri.sourceBadge, 'Новинка')
})

test('DAM: variations of one product become package sizes of one lot', () => {
  const lots = mergePackageVariants(parseDamCatalog(DAM_HTML))
  const carambolo = byName(lots, 'Colombia Carambolo')
  assert.deepEqual(carambolo.packageSizes, ['250 г', '1 кг'])
  assert.equal(carambolo.price, 440)
  assert.deepEqual(carambolo.processNames, ['washed', 'thermal shock'])
  assert.equal(carambolo.isAvailable, true)
})

test('DAM: a product without stock in any variation is unavailable', () => {
  const lots = mergePackageVariants(parseDamCatalog(DAM_HTML))
  assert.equal(byName(lots, 'Kenya Sold Out').isAvailable, false)
})

test('DAM: an empty or changed page is reported as an error', async () => {
  const fetchImpl = fakeFetch({ [DAM_URL]: response('<html><body>Нічого не знайдено</body></html>') })
  await assert.rejects(fetchDamLots({ fetchImpl }), /No filter lots found/)
})

// ---------------------------------------------------------------------------
// Foundation
// ---------------------------------------------------------------------------

test('Foundation: espresso, drip, sets and equipment are filtered out', () => {
  const kept = FOUNDATION_CARDS.filter(isFoundationFilterCard).map((card) => card.chpu)
  assert.deepEqual(kept, [
    'kava-keniya-kiriri-filtr',
    'kava-keniya-kiriri-1-kg-filtr',
    'kava-kolumbiya-thermal-shock-250g-filtr',
  ])
})

test('Foundation: product cards with an espresso roast are dropped', () => {
  const details = { filters: [{ id: 3, name: 'Ступінь обсмажування', variants: [{ id: 35, name: 'середній (еспресо)' }] }] }
  assert.equal(buildFoundationRawLot(foundationCard({ filterVariants: [49] }), details), null)
})

test('Foundation: fetches category and product details, merging package cards', async () => {
  const routes = { [FOUNDATION_LIST_API]: response({ id: 97, goodscard: FOUNDATION_CARDS }) }
  for (const [chpu, details] of Object.entries(FOUNDATION_DETAILS)) {
    routes[`https://foundation.ua/api/v1/goodscard/${chpu}`] = response(details)
  }
  // The 1 kg card's details endpoint fails — the lot must still be built.
  routes['https://foundation.ua/api/v1/goodscard/kava-keniya-kiriri-1-kg-filtr'] = response('boom', { status: 500 })

  const lots = await fetchFoundationLots({ fetchImpl: fakeFetch(routes) })
  assert.equal(lots.length, 2)

  const kiriri = byName(lots, 'Кенія Kiriri')
  assert.equal(kiriri.externalId, 'keniia-kiriri')
  assert.equal(kiriri.productUrl, 'https://foundation.ua/product/kava-keniya-kiriri-filtr')
  assert.deepEqual(kiriri.packageSizes, ['250 г', '1 кг'])
  assert.equal(kiriri.price, 555)
  assert.equal(kiriri.originCountry, 'Kenya')
  assert.equal(kiriri.region, 'Rift Valley')
  assert.deepEqual(kiriri.processNames, ['washed'])
  assert.deepEqual(kiriri.tastingNotes, ['фінік', 'вишнева настоянка', 'какао'])
  assert.equal(kiriri.sourceBadge, null)

  const thermal = byName(lots, 'Колумбія Thermal Shock')
  assert.deepEqual(thermal.processNames, ['natural', 'thermal shock'])
  assert.deepEqual(thermal.tastingNotes, ['мармелад', 'фруктовий лід', 'іриска'])
  assert.equal(thermal.sourceBadge, 'Новинка')
  assert.equal(thermal.isAvailable, false)
})

// ---------------------------------------------------------------------------
// Penyora
// ---------------------------------------------------------------------------

test('Penyora: only filter coffee is kept', () => {
  const raw = parsePenyoraCatalog(PENYORA_HTML)
  assert.equal(raw.length, 6)
  assert.ok(raw.every((lot) => !/espresso|drip|capsules|fellow/i.test(lot.productUrl)))
})

test('Penyora: package products of one lot are merged despite a mixed-script typo', async () => {
  const lots = await fetchPenyoraLots({ fetchImpl: fakeFetch({ [PENYORA_URL]: response(PENYORA_HTML) }) })
  const muchagara = lots.filter((lot) => lot.name === 'Kenya Muchagara AB')
  assert.equal(muchagara.length, 1)
  assert.deepEqual(muchagara[0].packageSizes, ['250 г', '1 кг'])
  assert.equal(muchagara[0].price, 540)
  assert.equal(muchagara[0].productUrl, 'https://specialtycoffee.com.ua/shop/product/3745-filter-kenya-muchagara-ab-filter-250g')
  assert.equal(muchagara[0].sourceBadge, 'Свіжий врожай')
  assert.deepEqual(muchagara[0].tastingNotes, ['лохина', 'гранат', 'слива'])
})

test('Penyora: similar names stay separate lots', async () => {
  const lots = await fetchPenyoraLots({ fetchImpl: fakeFetch({ [PENYORA_URL]: response(PENYORA_HTML) }) })
  const names = lots.map((lot) => lot.name)
  assert.ok(names.includes('Colombia Decaf'))
  assert.ok(names.includes('Colombia Santa Monica Decaf'))
  assert.ok(names.includes('Colombia Santa Monica'))

  const santaMonica = byName(lots, 'Colombia Santa Monica')
  assert.deepEqual(santaMonica.processNames, ['natural', 'anaerobic'])
  assert.equal(santaMonica.sourceBadge, 'Новинка')
  assert.deepEqual(byName(lots, 'Colombia Decaf').processNames, ['decaf'])
})

test('Penyora: products flagged as out of stock are unavailable', async () => {
  const lots = await fetchPenyoraLots({ fetchImpl: fakeFetch({ [PENYORA_URL]: response(PENYORA_HTML) }) })
  assert.equal(byName(lots, 'Kenya Gone').isAvailable, false)
  assert.equal(byName(lots, 'Colombia Decaf').isAvailable, true)
})

test('Penyora: a page without __NEXT_DATA__ is an error', () => {
  assert.throws(() => parsePenyoraCatalog('<html></html>'), /__NEXT_DATA__/)
})

// ---------------------------------------------------------------------------
// fetchAllNewLots
// ---------------------------------------------------------------------------

test('fetchAllNewLots returns lots from every working source', async () => {
  const routes = {
    [DAM_URL]: response(DAM_HTML),
    [FOUNDATION_LIST_API]: response({ goodscard: FOUNDATION_CARDS }),
    [PENYORA_URL]: response(PENYORA_HTML),
  }
  for (const [chpu, details] of Object.entries(FOUNDATION_DETAILS)) {
    routes[`https://foundation.ua/api/v1/goodscard/${chpu}`] = response(details)
  }

  const result = await fetchAllNewLots({ fetchImpl: fakeFetch(routes) })
  assert.deepEqual(result.errors, [])
  assert.deepEqual([...new Set(result.lots.map((lot) => lot.source))], ['dam', 'foundation', 'penyora'])
  assert.ok(result.lots.every((lot) => lot.currency === 'UAH'))
})

test('fetchAllNewLots keeps working when one source fails', async () => {
  const routes = {
    [DAM_URL]: () => { throw new Error('getaddrinfo ENOTFOUND damcoffee.com.ua') },
    [FOUNDATION_LIST_API]: response({ message: 'Server error' }, { status: 500 }),
    [PENYORA_URL]: response(PENYORA_HTML),
  }

  const result = await fetchAllNewLots({ fetchImpl: fakeFetch(routes) })
  assert.ok(result.lots.length > 0)
  assert.ok(result.lots.every((lot) => lot.source === 'penyora'))
  assert.deepEqual(result.errors, [
    { source: 'dam', message: 'getaddrinfo ENOTFOUND damcoffee.com.ua' },
    { source: 'foundation', message: `HTTP 500 for ${FOUNDATION_LIST_API}` },
  ])
})

test('fetchAllNewLots reports synchronous adapter crashes and timeouts', async () => {
  const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
  const result = await fetchAllNewLots({
    sources: [
      { source: 'dam', fetchLots: () => { throw new TypeError('boom') } },
      { source: 'foundation', fetchLots: async () => { throw timeout } },
      { source: 'penyora', fetchLots: async () => [{ source: 'penyora', name: 'Lot' }] },
    ],
  })
  assert.deepEqual(result.lots, [{ source: 'penyora', name: 'Lot' }])
  assert.deepEqual(result.errors, [
    { source: 'dam', message: 'boom' },
    { source: 'foundation', message: 'Request timed out' },
  ])
})

test('fetchAllNewLots returns only errors when every source fails', async () => {
  const result = await fetchAllNewLots({ fetchImpl: fakeFetch({}) })
  assert.deepEqual(result.lots, [])
  assert.deepEqual(result.errors.map((error) => error.source), ['dam', 'foundation', 'penyora'])
})
