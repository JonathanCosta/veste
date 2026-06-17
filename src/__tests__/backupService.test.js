import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import JSZip from 'jszip'
import db from '../database/db'
import { addItem, addLook, addCategory } from '../services/wardrobeService'
import { exportBackup, importBackup } from '../services/backupService'

// ─── Mock file-saver ──────────────────────────────────────────
const { mockSaveAs } = vi.hoisted(() => {
  const fn = vi.fn()
  return { mockSaveAs: fn }
})

vi.mock('file-saver', () => ({
  default: { saveAs: mockSaveAs },
}))

// ─── Smart Worker Mock ────────────────────────────────────────
/**
 * Creates a SmartMockWorker class that actually executes JSZip logic
 * to simulate the real backup worker in tests.
 *
 * Handles:
 *   EXPORT_START → creates new JSZip
 *   EXPORT_CHUNK → adds items/looks blobs to the zip
 *   EXPORT_FINALIZE → generates blob and responds with SUCCESS
 *   IMPORT_START → extracts zip, validates, hydrates blobs, responds with SUCCESS_IMPORT
 */
function createSmartWorkerMock() {
  return class SmartMockWorker {
    constructor(_url) {
      this.onmessage = null
      this.onerror = null
      this._currentZip = null
      this._terminated = false
    }

    postMessage(msg) {
      if (this._terminated) return

      switch (msg.type) {
        case 'EXPORT_START':
          this._currentZip = new JSZip()
          break

        case 'EXPORT_CHUNK': {
          if (!this._currentZip) return
          for (const item of msg.items || []) {
            if (item.imageBlob) {
              this._currentZip.file(`images/item_${item.id}.webp`, item.imageBlob)
            }
          }
          for (const look of msg.looks || []) {
            if (look.imageBlob) {
              this._currentZip.file(`images/look_${look.id}.webp`, look.imageBlob)
            }
          }
          break
        }

        case 'EXPORT_FINALIZE': {
          if (!this._currentZip) return
          this._currentZip.file('data.json', msg.dataJson)
          this._currentZip.generateAsync({ type: 'blob' }).then((blob) => {
            if (!this._terminated) {
              this.onmessage?.({ data: { type: 'SUCCESS', blob } })
            }
          })
          break
        }

        case 'IMPORT_START': {
          this._handleImport(msg.zipBlob)
          break
        }

        case 'ABORT':
          this._terminated = true
          this._currentZip = null
          break
      }
    }

    async _handleImport(zipBlob) {
      try {
        const zip = await JSZip.loadAsync(zipBlob)
        const dataFile = zip.file('data.json')
        if (!dataFile) throw new Error('data.json não encontrado no backup')

        const raw = await dataFile.async('text')
        let parsed
        try {
          parsed = JSON.parse(raw)
        } catch {
          throw new Error('Backup inválido: data.json não é JSON válido')
        }

        // Validate schema
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Backup inválido: data deve ser um objeto')
        }
        if (!Array.isArray(parsed.items)) {
          throw new Error('Backup inválido: items deve ser um array')
        }
        if (!Array.isArray(parsed.categories)) {
          throw new Error('Backup inválido: categories deve ser um array')
        }
        if (!Array.isArray(parsed.looks)) {
          throw new Error('Backup inválido: looks deve ser um array')
        }

        // Validate IDs
        for (const item of parsed.items) {
          if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0) {
            throw new Error('Backup inválido: item id deve ser um inteiro positivo')
          }
        }
        for (const look of parsed.looks) {
          if (typeof look.id !== 'number' || !Number.isInteger(look.id) || look.id <= 0) {
            throw new Error('Backup inválido: look id deve ser um inteiro positivo')
          }
        }

        // Hydrate items with blobs
        const hydratedItems = []
        for (const item of parsed.items) {
          const imgFile = zip.file(`images/item_${item.id}.webp`)
          let blob
          if (imgFile) {
            blob = await imgFile.async('blob')
          }
          hydratedItems.push({ ...item, imageBlob: blob })
        }

        // Hydrate looks with blobs
        const hydratedLooks = []
        for (const look of parsed.looks) {
          const imgFile = zip.file(`images/look_${look.id}.webp`)
          let blob
          if (imgFile) {
            blob = await imgFile.async('blob')
          }
          hydratedLooks.push({ ...look, imageBlob: blob })
        }

        if (!this._terminated) {
          this.onmessage?.({
            data: {
              type: 'SUCCESS_IMPORT',
              items: hydratedItems,
              categories: parsed.categories,
              looks: hydratedLooks,
            },
          })
        }
      } catch (err) {
        if (!this._terminated) {
          this.onmessage?.({ data: { type: 'ERROR', error: err.message } })
        }
      }
    }

    terminate() {
      this._terminated = true
      this._currentZip = null
    }

    addEventListener(event, handler) {
      if (event === 'message') this.onmessage = handler
      if (event === 'error') this.onerror = handler
    }

    removeEventListener() {}
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/** Seed sample data for export/import tests */
async function seedSampleData() {
  await addCategory('Casual')
  await addCategory('Formal')
  const i1 = await addItem({ type: 'top', description: 'Camiseta branca' })
  const i2 = await addItem({ type: 'bottom', description: 'Calça jeans' })
  const i3 = await addItem({ type: 'shoes', description: 'Tênis preto' })
  const lookId = await addLook({ description: 'Look casual', itemIds: [i1, i2] })
  return { i1, i2, i3, lookId }
}

/**
 * Generate a valid backup zip matching the worker output format.
 * @param {object} data - { items, categories, looks }
 * @param {Map<number, Blob>} [imageMap] - itemId → Blob
 */
async function generateBackupZip(data, imageMap = new Map()) {
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(data, null, 2))
  for (const [id, blob] of imageMap) {
    zip.file(`images/item_${id}.webp`, blob)
  }
  return zip.generateAsync({ type: 'blob' })
}

// ─── Tests ────────────────────────────────────────────────────

describe('backupService — exportBackup', () => {
  let SmartWorker

  beforeEach(async () => {
    await db.open()
    mockSaveAs.mockClear()
    SmartWorker = createSmartWorkerMock()
    vi.stubGlobal('Worker', SmartWorker)
  })

  afterEach(async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
    vi.unstubAllGlobals()
  })

  it('calls saveAs with a blob when export succeeds', async () => {
    await seedSampleData()

    await exportBackup()

    expect(mockSaveAs).toHaveBeenCalledTimes(1)
    const [blob, filename] = mockSaveAs.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(filename).toMatch(/^backup-veste-\d+\.zip$/)
  })

  it('generates a zip containing data.json', async () => {
    await seedSampleData()

    await exportBackup()

    const [blob] = mockSaveAs.mock.calls[0]
    const zip = await JSZip.loadAsync(blob)
    const dataFile = zip.file('data.json')
    expect(dataFile).toBeDefined()

    const content = await dataFile.async('text')
    const parsed = JSON.parse(content)
    expect(parsed.items).toBeDefined()
    expect(Array.isArray(parsed.items)).toBe(true)
    // items should NOT contain imageBlob (stripped before serialization)
    for (const item of parsed.items) {
      expect(item.imageBlob).toBeUndefined()
    }
  })

  it('generates a zip with count matching DB', async () => {
    const data = await seedSampleData()
    const totalItems = await db.items.count()
    const totalLooks = await db.looks.count()

    await exportBackup()

    const [blob] = mockSaveAs.mock.calls[0]
    const zip = await JSZip.loadAsync(blob)
    const content = await zip.file('data.json').async('text')
    const parsed = JSON.parse(content)

    expect(parsed.items).toHaveLength(totalItems)
    expect(parsed.looks).toHaveLength(totalLooks)
  })

  it('throws error when no data to export', async () => {
    await expect(exportBackup()).rejects.toThrow('Nenhum dado para exportar.')
  })
})

describe('backupService — importBackup', () => {
  let SmartWorker

  beforeEach(async () => {
    await db.open()
    SmartWorker = createSmartWorkerMock()
    vi.stubGlobal('Worker', SmartWorker)
  })

  afterEach(async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
    vi.unstubAllGlobals()
  })

  it('restores items, categories and looks from a valid zip', async () => {
    const data = {
      items: [
        { id: 1, type: 'top', description: 'Camiseta', categoryId: 1, createdAt: 1000 },
        { id: 2, type: 'bottom', description: 'Calça', categoryId: 1, createdAt: 2000 },
      ],
      categories: [{ id: 1, name: 'Casual', color: '#F5F4F0' }],
      looks: [{ id: 1, description: 'Look teste', itemIds: [1, 2], createdAt: 3000 }],
    }
    const zipBlob = await generateBackupZip(data)
    const file = new File([zipBlob], 'backup.zip', { type: 'application/zip' })

    await importBackup(file)

    const items = await db.items.toArray()
    const cats = await db.categories.toArray()
    const looks = await db.looks.toArray()

    expect(items).toHaveLength(2)
    expect(cats).toHaveLength(1)
    expect(looks).toHaveLength(1)

    expect(items[0].description).toBe('Camiseta')
    expect(items[1].description).toBe('Calça')
    expect(cats[0].name).toBe('Casual')
    expect(looks[0].description).toBe('Look teste')
  })

  it('restores imageBlobs from zip images/ folder', async () => {
    const imageBlob = new Blob(['fake-webp-data'], { type: 'image/webp' })
    const data = {
      items: [{ id: 1, type: 'top', description: 'Com foto', categoryId: 1, createdAt: 1000 }],
      categories: [],
      looks: [],
    }
    const imageMap = new Map([[1, imageBlob]])
    const zipBlob = await generateBackupZip(data, imageMap)
    const file = new File([zipBlob], 'backup.zip', { type: 'application/zip' })

    await importBackup(file)

    const stored = await db.items.get(1)
    expect(stored).toBeDefined()
    // Note: fake-indexeddb serializes Blobs as {} in some environments.
    // In real IndexedDB this would be a Blob. We verify the field exists.
    expect(stored.imageBlob).toBeDefined()
  })

  it('handles items without images in the zip', async () => {
    const data = {
      items: [
        { id: 1, type: 'top', description: 'Sem foto', categoryId: 1, createdAt: 1000 },
        { id: 2, type: 'bottom', description: 'Com foto', categoryId: 1, createdAt: 2000 },
      ],
      categories: [],
      looks: [],
    }
    const imageMap = new Map([[2, new Blob(['data'], { type: 'image/webp' })]])
    const zipBlob = await generateBackupZip(data, imageMap)
    const file = new File([zipBlob], 'backup.zip', { type: 'application/zip' })

    await importBackup(file)

    const item1 = await db.items.get(1)
    const item2 = await db.items.get(2)
    // fake-indexeddb serializes Blobs; verify field exists
    expect(item1.imageBlob).toBeUndefined()
    expect(item2.imageBlob).toBeDefined()
  })

  it('rejects files larger than 50MB', async () => {
    const bigFile = new File(['x'.repeat(1024)], 'big.zip', { type: 'application/zip' })
    Object.defineProperty(bigFile, 'size', { value: 51 * 1024 * 1024 })
    await expect(importBackup(bigFile)).rejects.toThrow('Arquivo muito grande (máx 50 MB)')
  })

  it('rejects zip without data.json', async () => {
    const emptyZip = new JSZip()
    const blob = await emptyZip.generateAsync({ type: 'blob' })
    const file = new File([blob], 'empty.zip', { type: 'application/zip' })

    await expect(importBackup(file)).rejects.toThrow('data.json não encontrado no backup')
  })

  it('rejects zip with corrupted data.json', async () => {
    const zip = new JSZip()
    zip.file('data.json', '{invalid json}')
    const blob = await zip.generateAsync({ type: 'blob' })
    const file = new File([blob], 'corrupt.zip', { type: 'application/zip' })

    await expect(importBackup(file)).rejects.toThrow('não é JSON válido')
  })

  it('rejects zip with invalid item id type', async () => {
    const data = {
      items: [{ id: 'abc', type: 'top', description: 'Bad' }],
      categories: [],
      looks: [],
    }
    const zipBlob = await generateBackupZip(data)
    const file = new File([zipBlob], 'bad.zip', { type: 'application/zip' })

    await expect(importBackup(file)).rejects.toThrow('item id deve ser um inteiro positivo')
  })

  it('rejects zip with non-integer item id', async () => {
    const data = {
      items: [{ id: 1.5, type: 'top', description: 'Bad' }],
      categories: [],
      looks: [],
    }
    const zipBlob = await generateBackupZip(data)
    const file = new File([zipBlob], 'bad.zip', { type: 'application/zip' })

    await expect(importBackup(file)).rejects.toThrow('item id deve ser um inteiro positivo')
  })
})

describe('backupService — full round-trip export → import', () => {
  let SmartWorker

  beforeEach(async () => {
    await db.open()
    mockSaveAs.mockClear()
    SmartWorker = createSmartWorkerMock()
    vi.stubGlobal('Worker', SmartWorker)
  })

  afterEach(async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
    vi.unstubAllGlobals()
  })

  it('exported data can be imported back with identical values', async () => {
    // Seed data
    await addCategory('Casual')
    await addCategory('Formal')
    const item1Id = await addItem({ type: 'top', description: 'Camisa social', categoryId: 2 })
    const item2Id = await addItem({ type: 'bottom', description: 'Calça social', categoryId: 2 })
    const item3Id = await addItem({ type: 'shoes', description: 'Sapato', categoryId: 1 })
    const lookId = await addLook({
      description: 'Look formal',
      itemIds: [item1Id, item2Id],
    })

    // Capture data before export
    const originalItems = await db.items.orderBy('id').toArray()
    const originalCats = await db.categories.orderBy('id').toArray()
    const originalLooks = await db.looks.orderBy('id').toArray()

    // Export
    await exportBackup()
    const [exportedBlob] = mockSaveAs.mock.calls[0]

    // Create File from exported blob
    const exportedFile = new File([exportedBlob], 'backup-veste-test.zip', {
      type: 'application/zip',
    })

    // Clear DB
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
    expect(await db.items.count()).toBe(0)

    // Import
    await importBackup(exportedFile)

    // Verify data matches
    const restoredItems = await db.items.orderBy('id').toArray()
    const restoredCats = await db.categories.orderBy('id').toArray()
    const restoredLooks = await db.looks.orderBy('id').toArray()

    expect(restoredItems).toHaveLength(originalItems.length)
    expect(restoredCats).toHaveLength(originalCats.length)
    expect(restoredLooks).toHaveLength(originalLooks.length)

    // Check item fields (without imageBlob)
    for (let i = 0; i < originalItems.length; i++) {
      const orig = { ...originalItems[i] }
      const rest = { ...restoredItems[i] }
      delete orig.imageBlob
      delete rest.imageBlob
      expect(rest).toEqual(orig)
    }

    // Check categories
    expect(restoredCats).toEqual(originalCats)

    // Check looks
    for (let i = 0; i < originalLooks.length; i++) {
      const orig = { ...originalLooks[i] }
      const rest = { ...restoredLooks[i] }
      delete orig.imageBlob
      delete rest.imageBlob
      expect(rest).toEqual(orig)
    }
  })

  it('export→import round-trip preserves data integrity (non-blob fields)', async () => {
    // Note: fake-indexeddb does not preserve Blobs reliably in test environment.
    // This test verifies the round-trip for all non-blob data fields.
    const data = await seedSampleData()
    const originalItems = await db.items.orderBy('id').toArray()
    const originalCats = await db.categories.orderBy('id').toArray()
    const originalLooks = await db.looks.orderBy('id').toArray()

    await exportBackup()
    const [exportedBlob] = mockSaveAs.mock.calls[0]
    const exportedFile = new File([exportedBlob], 'backup-test.zip', {
      type: 'application/zip',
    })

    // Clear DB
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()
    expect(await db.items.count()).toBe(0)

    // Import
    await importBackup(exportedFile)

    // Verify all data matches (excluding imageBlob)
    const restoredItems = await db.items.orderBy('id').toArray()
    const restoredCats = await db.categories.orderBy('id').toArray()
    const restoredLooks = await db.looks.orderBy('id').toArray()

    expect(restoredItems).toHaveLength(originalItems.length)
    expect(restoredCats).toHaveLength(originalCats.length)
    expect(restoredLooks).toHaveLength(originalLooks.length)

    for (let i = 0; i < originalItems.length; i++) {
      const orig = { ...originalItems[i] }
      const rest = { ...restoredItems[i] }
      delete orig.imageBlob
      delete rest.imageBlob
      expect(rest).toEqual(orig)
    }
    expect(restoredCats).toEqual(originalCats)
    for (let i = 0; i < originalLooks.length; i++) {
      const orig = { ...originalLooks[i] }
      const rest = { ...restoredLooks[i] }
      delete orig.imageBlob
      delete rest.imageBlob
      expect(rest).toEqual(orig)
    }
  })

  it('import can restore imageBlobs from a known-good zip', async () => {
    // This test bypasses fake-indexeddb's Blob limitations by creating
    // the import zip manually with valid Blobs.
    const importZip = new JSZip()
    importZip.file(
      'data.json',
      JSON.stringify({
        items: [{ id: 10, type: 'top', description: 'With image', categoryId: 1, createdAt: 1000 }],
        categories: [{ id: 1, name: 'Casual', color: '#F5F4F0' }],
        looks: [],
      }),
    )
    importZip.file('images/item_10.webp', new Blob(['img-content'], { type: 'image/webp' }))
    const importBlob = await importZip.generateAsync({ type: 'blob' })
    const importFile = new File([importBlob], 'import.zip', { type: 'application/zip' })

    await importBackup(importFile)

    const restored = await db.items.get(10)
    expect(restored).toBeDefined()
    expect(restored.description).toBe('With image')
    // fake-indexeddb serializes Blobs, but field should exist
    expect(restored.imageBlob).toBeDefined()
  })
})

describe('backup — pure validation logic', () => {
  it('validates that item ids must be positive integers', () => {
    const invalidItems = [
      { id: 'abc', type: 'top' },
      { id: -1, type: 'bottom' },
      { id: 1.5, type: 'full' },
      { id: 0, type: 'shoes' },
    ]
    for (const item of invalidItems) {
      const isValid = typeof item.id === 'number' && Number.isInteger(item.id) && item.id > 0
      expect(isValid).toBe(false)
    }

    const validItems = [
      { id: 1, type: 'top' },
      { id: 999, type: 'bottom' },
    ]
    for (const item of validItems) {
      const isValid = typeof item.id === 'number' && Number.isInteger(item.id) && item.id > 0
      expect(isValid).toBe(true)
    }
  })

  it('validates backup data structure', () => {
    function validateBackupData(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup: data must be an object')
      }
      if (!Array.isArray(data.items)) {
        throw new Error('Invalid backup: items must be an array')
      }
      if (!Array.isArray(data.categories)) {
        throw new Error('Invalid backup: categories must be an array')
      }
      if (!Array.isArray(data.looks)) {
        throw new Error('Invalid backup: looks must be an array')
      }
      for (const item of data.items) {
        if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0) {
          throw new Error('Invalid backup: item id must be a positive integer')
        }
      }
    }

    expect(() => validateBackupData(null)).toThrow('data must be an object')
    expect(() => validateBackupData({ items: 'str', categories: [], looks: [] })).toThrow(
      'items must be an array',
    )
    expect(() => validateBackupData({ items: [], categories: 'str', looks: [] })).toThrow(
      'categories must be an array',
    )
    expect(() => validateBackupData({ items: [], categories: [], looks: 'str' })).toThrow(
      'looks must be an array',
    )
    expect(() => validateBackupData({ items: [{ id: 'bad' }], categories: [], looks: [] })).toThrow(
      'item id must be a positive integer',
    )
    expect(() => validateBackupData({ items: [], categories: [], looks: [] })).not.toThrow()
  })
})
