export async function findOwnedCoffee(db, { id, userId, include }) {
  return db.coffee.findFirst({
    where: { id, userId },
    ...(include ? { include } : {}),
  })
}

export async function requireOwnedCoffee(db, { id, userId }) {
  const coffee = await findOwnedCoffee(db, { id, userId })
  if (!coffee) throw new Error('Каву не знайдено')
  return coffee
}

export function updateOwnedCoffee(db, { id, userId, data }) {
  return db.coffee.updateMany({ where: { id, userId }, data })
}

export function deleteOwnedCoffee(db, { id, userId }) {
  return db.coffee.deleteMany({ where: { id, userId } })
}
