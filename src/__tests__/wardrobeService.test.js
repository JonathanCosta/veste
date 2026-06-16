import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import db from '../database/db'
import {
  addItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  getItemsByType,
  addCategory,
  getCategories,
  addLook,
  getLook,
  getLooks,
  updateLook,
  deleteLook,
  getLooksByItem,
  getItemsByIds,
  ITEM_TYPES,
} from '../services/wardrobeService'

describe('wardrobeService — ITEM_TYPES', () => {
  it('has 5 predefined types', () => {
    expect(ITEM_TYPES).toEqual(['top', 'bottom', 'full', 'shoes', 'accessory'])
  })
})

describe('wardrobeService — items CRUD', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
  })

  it('addItem creates item with createdAt timestamp', async () => {
    const id = await addItem({ type: 'top', description: 'Camiseta preta' })
    expect(id).toBeGreaterThan(0)
    const item = await db.items.get(id)
    expect(item.type).toBe('top')
    expect(item.description).toBe('Camiseta preta')
    expect(item.createdAt).toBeTypeOf('number')
    expect(item.createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('getItem returns item by id', async () => {
    const id = await addItem({ type: 'shoes', description: 'Tênis branco' })
    const item = await getItem(id)
    expect(item).not.toBeNull()
    expect(item.description).toBe('Tênis branco')
  })

  it('getItem returns undefined for non-existent id', async () => {
    const item = await getItem(99999)
    expect(item).toBeUndefined()
  })

  it('getItems returns items sorted by createdAt descending', async () => {
    const id1 = await addItem({ type: 'top', description: 'A' })
    const id2 = await addItem({ type: 'bottom', description: 'B' })
    const id3 = await addItem({ type: 'full', description: 'C' })
    const items = await getItems()
    expect(items).toHaveLength(3)
    // Items should be sorted newest first
    expect(items[0].id).toBe(id3)
    expect(items[1].id).toBe(id2)
    expect(items[2].id).toBe(id1)
  })

  it('updateItem patches fields', async () => {
    const id = await addItem({ type: 'top', description: 'Original' })
    await updateItem(id, { description: 'Updated' })
    const item = await getItem(id)
    expect(item.description).toBe('Updated')
    expect(item.type).toBe('top') // unchanged
  })

  it('getItemsByType returns filtered items', async () => {
    await addItem({ type: 'top', description: 'Top 1' })
    await addItem({ type: 'top', description: 'Top 2' })
    await addItem({ type: 'bottom', description: 'Bottom 1' })
    const tops = await getItemsByType('top')
    expect(tops).toHaveLength(2)
    const bottoms = await getItemsByType('bottom')
    expect(bottoms).toHaveLength(1)
    const shoes = await getItemsByType('shoes')
    expect(shoes).toHaveLength(0)
  })
})

describe('wardrobeService — categories CRUD', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    await db.categories.clear()
  })

  it('addCategory returns numeric id', async () => {
    const id = await addCategory('Casual')
    expect(id).toBeGreaterThan(0)
  })

  it('getCategories returns all categories', async () => {
    await addCategory('Casual')
    await addCategory('Festa')
    const cats = await getCategories()
    expect(cats).toHaveLength(2)
    expect(cats.map((c) => c.name)).toContain('Casual')
  })
})

describe('wardrobeService — looks CRUD', () => {
  let itemId1, itemId2, itemId3

  beforeEach(async () => {
    await db.open()
    itemId1 = await addItem({ type: 'top', description: 'Camisa' })
    itemId2 = await addItem({ type: 'bottom', description: 'Calça' })
    itemId3 = await addItem({ type: 'shoes', description: 'Tênis' })
  })

  afterEach(async () => {
    await db.looks.clear()
    await db.items.clear()
  })

  it('addLook throws if fewer than 2 items', async () => {
    await expect(addLook({ itemIds: [itemId1] })).rejects.toThrow(/at least 2 items/i)
    await expect(addLook({ itemIds: [] })).rejects.toThrow(/at least 2 items/i)
    await expect(addLook({ itemIds: null })).rejects.toThrow(/at least 2 items/i)
  })

  it('addLook succeeds with 2+ items and timestamps', async () => {
    const id = await addLook({
      description: 'Look teste',
      itemIds: [itemId1, itemId2],
    })
    expect(id).toBeGreaterThan(0)
    const look = await db.looks.get(id)
    expect(look.description).toBe('Look teste')
    expect(look.itemIds).toEqual([itemId1, itemId2])
    expect(look.createdAt).toBeTypeOf('number')
  })

  it('getLook returns by id', async () => {
    const id = await addLook({
      description: 'Look',
      itemIds: [itemId1, itemId2],
    })
    const look = await getLook(id)
    expect(look.id).toBe(id)
  })

  it('getLooks returns sorted by createdAt descending', async () => {
    const id1 = await addLook({ description: 'A', itemIds: [itemId1, itemId2] })
    const id2 = await addLook({ description: 'B', itemIds: [itemId1, itemId3] })
    const looks = await getLooks()
    expect(looks).toHaveLength(2)
    expect(looks[0].id).toBe(id2)
    expect(looks[1].id).toBe(id1)
  })

  it('updateLook patches fields', async () => {
    const id = await addLook({
      description: 'Original',
      itemIds: [itemId1, itemId2],
    })
    await updateLook(id, { description: 'Changed' })
    const look = await getLook(id)
    expect(look.description).toBe('Changed')
  })

  it('deleteLook removes look', async () => {
    const id = await addLook({
      description: 'To delete',
      itemIds: [itemId1, itemId2],
    })
    await deleteLook(id)
    const look = await getLook(id)
    expect(look).toBeUndefined()
  })
})

describe('wardrobeService — cascade delete', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    await db.looks.clear()
    await db.items.clear()
  })

  it('deleteItem removes item from 3-item look (keeps 2+)', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    const i3 = await addItem({ type: 'shoes', description: 'C' })
    const lookId = await addLook({
      description: 'Look 3 itens',
      itemIds: [i1, i2, i3],
    })

    await deleteItem(i1)

    // Look should still exist with 2 items
    const look = await getLook(lookId)
    expect(look).toBeDefined()
    expect(look.itemIds).toEqual([i2, i3])
  })

  it('deleteItem removes look when dropping to <2 items', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    const lookId = await addLook({
      description: 'Look 2 itens',
      itemIds: [i1, i2],
    })

    await deleteItem(i1)

    // Look should be deleted entirely
    const look = await getLook(lookId)
    expect(look).toBeUndefined()
  })

  it('deleteItem deletes multiple looks if needed', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    const i3 = await addItem({ type: 'shoes', description: 'C' })
    const look1 = await addLook({ itemIds: [i1, i2] })
    const look2 = await addLook({ itemIds: [i1, i3] })

    await deleteItem(i1)

    // Both looks had only 2 items each, so both should be deleted
    expect(await getLook(look1)).toBeUndefined()
    expect(await getLook(look2)).toBeUndefined()
    // Items i2 and i3 should still exist
    expect(await getItem(i2)).toBeDefined()
    expect(await getItem(i3)).toBeDefined()
  })

  it('deleteItem also does not affect looks that do not contain the item', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    const i3 = await addItem({ type: 'shoes', description: 'C' })
    const lookId = await addLook({ itemIds: [i2, i3] })

    await deleteItem(i1)

    // Look with i2,i3 should remain untouched
    const look = await getLook(lookId)
    expect(look).toBeDefined()
  })
})

describe('wardrobeService — queries', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    await db.looks.clear()
    await db.items.clear()
  })

  it('getLooksByItem returns looks containing specific item', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    const i3 = await addItem({ type: 'shoes', description: 'C' })
    await addLook({ description: 'Look AB', itemIds: [i1, i2] })
    await addLook({ description: 'Look AC', itemIds: [i1, i3] })
    await addLook({ description: 'Look BC', itemIds: [i2, i3] })

    const looksWithI1 = await getLooksByItem(i1)
    expect(looksWithI1).toHaveLength(2)
    expect(looksWithI1.map((l) => l.description)).toContain('Look AB')
    expect(looksWithI1.map((l) => l.description)).toContain('Look AC')
  })

  it('getItemsByIds returns items matching anyOf', async () => {
    const i1 = await addItem({ type: 'top', description: 'A' })
    const i2 = await addItem({ type: 'bottom', description: 'B' })
    await addItem({ type: 'shoes', description: 'C' })

    const selected = await getItemsByIds([i1, i2])
    expect(selected).toHaveLength(2)
    expect(selected.map((i) => i.id)).toContain(i1)
    expect(selected.map((i) => i.id)).toContain(i2)
  })

  it('getItemsByIds returns empty array for empty input', async () => {
    const result = await getItemsByIds([])
    expect(result).toEqual([])
  })
})
