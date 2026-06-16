import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import db from '../database/db'
import { addItem, addLook } from '../services/wardrobeService'
import { useItems } from '../composables/useItems'
import { useLooks } from '../composables/useLooks'

describe('useItems composable', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    await db.items.clear()
    await db.looks.clear()
  })

  it('returns reactive refs with initial values', () => {
    const { items, loading } = useItems()
    expect(items.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('exposes service functions', () => {
    const comp = useItems()
    expect(comp.getItem).toBeTypeOf('function')
    expect(comp.addItem).toBeTypeOf('function')
    expect(comp.updateItem).toBeTypeOf('function')
    expect(comp.deleteItem).toBeTypeOf('function')
    expect(comp.getItemsByType).toBeTypeOf('function')
    expect(comp.getCategories).toBeTypeOf('function')
    expect(comp.addCategory).toBeTypeOf('function')
  })

  it('loadItems populates items ref sorted by createdAt desc', async () => {
    // Manually control createdAt for ordering
    await addItem({ type: 'top', description: 'Old', createdAt: 100 })
    await addItem({ type: 'bottom', description: 'New', createdAt: 200 })

    const { items, loading, loadItems } = useItems()
    expect(loading.value).toBe(false)
    expect(items.value).toHaveLength(0)

    await loadItems()

    expect(loading.value).toBe(false)
    expect(items.value).toHaveLength(2)
    // Newest first
    expect(items.value[0].description).toBe('New')
    expect(items.value[1].description).toBe('Old')
  })

  it('loadItems handles errors gracefully (items becomes [])', async () => {
    // Temporarily break the db.items store by deleting the table
    const origItems = db.items
    // @ts-expect-error - force error by removing the table
    delete db.items

    const { items, loading, loadItems } = useItems()
    await loadItems()

    expect(loading.value).toBe(false)
    expect(items.value).toEqual([])

    // Restore
    db.items = origItems
  })
})

describe('useLooks composable', () => {
  let i1, i2

  beforeEach(async () => {
    await db.open()
    i1 = await addItem({ type: 'top', description: 'A' })
    i2 = await addItem({ type: 'bottom', description: 'B' })
  })

  afterEach(async () => {
    await db.looks.clear()
    await db.items.clear()
  })

  it('returns reactive refs with initial values', () => {
    const { looks, loading } = useLooks()
    expect(looks.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('exposes service functions', () => {
    const comp = useLooks()
    expect(comp.getLook).toBeTypeOf('function')
    expect(comp.addLook).toBeTypeOf('function')
    expect(comp.updateLook).toBeTypeOf('function')
    expect(comp.deleteLook).toBeTypeOf('function')
    expect(comp.getLooksByItem).toBeTypeOf('function')
    expect(comp.getItemsByIds).toBeTypeOf('function')
  })

  it('loadLooks populates looks ref', async () => {
    await addLook({ description: 'Look 1', itemIds: [i1, i2] })
    await addLook({ description: 'Look 2', itemIds: [i1, i2] })

    const { looks, loading, loadLooks } = useLooks()
    await loadLooks()

    expect(loading.value).toBe(false)
    expect(looks.value).toHaveLength(2)
  })
})
