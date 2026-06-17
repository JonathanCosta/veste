import db from '../database/db'

export const ITEM_TYPES = ['top', 'bottom', 'full', 'shoes', 'accessory']

export async function addItem(item) {
  const id = await db.items.add({
    ...item,
    createdAt: Date.now(),
  })
  return id
}

export async function updateItem(id, changes) {
  await db.items.update(id, changes)
}

export async function deleteItem(id) {
  const looksWithItem = await db.looks.where('itemIds').equals(id).toArray()
  for (const look of looksWithItem) {
    const newItemIds = look.itemIds.filter((iid) => iid !== id)
    if (newItemIds.length >= 2) {
      await db.looks.update(look.id, { itemIds: newItemIds })
    } else {
      await db.looks.delete(look.id)
    }
  }
  // Cascade: remove calendar logs referencing this item
  await db.calendar_logs.where({ entityType: 'item', entityId: id }).delete()
  await db.items.delete(id)
}

/**
 * Get all items ordered by creation date (newest first).
 * NOTA: Carrega todos os itens na memória. Para >500 itens,
 * considere implementar paginação via cursor do IndexedDB.
 */
export async function getItems() {
  return db.items.reverse().sortBy('createdAt')
}

export async function getItem(id) {
  return db.items.get(id)
}

export async function getItemsByType(type) {
  return db.items.where('type').equals(type).toArray()
}

export async function addCategory(name) {
  const id = await db.categories.add({ name })
  return id
}

export async function getCategories() {
  return db.categories.toArray()
}

export async function addLook(look) {
  if (!look.itemIds || look.itemIds.length < 2) {
    throw new Error('Look must have at least 2 items')
  }
  const id = await db.looks.add({
    ...look,
    createdAt: Date.now(),
  })
  return id
}

export async function updateLook(id, changes) {
  await db.looks.update(id, changes)
}

export async function saveLookPhoto(lookId, blob) {
  await db.looks.update(lookId, { imageBlob: blob })
}

export async function deleteLook(id) {
  // Cascade: remove calendar logs referencing this look
  await db.calendar_logs.where({ entityType: 'look', entityId: id }).delete()
  await db.looks.delete(id)
}

export async function getLooks() {
  return db.looks.reverse().sortBy('createdAt')
}

export async function getLook(id) {
  return db.looks.get(id)
}

export async function getLooksByItem(itemId) {
  return db.looks.where('itemIds').equals(itemId).toArray()
}

export async function getItemsByIds(ids) {
  if (!ids.length) return []
  return db.items.where('id').anyOf(ids).toArray()
}
