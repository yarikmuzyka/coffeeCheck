const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ROASTERS = [
  { name: 'Foundation Coffee Roasters', country: 'Ukraine', city: 'Kyiv' },
  { name: 'Mad Heads', country: 'Ukraine', city: 'Kyiv' },
  { name: 'Idealist', country: 'Ukraine', city: 'Kyiv' },
  { name: '25 Coffee Roasters', country: 'Ukraine', city: 'Lviv' },
  { name: 'Funt Coffee', country: 'Ukraine', city: 'Dnipro' },
  { name: 'Black Honey', country: 'Ukraine', city: 'Kyiv' },
  { name: 'Chehovych Roastery', country: 'Ukraine', city: 'Lviv' },
  { name: 'Світ Кави', country: 'Ukraine', city: 'Lviv' },
  { name: 'Bacara', country: 'Ukraine', city: 'Kyiv' },
  { name: 'Pilli', country: 'Ukraine', city: 'Kyiv' },
]

async function main() {
  console.log('Seeding roasters…')
  const roasters = {}
  for (const r of ROASTERS) {
    const created = await prisma.roaster.create({ data: r })
    roasters[r.name] = created
  }

  console.log('Seeding sample coffees + brew logs…')

  const eth = await prisma.coffee.create({
    data: {
      name: 'Ethiopia Yirgacheffe Konga',
      roasterId: roasters['Foundation Coffee Roasters'].id,
      originCountry: 'Ethiopia',
      region: 'Yirgacheffe',
      variety: 'Heirloom',
      process: 'washed',
      roastLevel: 'light',
      roastDate: new Date('2026-06-15'),
      purchaseDate: new Date('2026-06-18'),
      price: 420,
      weightGrams: 250,
      pricePer100g: 168,
      declaredNotes: 'jasmine, bergamot, lemon',
      productUrl: '',
      isFinished: false,
      wouldBuyAgain: true,
    },
  })

  const col = await prisma.coffee.create({
    data: {
      name: 'Colombia El Paraiso Pink Bourbon',
      roasterId: roasters['Mad Heads'].id,
      originCountry: 'Colombia',
      region: 'Cauca',
      variety: 'Pink Bourbon',
      process: 'anaerobic',
      roastLevel: 'medium-light',
      roastDate: new Date('2026-05-20'),
      purchaseDate: new Date('2026-05-25'),
      price: 560,
      weightGrams: 250,
      pricePer100g: 224,
      declaredNotes: 'strawberry, wine, tropical',
      isFinished: true,
      wouldBuyAgain: true,
    },
  })

  const ken = await prisma.coffee.create({
    data: {
      name: 'Kenya Nyeri AA',
      roasterId: roasters['25 Coffee Roasters'].id,
      originCountry: 'Kenya',
      region: 'Nyeri',
      variety: 'SL28',
      process: 'washed',
      roastLevel: 'medium',
      roastDate: new Date('2026-06-01'),
      purchaseDate: new Date('2026-06-05'),
      price: 480,
      weightGrams: 250,
      pricePer100g: 192,
      declaredNotes: 'blackcurrant, tomato, grapefruit',
      isFinished: false,
      wouldBuyAgain: false,
    },
  })

  await prisma.brewLog.createMany({
    data: [
      {
        coffeeId: eth.id,
        brewedAt: new Date('2026-06-19'),
        method: 'V60',
        recipeName: 'Tetsu 4:6',
        doseGrams: 15,
        waterGrams: 250,
        ratio: '1:16.7',
        grindSize: 'medium-fine',
        grinder: 'Comandante C40',
        waterTempC: 94,
        brewTimeSeconds: 165,
        filterType: 'Hario tabbed',
        brewer: 'Hario V60 02',
        overallScore: 9,
        aromaScore: 9,
        acidityScore: 9,
        sweetnessScore: 8,
        bodyScore: 7,
        aftertasteScore: 8,
        balanceScore: 9,
        perceivedNotes: 'jasmine, lemon zest, black tea',
        wouldBrewAgain: true,
      },
      {
        coffeeId: col.id,
        brewedAt: new Date('2026-05-26'),
        method: 'AeroPress',
        recipeName: 'Inverted',
        doseGrams: 16,
        waterGrams: 240,
        ratio: '1:15',
        grindSize: 'medium',
        waterTempC: 90,
        brewTimeSeconds: 120,
        overallScore: 8,
        aromaScore: 9,
        acidityScore: 7,
        sweetnessScore: 9,
        bodyScore: 8,
        aftertasteScore: 8,
        balanceScore: 8,
        perceivedNotes: 'strawberry, red wine',
        wouldBrewAgain: true,
      },
      {
        coffeeId: ken.id,
        brewedAt: new Date('2026-06-06'),
        method: 'V60',
        recipeName: '4:6 high extraction',
        doseGrams: 15,
        waterGrams: 250,
        ratio: '1:16.7',
        grindSize: 'medium',
        waterTempC: 96,
        brewTimeSeconds: 180,
        overallScore: 6,
        aromaScore: 7,
        acidityScore: 8,
        sweetnessScore: 5,
        bodyScore: 6,
        aftertasteScore: 6,
        balanceScore: 6,
        perceivedNotes: 'blackcurrant, savory, sharp',
        defects: 'trochy надмірна екстракція',
        wouldBrewAgain: false,
      },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
