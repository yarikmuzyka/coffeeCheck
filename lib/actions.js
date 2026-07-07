'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from './prisma.js'

// ---------- helpers ----------
function str(v) {
  const s = (v ?? '').toString().trim()
  return s === '' ? null : s
}
function num(v) {
  const s = (v ?? '').toString().trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
function int(v) {
  const n = num(v)
  return n == null ? null : Math.round(n)
}
function date(v) {
  const s = str(v)
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
function bool(v) {
  if (v === 'true' || v === 'on' || v === true) return true
  if (v === 'false') return false
  return null
}

// ---------- Roasters ----------
export async function createRoaster(formData) {
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
    },
  })
  revalidatePath('/roasters')
  revalidatePath('/coffees/new')
  redirect('/roasters')
}

export async function deleteRoaster(formData) {
  const id = str(formData.get('id'))
  if (id) {
    await prisma.roaster.delete({ where: { id } })
    revalidatePath('/roasters')
  }
}

// ---------- Processes (обробки кави) ----------
export async function createProcess(formData) {
  const name = str(formData.get('name'))
  if (!name) throw new Error('Назва обробки обовʼязкова')
  await prisma.process.create({ data: { name } })
  revalidatePath('/roasters')
  redirect('/roasters')
}

export async function deleteProcess(formData) {
  const id = str(formData.get('id'))
  if (id) {
    await prisma.process.delete({ where: { id } })
    revalidatePath('/roasters')
  }
}

// ---------- Coffees ----------
function coffeePayload(formData) {
  return {
    name: str(formData.get('name')),
    roasterId: str(formData.get('roasterId')),
    originCountry: str(formData.get('originCountry')),
    region: str(formData.get('region')),
    variety: str(formData.get('variety')),
    process: str(formData.get('process')),
    purchaseDate: date(formData.get('purchaseDate')),
    price: num(formData.get('price')),
    isFinished: bool(formData.get('isFinished')) ?? false,
    wouldBuyAgain: bool(formData.get('wouldBuyAgain')),
  }
}

export async function createCoffee(formData) {
  const data = coffeePayload(formData)
  if (!data.name) throw new Error('Назва кави обовʼязкова')
  if (!data.roasterId) throw new Error('Оберіть обсмажчика')
  const coffee = await prisma.coffee.create({ data })
  revalidatePath('/coffees')
  revalidatePath('/dashboard')
  redirect(`/coffees/${coffee.id}`)
}

export async function deleteCoffee(formData) {
  const id = str(formData.get('id'))
  if (id) {
    await prisma.coffee.delete({ where: { id } })
    revalidatePath('/coffees')
    revalidatePath('/dashboard')
    redirect('/coffees')
  }
}

export async function toggleWouldBuyAgain(formData) {
  const id = str(formData.get('id'))
  const value = bool(formData.get('value'))
  if (id) {
    await prisma.coffee.update({ where: { id }, data: { wouldBuyAgain: value } })
    revalidatePath(`/coffees/${id}`)
  }
}

// ---------- Brew Logs ----------
export async function createBrewLog(formData) {
  const coffeeId = str(formData.get('coffeeId'))
  const method = str(formData.get('method'))
  if (!coffeeId) throw new Error('Оберіть каву')
  if (!method) throw new Error('Оберіть метод заварювання')

  const dose = num(formData.get('doseGrams'))
  const water = num(formData.get('waterGrams'))
  const ratio =
    str(formData.get('ratio')) ??
    (dose && water ? `1:${Math.round((water / dose) * 10) / 10}` : null)

  await prisma.brewLog.create({
    data: {
      coffeeId,
      method,
      brewedAt: date(formData.get('brewedAt')) ?? new Date(),
      recipeName: str(formData.get('recipeName')),
      doseGrams: dose,
      waterGrams: water,
      ratio,
      grindSize: str(formData.get('grindSize')),
      grinder: str(formData.get('grinder')),
      waterName: str(formData.get('waterName')),
      waterTempC: num(formData.get('waterTempC')),
      brewTimeSeconds: int(formData.get('brewTimeSeconds')),
      filterType: str(formData.get('filterType')),
      brewer: str(formData.get('brewer')),
      overallScore: int(formData.get('overallScore')),
      aromaScore: int(formData.get('aromaScore')),
      acidityScore: int(formData.get('acidityScore')),
      sweetnessScore: int(formData.get('sweetnessScore')),
      bodyScore: int(formData.get('bodyScore')),
      aftertasteScore: int(formData.get('aftertasteScore')),
      balanceScore: int(formData.get('balanceScore')),
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
