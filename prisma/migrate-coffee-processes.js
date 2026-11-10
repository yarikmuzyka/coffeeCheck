// One-time migration: links every coffee to its processing method through
// CoffeeProcess, using the legacy text field Coffee.process.
//
//   node prisma/migrate-coffee-processes.js            # dry run, prints the plan
//   node prisma/migrate-coffee-processes.js --apply    # writes the links
//
// Safe to re-run: coffees that already have linked processes are skipped.
// Nothing is deleted and Coffee.process is left untouched as a backup.
// Explicit combinations separated with commas, slashes, plus signs and words
// such as "та" / "and" become separate processing methods. Names without an
// explicit separator (for example "natural thermal shock") remain intact.
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function sameName(a, b) {
  return a.localeCompare(b, 'uk', { sensitivity: 'accent' }) === 0
}

function processNames(value) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const names = normalized
    .split(/\s*(?:[,;/+&|]|\s(?:та|і|й|and)\s)\s*/i)
    .map((name) => name.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return names.filter((name, index) => names.findIndex((other) => sameName(other, name)) === index)
}

async function main() {
  const coffees = await prisma.coffee.findMany({
    where: { process: { not: null }, processes: { none: {} } },
    select: { id: true, name: true, userId: true, process: true },
  })
  const processes = await prisma.process.findMany({ select: { id: true, name: true, userId: true } })

  const plan = []
  const toCreate = []
  for (const coffee of coffees) {
    for (const name of processNames(coffee.process)) {
      let target = processes.find((p) => p.userId === coffee.userId && sameName(p.name, name))
        ?? toCreate.find((p) => p.userId === coffee.userId && sameName(p.name, name))
      if (!target) {
        target = { userId: coffee.userId, name, isNew: true }
        toCreate.push(target)
      }
      plan.push({ coffee, target })
    }
  }

  console.log(`Coffees to link: ${plan.length}`)
  console.log(`Processes to create: ${toCreate.length}${toCreate.length ? ` (${toCreate.map((p) => p.name).join(', ')})` : ''}`)
  for (const { coffee, target } of plan) {
    console.log(`  ${coffee.name} → ${target.name}${target.isNew ? ' (new)' : ''}`)
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write the changes.')
    return
  }

  const linked = await prisma.$transaction(async (tx) => {
    for (const process of toCreate) {
      const created = await tx.process.create({ data: { userId: process.userId, name: process.name } })
      process.id = created.id
    }
    const result = await tx.coffeeProcess.createMany({
      data: plan.map(({ coffee, target }) => ({ coffeeId: coffee.id, processId: target.id })),
      skipDuplicates: true,
    })
    return result.count
  }, { maxWait: 10_000, timeout: 45_000 })

  console.log(`\nDone: ${linked} links created, ${toCreate.length} processes created.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
