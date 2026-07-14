'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from './prisma.js'
import { requireUser } from './auth.js'
import { optionalDate, optionalNumber } from './form-values.js'

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
  const name = str(formData.get('name'))
  if (!name) throw new Error('Назва обсмажчика обовʼязкова')
  await prisma.roaster.create({
    data: {
      name,
      country: str(formData.get('country')),
      city: str(formData.get('city')),
      website: str(formData.get('website')),
      instagram: str(formData.get('instagram')),
      notes: str(formData.get('notes')),
      userId: user.id,
    },
  })
  revalidatePath('/roasters')
  revalidatePath('/coffees/new')
  redirect('/roasters')
}

export async function deleteRoaster(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  if (id) {
    await prisma.roaster.deleteMany({ where: { id, userId: user.id } })
    revalidatePath('/roasters')
  }
}

// ---------- Processes (обробки кави) ----------
export async function createProcess(formData) {
  const user = await requireUser()
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

export async function deleteProcess(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  if (id) {
    const process = await prisma.process.findFirst({ where: { id, userId: user.id } })
    if (!process) return
    const coffeesUsingProcess = await prisma.coffee.count({
      where: { userId: user.id, process: { equals: process.name, mode: 'insensitive' } },
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
  return {
    name: str(formData.get('name')),
    roasterId: str(formData.get('roasterId')),
    originCountry: str(formData.get('originCountry')),
    region: str(formData.get('region')),
    variety: str(formData.get('variety')),
    process: str(formData.get('process')),
    scaScore: optionalNumber(formData.get('scaScore'), 'Оцінка SCA', { min: 0, max: 100 }),
    myScore: optionalNumber(formData.get('myScore'), 'Моя оцінка', { min: 0, max: 10 }),
    purchaseDate: optionalDate(formData.get('purchaseDate'), 'Дата купівлі'),
    price: optionalNumber(formData.get('price'), 'Ціна', { min: 0, max: 1000000 }),
  }
}

export async function createCoffee(formData) {
  const user = await requireUser()
  const data = coffeePayload(formData)
  if (!data.name) throw new Error('Назва кави обовʼязкова')
  if (!data.roasterId) throw new Error('Оберіть обсмажчика')
  if (!data.process) throw new Error('Оберіть обробку')
  await Promise.all([
    assertProcessExists(user.id, data.process),
    assertRoasterExists(user.id, data.roasterId),
  ])
  const coffee = await prisma.coffee.create({ data: { ...data, userId: user.id } })
  revalidatePath('/coffees')
  revalidatePath('/dashboard')
  redirect(`/coffees/${coffee.id}`)
}

export async function updateCoffee(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  if (!id) throw new Error('Не вказано каву')
  const { roasterId, ...rest } = coffeePayload(formData)
  if (!rest.name) throw new Error('Назва кави обовʼязкова')
  if (!roasterId) throw new Error('Оберіть обсмажчика')
  if (!rest.process) throw new Error('Оберіть обробку')
  await Promise.all([
    assertProcessExists(user.id, rest.process),
    assertRoasterExists(user.id, roasterId),
  ])
  const result = await prisma.coffee.updateMany({
    where: { id, userId: user.id },
    data: { ...rest, roasterId },
  })
  if (result.count === 0) throw new Error('Каву не знайдено')
  revalidatePath('/coffees')
  revalidatePath(`/coffees/${id}`)
  revalidatePath('/dashboard')
  redirect(`/coffees/${id}`)
}

async function assertProcessExists(userId, name) {
  const process = await prisma.process.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
  })
  if (!process) throw new Error('Оберіть обробку з каталогу')
}

async function assertRoasterExists(userId, id) {
  const roaster = await prisma.roaster.findFirst({ where: { id, userId } })
  if (!roaster) throw new Error('Оберіть власного обсмажчика')
}

export async function deleteCoffee(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  if (id) {
    await prisma.coffee.deleteMany({ where: { id, userId: user.id } })
    revalidatePath('/coffees')
    revalidatePath('/dashboard')
    redirect('/coffees')
  }
}

export async function toggleWouldBuyAgain(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  const value = bool(formData.get('value'))
  if (id) {
    await prisma.coffee.updateMany({ where: { id, userId: user.id }, data: { wouldBuyAgain: value } })
    revalidatePath(`/coffees/${id}`)
  }
}

export async function toggleCoffeeFinished(formData) {
  const user = await requireUser()
  const id = str(formData.get('id'))
  const value = bool(formData.get('value'))
  if (!id || value == null) throw new Error('Некоректний статус кави')

  await prisma.coffee.updateMany({ where: { id, userId: user.id }, data: { isFinished: value } })
  revalidatePath('/coffees')
  revalidatePath(`/coffees/${id}`)
  revalidatePath('/dashboard')
}

// ---------- Brew Logs ----------
export async function createBrewLog(formData) {
  const user = await requireUser()
  const coffeeId = str(formData.get('coffeeId'))
  const method = str(formData.get('method'))
  if (!coffeeId) throw new Error('Оберіть каву')
  if (!method) throw new Error('Оберіть метод заварювання')
  const coffee = await prisma.coffee.findFirst({ where: { id: coffeeId, userId: user.id } })
  if (!coffee) throw new Error('Каву не знайдено')

  const dose = optionalNumber(formData.get('doseGrams'), 'Доза', { min: 0.1, max: 1000 })
  const water = optionalNumber(formData.get('waterGrams'), 'Кількість води', { min: 0.1, max: 10000 })
  const ratio =
    str(formData.get('ratio')) ??
    (dose && water ? `1:${Math.round((water / dose) * 10) / 10}` : null)

  await prisma.brewLog.create({
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
      overallScore: optionalNumber(formData.get('overallScore'), 'Overall', { min: 1, max: 10, integer: true }),
      aromaScore: optionalNumber(formData.get('aromaScore'), 'Aroma', { min: 1, max: 10, integer: true }),
      acidityScore: optionalNumber(formData.get('acidityScore'), 'Acidity', { min: 1, max: 10, integer: true }),
      sweetnessScore: optionalNumber(formData.get('sweetnessScore'), 'Sweetness', { min: 1, max: 10, integer: true }),
      bodyScore: optionalNumber(formData.get('bodyScore'), 'Body', { min: 1, max: 10, integer: true }),
      aftertasteScore: optionalNumber(formData.get('aftertasteScore'), 'Aftertaste', { min: 1, max: 10, integer: true }),
      balanceScore: optionalNumber(formData.get('balanceScore'), 'Balance', { min: 1, max: 10, integer: true }),
      perceivedNotes: str(formData.get('perceivedNotes')),
      defects: str(formData.get('defects')),
      notes: str(formData.get('notes')),
      wouldBrewAgain: bool(formData.get('wouldBrewAgain')),
    },
  })

  revalidatePath(`/coffees/${coffeeId}`)
  revalidatePath('/dashboard')
  redirect(`/coffees/${coffeeId}`)
}
