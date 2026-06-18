import { describe, it, expect, beforeEach, vi } from 'vitest'
import db from '../database/db'
import { addItem } from '../services/wardrobeService'
import { addCalendarLog, getLogsByDate, getLogsByMonth } from '../services/calendarService'

describe('calendarService — getLogsByMonth', () => {
  beforeEach(async () => {
    await db.open()
    await db.calendar_logs.clear()
    await db.items.clear()
    await db.looks.clear()
  })

  it('returns logs for a given month', async () => {
    const itemId = await db.items.add({ type: 'top', description: 'Item', createdAt: Date.now() })

    // Add logs in different months
    await addCalendarLog({ date: '2026-06-15', entityType: 'item', entityId: itemId, order: 0 })
    await addCalendarLog({ date: '2026-06-20', entityType: 'item', entityId: itemId, order: 1 })
    await addCalendarLog({ date: '2026-07-01', entityType: 'item', entityId: itemId, order: 0 })

    const juneLogs = await getLogsByMonth(2026, 6)
    expect(juneLogs).toHaveLength(2)

    const julyLogs = await getLogsByMonth(2026, 7)
    expect(julyLogs).toHaveLength(1)
  })

  it('returns empty array when no logs exist in month', async () => {
    const logs = await getLogsByMonth(2025, 1)
    expect(logs).toHaveLength(0)
  })

  it('works with look-type logs alongside items', async () => {
    const itemId = await db.items.add({ type: 'top', description: 'Item', createdAt: Date.now() })
    const lookId = await db.looks.add({
      description: 'Look Mês',
      itemIds: [itemId],
      createdAt: Date.now(),
    })

    await addCalendarLog({ date: '2026-06-15', entityType: 'item', entityId: itemId, order: 0 })
    await addCalendarLog({ date: '2026-06-16', entityType: 'look', entityId: lookId, order: 0 })

    const logs = await getLogsByMonth(2026, 6)
    expect(logs).toHaveLength(2)
  })
})

describe('calendarService — look integration', () => {
  beforeEach(async () => {
    await db.open()
    await db.calendar_logs.clear()
    await db.items.clear()
    await db.looks.clear()
  })

  it('loadLogs fetches look entities correctly', async () => {
    // Create items and a look
    const item1 = await addItem({ type: 'top', description: 'Camisa' })
    const item2 = await addItem({ type: 'bottom', description: 'Calça' })

    const lookId = await db.looks.add({
      description: 'Look Teste',
      itemIds: [item1, item2],
      createdAt: Date.now(),
    })

    // Verify look exists
    const look = await db.looks.get(lookId)
    expect(look).toBeDefined()
    expect(look.description).toBe('Look Teste')

    // Add calendar log for the look
    const logId = await addCalendarLog({
      date: '2026-06-17',
      entityType: 'look',
      entityId: lookId,
      order: 0,
    })
    expect(logId).toBeGreaterThan(0)

    // Fetch logs for this date
    const logs = await getLogsByDate('2026-06-17')
    expect(logs).toHaveLength(1)
    expect(logs[0].entityType).toBe('look')
    expect(logs[0].entityId).toBe(lookId)

    // Simulate DayDetailSheet.loadLogs: fetch entity for each log
    for (const log of logs) {
      const table = log.entityType === 'item' ? db.items : db.looks
      const entity = await table.get(log.entityId)
      expect(entity).toBeDefined()
      expect(entity.description).toBe('Look Teste')
    }
  })

  it('logs for item and look both load in same date', async () => {
    const itemId = await addItem({ type: 'shoes', description: 'Tênis' })
    const lookId = await db.looks.add({
      description: 'Look Completo',
      itemIds: [itemId],
      createdAt: Date.now(),
    })

    await addCalendarLog({ date: '2026-06-17', entityType: 'item', entityId: itemId, order: 0 })
    await addCalendarLog({ date: '2026-06-17', entityType: 'look', entityId: lookId, order: 1 })

    const logs = await getLogsByDate('2026-06-17')
    expect(logs).toHaveLength(2)

    const entityTypes = logs.map((l) => l.entityType).sort()
    expect(entityTypes).toEqual(['item', 'look'])
  })
})

describe('DayDetailSheet — look rendering', () => {
  beforeEach(async () => {
    const db = (await import('../database/db.js')).default
    await db.open()
    await db.calendar_logs.clear()
    await db.items.clear()
    await db.looks.clear()
  })

  it('renders look log entries in the sheet', async () => {
    const { mount } = await import('@vue/test-utils')
    const db = (await import('../database/db.js')).default
    const { addItem } = await import('../services/wardrobeService')
    const { addCalendarLog } = await import('../services/calendarService')
    const DayDetailSheet = (await import('../components/DayDetailSheet.vue')).default

    // Create items and a look
    const itemId = await addItem({ type: 'top', description: 'Camisa' })
    const lookId = await db.looks.add({
      description: 'Look Teste',
      itemIds: [itemId],
      createdAt: Date.now(),
    })

    // Add calendar log for look
    await addCalendarLog({ date: '2026-06-17', entityType: 'look', entityId: lookId, order: 0 })

    // Mount DayDetailSheet
    const wrapper = mount(DayDetailSheet, {
      props: { date: '2026-06-17' },
    })

    // Wait for logs to load
    await vi.waitFor(
      () => {
        // Should show the look description
        expect(wrapper.text()).toContain('Look Teste')
        // Should show 'Look' as the type label
        expect(wrapper.text()).toContain('Look')
        // Should show order info
        expect(wrapper.text()).toContain('Ordem')
      },
      { timeout: 3000 },
    )
  })

  it('availableLooks includes looks not yet added to this date', async () => {
    const { mount } = await import('@vue/test-utils')
    const db = (await import('../database/db.js')).default
    const { addItem } = await import('../services/wardrobeService')
    const DayDetailSheet = (await import('../components/DayDetailSheet.vue')).default

    // Create items and 2 looks
    const itemId = await addItem({ type: 'top', description: 'Camisa' })
    await db.looks.add({ description: 'Look 1', itemIds: [itemId], createdAt: Date.now() })
    await db.looks.add({ description: 'Look 2', itemIds: [itemId], createdAt: Date.now() })

    // Mount DayDetailSheet (no logs yet)
    const wrapper = mount(DayDetailSheet, {
      props: { date: '2026-06-17' },
    })

    // Wait for mount
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Nenhum registro neste dia')
      },
      { timeout: 3000 },
    )

    // Click "Look" button to open add panel
    const lookBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Look')
    expect(lookBtn).toBeDefined()
    await lookBtn.trigger('click')

    // Wait for picker to load and render looks
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Look 1')
        expect(wrapper.text()).toContain('Look 2')
      },
      { timeout: 3000 },
    )
  })

  it('adds a look via handleAdd and renders it in the log list', async () => {
    const { mount } = await import('@vue/test-utils')
    const db = (await import('../database/db.js')).default
    const { addItem } = await import('../services/wardrobeService')
    const DayDetailSheet = (await import('../components/DayDetailSheet.vue')).default

    // Create items and a look
    const itemId = await addItem({ type: 'top', description: 'Camisa' })
    const lookId = await db.looks.add({
      description: 'Look Adicionado',
      itemIds: [itemId],
      createdAt: Date.now(),
    })

    // Mount DayDetailSheet (no logs yet)
    const wrapper = mount(DayDetailSheet, {
      props: { date: '2026-06-17' },
    })

    // Wait for initial load
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Nenhum registro neste dia')
      },
      { timeout: 3000 },
    )

    // Click "Look" button to open add panel
    const lookBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Look')
    expect(lookBtn).toBeDefined()
    await lookBtn.trigger('click')

    // Wait for picker to load and find the look
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Look Adicionado')
      },
      { timeout: 3000 },
    )

    // Click on the look in the picker to add it
    const lookPickerBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Look Adicionado'))
    expect(lookPickerBtn).toBeDefined()
    await lookPickerBtn.trigger('click')

    // Wait for add to complete and logs to refresh
    // After adding, the panel should close and the look should appear in the log list
    await vi.waitFor(
      async () => {
        // Verify a calendar log exists in the database
        const logs = await db.calendar_logs.where('date').equals('2026-06-17').toArray()
        expect(logs).toHaveLength(1)
        expect(logs[0].entityType).toBe('look')
        expect(logs[0].entityId).toBe(lookId)
      },
      { timeout: 3000 },
    )

    // Verify the component shows the look description
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Look Adicionado')
      },
      { timeout: 3000 },
    )
  })

  it('renders both item and look entries in same sheet', async () => {
    const { mount } = await import('@vue/test-utils')
    const db = (await import('../database/db.js')).default
    const { addItem } = await import('../services/wardrobeService')
    const { addCalendarLog } = await import('../services/calendarService')
    const DayDetailSheet = (await import('../components/DayDetailSheet.vue')).default

    // Create items and a look
    const itemId = await addItem({ type: 'shoes', description: 'Tênis' })
    const lookId = await db.looks.add({
      description: 'Look Esportivo',
      itemIds: [itemId],
      createdAt: Date.now(),
    })

    // Add both an item log and a look log
    await addCalendarLog({ date: '2026-06-17', entityType: 'item', entityId: itemId, order: 0 })
    await addCalendarLog({ date: '2026-06-17', entityType: 'look', entityId: lookId, order: 1 })

    // Mount DayDetailSheet
    const wrapper = mount(DayDetailSheet, {
      props: { date: '2026-06-17' },
    })

    await vi.waitFor(
      () => {
        // Should show item description
        expect(wrapper.text()).toContain('Tênis')
        // Should show look description
        expect(wrapper.text()).toContain('Look Esportivo')
        // Should show both type labels
        expect(wrapper.text()).toContain('Calçados') // item type
        expect(wrapper.text()).toContain('Look') // look label
      },
      { timeout: 3000 },
    )
  })
})
