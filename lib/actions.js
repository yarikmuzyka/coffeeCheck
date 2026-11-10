'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from './prisma.js'
import { requireUser } from './auth.js'
import { optionalDate, optionalNumber } from './form-values.js'
import { deleteOwnedCoffee, requireOwnedCoffee, updateOwnedCoffee } from './owned-coffees.js'
import { withCreationLimit } from './entitlements.js'
import { enforceMutationRateLimit } from './rate-limit.js'
import { parseProcessSelection, sameProcessName } from './coffee-processes.js'

// ---------- helpers ----------
function str(v) {
  const s = (v ?? '').toString().trim()
  return s === '' ? null : s
}
function bool(v) {
  if (v === 'true' || v === 'on' || v === true) return true
  if (v === 'false') return false
  return null
}

// ---------- Roasters ----------
export async function createRoaster(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const name = str(formData.get('name'))
  if (!name) throw new Error('Назва обсмажчика обовʼязкова')
  await withCreationLimit(prisma, { userId: user.id, resource: 'roasters' }, (tx) =>
    tx.roaster.create({
      data: {
        name,
        country: str(formData.get('country')),
        city: str(formData.get('city')),
        website: str(formData.get('website')),
        instagram: str(formData.get('instagram')),
        notes: str(formData.get('notes')),
        userId: user.id,
      },
    }),
  )
  revalidatePath('/roasters')
  revalidatePath('/coffees/new')
  redirect('/roasters')
}

export async function deleteRoaster(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id, { sensitive: true })
  const id = str(formData.get('id'))
  if (id) {
    await prisma.roaster.deleteMany({ where: { id, userId: user.id } })
    revalidatePath('/roasters')
  }
}

// ---------- Processes (обробки кави) ----------
export async function createProcess(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const name = str(formData.get('name'))
  if (!name) throw new Error('Назва обробки обовʼязкова')
  const existing = await prisma.process.findFirst({
    where: { userId: user.id, name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) throw new Error('Така обробка вже існує')
  await prisma.process.create({ data: { name, userId: user.id } })
  revalidatePath('/roasters')
  redirect('/roasters')
}

export async function updateProcess(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const id = str(formData.get('id'))
  const name = str(formData.get('name'))?.replace(/\s+/g, ' ')
  if (!id) throw new Error('Не вказано обробку')
  if (!name) throw new Error('Назва обробки обовʼязкова')
  const process = await prisma.process.findFirst({ where: { id, userId: user.id } })
  if (!process) throw new Error('Обробку не знайдено')
  const duplicate = await prisma.process.findFirst({
    where: { userId: user.id, id: { not: id }, name: { equals: name, mode: 'insensitive' } },
  })
  if (duplicate) throw new Error('Така обробка вже існує')
  // Кави посилаються на обробку за id, тож нова назва одразу видна всюди.
  await prisma.process.updateMany({ where: { id, userId: user.id }, data: { name } })
  revalidatePath('/roasters')
  revalidatePath('/coffees')
  revalidatePath('/analytics')
  redirect('/roasters')
}

export async function deleteProcess(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id, { sensitive: true })
  const id = str(formData.get('id'))
  if (id) {
    const process = await prisma.process.findFirst({ where: { id, userId: user.id } })
    if (!process) return
    const coffeesUsingProcess = await prisma.coffee.count({
      where: {
        userId: user.id,
        OR: [
          { processes: { some: { processId: process.id } } },
          // Кави, ще не перенесені на CoffeeProcess, посилаються на назву.
          { processes: { none: {} }, process: { equals: process.name, mode: 'insensitive' } },
        ],
      },
    })
    if (coffeesUsingProcess > 0) {
      throw new Error(`Обробку використовують ${coffeesUsingProcess} кав — спершу змініть їх`)
    }
    await prisma.process.deleteMany({ where: { id, userId: user.id } })
    revalidatePath('/roasters')
  }
}

// ---------- Coffees ----------
// Тільки поля, що редагуються формою (create/edit) — isFinished/wouldBuyAgain
// керуються окремими actions, щоб редагування не скидало їх.
function coffeePayload(formData) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    name: str(formData.get('name')),
    roasterId: str(formData.get('roasterId')),
    originCountry: str(formData.get('originCountry')),
    region: str(formData.get('region')),
    variety: str(formData.get('variety')),
    scaScore: optionalNumber(formData.get('scaScore'), 'Оцінка SCA', { min: 0, max: 100 }),
    myScore: optionalNumber(formData.get('myScore'), 'Моя оцінка', { min: 1, max: 5 }),
    purchaseDate: optionalDate(formData.get('purchaseDate'), 'Дата купівлі', { max: today }),
    price: optionalNumber(formData.get('price'), 'Ціна', { min: 0, max: 1000000 }),
  }
}

export async function createCoffee(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const data = coffeePayload(formData)
  const sourceLotId = str(formData.get('sourceLotId'))
  let sourceWish = null
  if (sourceLotId) {
    sourceWish = await prisma.wishedLot.findUnique({
      where: { userId_lotId: { userId: user.id, lotId: sourceLotId } },
      include: { lot: true },
    })
    if (!sourceWish) throw new Error('Збережений лот не знайдено')
  }
  if (!data.name) throw new Error('Назва кави обовʼязкова')
  if (!data.roasterId) throw new Error('Оберіть обсмажчика')
  const selection = parseProcessSelection(formData.getAll('processIds'))
  const typedProcessName = processNameInput(formData)
  if (selection.ids.length + selection.newNames.length === 0 && !typedProcessName) {
    throw new Error('Оберіть хоча б одну обробку')
  }

  if (data.roasterId.startsWith('external:')) {
    if (!sourceWish || data.roasterId !== `external:${sourceWish.lotId}`) throw new Error('Некоректний обсмажчик')
    const existingRoaster = await prisma.roaster.findFirst({
      where: { userId: user.id, name: { equals: sourceWish.lot.roasterName, mode: 'insensitive' } },
    })
    const roaster = existingRoaster ?? await withCreationLimit(
      prisma,
      { userId: user.id, resource: 'roasters' },
      (tx) => tx.roaster.create({
        data: {
          userId: user.id,
          name: sourceWish.lot.roasterName,
          website: sourceWish.lot.productUrl,
        },
      }),
    )
    data.roasterId = roaster.id
  }

  // Нові обробки можна створити лише з тих, що підказав збережений лот.
  const suggested = sourceWish?.lot.processNames ?? []
  if (selection.newNames.some((name) => !suggested.some((allowed) => sameProcessName(allowed, name)))) {
    throw new Error('Оберіть обробку з каталогу')
  }
  for (const name of [...selection.newNames, typedProcessName].filter(Boolean)) {
    const process = await findOrCreateProcess(user.id, name)
    if (!selection.ids.includes(process.id)) selection.ids.push(process.id)
  }

  const [processIds] = await Promise.all([
    requireOwnedProcessIds(user.id, selection.ids),
    assertRoasterExists(user.id, data.roasterId),
  ])
  const coffee = await withCreationLimit(prisma, { userId: user.id, resource: 'coffees' }, (tx) =>
    tx.coffee.create({
      data: {
        ...data,
        userId: user.id,
        processes: { create: processIds.map((processId) => ({ processId })) },
      },
    }),
  )
  if (sourceWish) {
    await prisma.wishedLot.deleteMany({ where: { userId: user.id, lotId: sourceWish.lotId } })
    revalidatePath('/new-lots')
  }
  revalidatePath('/coffees')
  revalidatePath('/dashboard')
  revalidatePath('/roasters')
  redirect(`/coffees/${coffee.id}`)
}

export async function updateCoffee(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const id = str(formData.get('id'))
  if (!id) throw new Error('Не вказано каву')
  const { roasterId, ...rest } = coffeePayload(formData)
  if (!rest.name) throw new Error('Назва кави обовʼязкова')
  if (!roasterId) throw new Error('Оберіть обсмажчика')
  const selection = parseProcessSelection(formData.getAll('processIds'))
  if (selection.newNames.length > 0) throw new Error('Оберіть обробку з каталогу')
  const typedProcessName = processNameInput(formData)
  if (selection.ids.length === 0 && !typedProcessName) throw new Error('Оберіть хоча б одну обробку')
  if (typedProcessName) {
    const process = await findOrCreateProcess(user.id, typedProcessName)
    if (!selection.ids.includes(process.id)) selection.ids.push(process.id)
  }
  const [processIds] = await Promise.all([
    requireOwnedProcessIds(user.id, selection.ids),
    assertRoasterExists(user.id, roasterId),
  ])
  await prisma.$transaction(async (tx) => {
    const result = await updateOwnedCoffee(tx, {
      id,
      userId: user.id,
      data: { ...rest, roasterId },
    })
    if (result.count === 0) throw new Error('Каву не знайдено')
    await tx.coffeeProcess.deleteMany({ where: { coffeeId: id, processId: { notIn: processIds } } })
    await tx.coffeeProcess.createMany({
      data: processIds.map((processId) => ({ coffeeId: id, processId })),
      skipDuplicates: true,
    })
  })
  revalidatePath('/analytics')
  revalidatePath('/coffees')
  revalidatePath(`/coffees/${id}`)
  revalidatePath('/dashboard')
  revalidatePath('/roasters')
  redirect(`/coffees/${id}`)
}

// Поле «+ нова» у формі кави: назва нової обробки, яку додаємо в каталог.
function processNameInput(formData) {
  const name = str(formData.get('newProcessName'))?.replace(/\s+/g, ' ') ?? null
  if (name && name.length > 60) throw new Error('Назва обробки задовга')
  return name
}

async function findOrCreateProcess(userId, name) {
  const existing = await prisma.process.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
  })
  return existing ?? prisma.process.create({ data: { userId, name } })
}

async function requireOwnedProcessIds(userId, ids) {
  const processes = await prisma.process.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  })
  if (processes.length !== ids.length) throw new Error('Оберіть обробку з каталогу')
  return ids
}

async function assertRoasterExists(userId, id) {
  const roaster = await prisma.roaster.findFirst({ where: { id, userId } })
  if (!roaster) throw new Error('Оберіть власного обсмажчика')
}

export async function deleteCoffee(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id, { sensitive: true })
  const id = str(formData.get('id'))
  if (id) {
    await deleteOwnedCoffee(prisma, { id, userId: user.id })
    revalidatePath('/coffees')
    revalidatePath('/dashboard')
    redirect('/coffees')
  }
}

export async function toggleWouldBuyAgain(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const id = str(formData.get('id'))
  const value = bool(formData.get('value'))
  if (id) {
    await updateOwnedCoffee(prisma, { id, userId: user.id, data: { wouldBuyAgain: value } })
    revalidatePath(`/coffees/${id}`)
  }
}

export async function toggleCoffeeFinished(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const id = str(formData.get('id'))
  const value = bool(formData.get('value'))
  if (!id || value == null) throw new Error('Некоректний статус кави')

  await updateOwnedCoffee(prisma, { id, userId: user.id, data: { isFinished: value } })
  revalidatePath('/coffees')
  revalidatePath(`/coffees/${id}`)
  revalidatePath('/dashboard')
}

// ---------- Brew Logs ----------
export async function createBrewLog(formData) {
  const user = await requireUser()
  await enforceMutationRateLimit(prisma, user.id)
  const coffeeId = str(formData.get('coffeeId'))
  const method = str(formData.get('method'))
  if (!coffeeId) throw new Error('Оберіть каву')
  if (!method) throw new Error('Оберіть метод заварювання')
  await requireOwnedCoffee(prisma, { id: coffeeId, userId: user.id })

  const dose = optionalNumber(formData.get('doseGrams'), 'Доза', { min: 0.1, max: 1000 })
  const water = optionalNumber(formData.get('waterGrams'), 'Кількість води', { min: 0.1, max: 10000 })
  const ratio =
    str(formData.get('ratio')) ??
    (dose && water ? `1:${Math.round((water / dose) * 10) / 10}` : null)

  await withCreationLimit(prisma, { userId: user.id, resource: 'brewLogs' }, (tx) =>
    tx.brewLog.create({
      data: {
        coffeeId,
        userId: user.id,
        method,
        brewedAt: optionalDate(formData.get('brewedAt'), 'Дата заварювання') ?? new Date(),
        recipeName: str(formData.get('recipeName')),
        doseGrams: dose,
        waterGrams: water,
        ratio,
        grindSize: str(formData.get('grindSize')),
        grinder: str(formData.get('grinder')),
        waterName: str(formData.get('waterName')),
        waterTempC: optionalNumber(formData.get('waterTempC'), 'Температура води', { min: 0, max: 100 }),
        brewTimeSeconds: optionalNumber(formData.get('brewTimeSeconds'), 'Час заварювання', { min: 1, max: 86400, integer: true }),
        filterType: str(formData.get('filterType')),
        brewer: str(formData.get('brewer')),
        overallScore: optionalNumber(formData.get('overallScore'), 'Overall', { min: 1, max: 5, integer: true }),
        aromaScore: optionalNumber(formData.get('aromaScore'), 'Aroma', { min: 1, max: 5, integer: true }),
        acidityScore: optionalNumber(formData.get('acidityScore'), 'Acidity', { min: 1, max: 5, integer: true }),
        sweetnessScore: optionalNumber(formData.get('sweetnessScore'), 'Sweetness', { min: 1, max: 5, integer: true }),
        bodyScore: optionalNumber(formData.get('bodyScore'), 'Body', { min: 1, max: 5, integer: true }),
        aftertasteScore: optionalNumber(formData.get('aftertasteScore'), 'Aftertaste', { min: 1, max: 5, integer: true }),
        balanceScore: optionalNumber(formData.get('balanceScore'), 'Balance', { min: 1, max: 5, integer: true }),
        perceivedNotes: str(formData.get('perceivedNotes')),
        defects: str(formData.get('defects')),
        notes: str(formData.get('notes')),
        wouldBrewAgain: bool(formData.get('wouldBrewAgain')),
      },
    }),
  )

  revalidatePath(`/coffees/${coffeeId}`)
  revalidatePath('/dashboard')
  redirect(`/coffees/${coffeeId}`)
}
