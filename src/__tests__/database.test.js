import { describe, it, expect, beforeAll } from 'vitest'
import db from '../database/db'

describe('VesteDB schema', () => {
  beforeAll(async () => {
    await db.open()
  })

  it('has version 2', () => {
    const v = db.verno ?? db._verno ?? 1
    expect(v).toBe(2)
  })

  it('has items store with correct indexes', () => {
    const table = db.table('items')
    expect(table).toBeDefined()
    expect(table.schema.primKey.keyPath).toBe('id')
    const idxNames = table.schema.indexes.map((i) => i.name)
    expect(idxNames).toContain('type')
    expect(idxNames).toContain('categoryId')
    expect(idxNames).toContain('description')
    expect(idxNames).toContain('createdAt')
  })

  it('has categories store', () => {
    const table = db.table('categories')
    expect(table).toBeDefined()
    expect(table.schema.primKey.keyPath).toBe('id')
  })

  it('has looks store with multi-entry itemIds index', () => {
    const table = db.table('looks')
    expect(table).toBeDefined()
    expect(table.schema.primKey.keyPath).toBe('id')
    const idxNames = table.schema.indexes.map((i) => i.name)
    expect(idxNames).toContain('itemIds')
    expect(idxNames).toContain('createdAt')
    // Verify itemIds is multi-entry
    const itemIdsIdx = table.schema.indexes.find((i) => i.name === 'itemIds')
    expect(itemIdsIdx.multi).toBe(true)
  })

  it('stores and retrieves an item', async () => {
    const id = await db.items.add({
      type: 'top',
      description: 'Camiseta azul',
      createdAt: Date.now(),
    })
    const item = await db.items.get(id)
    expect(item).toBeDefined()
    expect(item.type).toBe('top')
    expect(item.description).toBe('Camiseta azul')
  })

  it('stores and retrieves a category', async () => {
    const id = await db.categories.add({ name: 'Casual' })
    const cat = await db.categories.get(id)
    expect(cat.name).toBe('Casual')
  })

  it('stores and queries looks by itemIds (multi-entry)', async () => {
    const lookId = await db.looks.add({
      description: 'Look teste',
      itemIds: [1, 2, 3],
      createdAt: Date.now(),
    })
    // Query by individual itemId — multi-entry index
    const results = await db.looks.where('itemIds').equals(2).toArray()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(lookId)
  })
})
