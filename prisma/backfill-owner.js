const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase()
  if (!email) throw new Error('Set OWNER_EMAIL to the Google account that already signed in')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error(`User ${email} does not exist. Sign in through Google once, then rerun this command.`)
  }

  const [processes, roasters, coffees, brewLogs] = await prisma.$transaction([
    prisma.process.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.roaster.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.coffee.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.brewLog.updateMany({ where: { userId: null }, data: { userId: user.id } }),
  ])

  console.log(`Claimed legacy data for ${email}:`)
  console.log(`  processes: ${processes.count}`)
  console.log(`  roasters: ${roasters.count}`)
  console.log(`  coffees: ${coffees.count}`)
  console.log(`  brew logs: ${brewLogs.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
