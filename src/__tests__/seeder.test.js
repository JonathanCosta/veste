import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import db from '../database/db'
import { seedMockWardrobe } from '../utils/seeder'

describe('seedMockWardrobe', () => {
  beforeEach(async () => {
    await db.open()
    await db.items.clear()
  })

  afterEach(async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
  })

  it('seeds items without imageBlob property', async () => {
    const count = await seedMockWardrobe(5)

    expect(count).toBe(5)

    const items = await db.items.toArray()
    expect(items).toHaveLength(5)

    for (const item of items) {
      expect(item.imageBlob).toBeUndefined()
    }
  })

  it('creates items with correct types and descriptions', async () => {
    await seedMockWardrobe(10)

    const items = await db.items.toArray()
    expect(items).toHaveLength(10)

    // Verify types cycle through SAMPLE_TYPES
    // i starts at 1 in seeder, so first item gets SAMPLE_TYPES[1] = 'bottom'
    const types = items.map((i) => i.type)
    expect(types[0]).toBe('bottom')
    expect(types[1]).toBe('full')
    expect(types[2]).toBe('shoes')
    expect(types[3]).toBe('accessory')
    expect(types[4]).toBe('top')
    expect(types[5]).toBe('bottom') // wraps around

    // i starts at 1 in seeder, so first item gets SAMPLE_DESCRIPTIONS[1] = 'Calça jeans azul'
    expect(items[0].description).toContain('Calça jeans azul')
    expect(items[1].description).toContain('Tênis casual preto')
  })

  it('respects onProgress callback', async () => {
    const progressCalls = []
    const onProgress = (phase, current, total) => {
      progressCalls.push({ phase, current, total })
    }

    await seedMockWardrobe(120, { onProgress })

    // Should have been called at 50, 100 (every 50 items)
    expect(progressCalls.length).toBeGreaterThanOrEqual(2)
    expect(progressCalls[0]).toEqual({ phase: 'items', current: 50, total: 120 })
    expect(progressCalls[1]).toEqual({ phase: 'items', current: 100, total: 120 })
  })

  it('inserts items with sequential createdAt timestamps', async () => {
    await seedMockWardrobe(5)

    const items = await db.items.orderBy('createdAt').toArray()
    expect(items).toHaveLength(5)

    // createdAt should be descending (i * 60000 subtracted)
    for (let i = 1; i < items.length; i++) {
      expect(items[i].createdAt).toBeGreaterThan(items[i - 1].createdAt)
    }
  })

  it('handles quantity of 0 gracefully', async () => {
    const count = await seedMockWardrobe(0)
    expect(count).toBe(0)

    const items = await db.items.toArray()
    expect(items).toHaveLength(0)
  })
})
