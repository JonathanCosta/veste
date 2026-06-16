import { describe, it, expect } from 'vitest'

describe('Smoke tests - module imports', () => {
  it('database module loads', async () => {
    const db = await import('../database/db.js')
    expect(db.default).toBeDefined()
    expect(db.default.version).toBeDefined()
  })

  it('imageService loads', async () => {
    const mod = await import('../services/imageService.js')
    expect(mod.compressImage).toBeTypeOf('function')
  })

  it('wardrobeService loads and has CRUD + ITEM_TYPES', async () => {
    const mod = await import('../services/wardrobeService.js')
    expect(mod.addItem).toBeTypeOf('function')
    expect(mod.getItem).toBeTypeOf('function')
    expect(mod.getItems).toBeTypeOf('function')
    expect(mod.updateItem).toBeTypeOf('function')
    expect(mod.deleteItem).toBeTypeOf('function')
    expect(mod.addLook).toBeTypeOf('function')
    expect(mod.getLooks).toBeTypeOf('function')
    expect(mod.ITEM_TYPES).toHaveLength(5)
  })

  it('backupService loads', async () => {
    const mod = await import('../services/backupService.js')
    expect(mod.exportBackup).toBeTypeOf('function')
    expect(mod.importBackup).toBeTypeOf('function')
  })

  it('router has 4 routes', async () => {
    const mod = await import('../router/index.js')
    expect(mod.default).toBeDefined()
    expect(mod.default.getRoutes().length).toBe(4)
  })

  it('composables load', async () => {
    const items = await import('../composables/useItems.js')
    const looks = await import('../composables/useLooks.js')
    expect(items.useItems).toBeTypeOf('function')
    expect(looks.useLooks).toBeTypeOf('function')
  })
})
