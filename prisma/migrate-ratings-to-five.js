const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  if (process.env.CONFIRM_RATING_SCALE_MIGRATION !== '5') {
    throw new Error('Set CONFIRM_RATING_SCALE_MIGRATION=5 to run this one-time migration.')
  }

  const [coffeeMax, brewMaxRows] = await Promise.all([
    prisma.coffee.aggregate({ _max: { myScore: true } }),
    prisma.$queryRaw`
      SELECT GREATEST(
        MAX("overallScore"), MAX("aromaScore"), MAX("acidityScore"),
        MAX("sweetnessScore"), MAX("bodyScore"), MAX("aftertasteScore"),
        MAX("balanceScore")
      ) AS "maxScore"
      FROM "BrewLog"
    `,
  ])

  const maxScore = Math.max(coffeeMax._max.myScore ?? 0, Number(brewMaxRows[0]?.maxScore ?? 0))
  if (maxScore <= 5) {
    console.log('Ratings already use the 5-point scale. No changes made.')
    return
  }

  const [coffees, brewLogs] = await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Coffee"
      SET "myScore" = "myScore" / 2.0
      WHERE "myScore" IS NOT NULL
    `,
    prisma.$executeRaw`
      UPDATE "BrewLog"
      SET
        "overallScore" = ROUND("overallScore" / 2.0),
        "aromaScore" = ROUND("aromaScore" / 2.0),
        "acidityScore" = ROUND("acidityScore" / 2.0),
        "sweetnessScore" = ROUND("sweetnessScore" / 2.0),
        "bodyScore" = ROUND("bodyScore" / 2.0),
        "aftertasteScore" = ROUND("aftertasteScore" / 2.0),
        "balanceScore" = ROUND("balanceScore" / 2.0)
      WHERE GREATEST(
        COALESCE("overallScore", 0), COALESCE("aromaScore", 0),
        COALESCE("acidityScore", 0), COALESCE("sweetnessScore", 0),
        COALESCE("bodyScore", 0), COALESCE("aftertasteScore", 0),
        COALESCE("balanceScore", 0)
      ) > 0
    `,
  ])

  console.log(`Migrated ${coffees} coffees and ${brewLogs} brew logs to the 5-point scale.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
