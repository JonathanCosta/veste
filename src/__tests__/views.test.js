import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import db from '../database/db'
import { addItem, addLook } from '../services/wardrobeService'

// Mock file-saver for SettingsView (hoisted before import)
const { mockSaveAs } = vi.hoisted(() => ({ mockSaveAs: vi.fn() }))
vi.mock('file-saver', () => ({
  default: { saveAs: mockSaveAs },
}))

// Mock useDialog — confirm() returns true by default so deletions proceed.
// Individual tests can override confirmMock for the "cancelled" case.
const { confirmMock, alertMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(() => Promise.resolve(true)),
  alertMock: vi.fn(() => Promise.resolve()),
}))
vi.mock('../composables/useDialog', () => ({
  useDialog: () => ({
    visible: { value: false },
    title: { value: '' },
    message: { value: '' },
    type: { value: 'alert' },
    confirm: confirmMock,
    alert: alertMock,
    resolveDialog: vi.fn(),
  }),
}))

// Mock backupService for SettingsView tests (Worker-dependent)
vi.mock('../services/backupService', () => ({
  exportBackup: vi.fn(() => Promise.resolve()),
  importBackup: vi.fn(() => Promise.reject(new Error('Falha ao importar'))),
}))

/**
 * Create a router for testing views.
 */
async function setupRouter() {
  return createRouter({
    history: createWebHistory('/veste/'),
    routes: [
      {
        path: '/',
        name: 'Wardrobe',
        component: () => import('../views/WardrobeView.vue'),
      },
      {
        path: '/item/:id',
        name: 'ItemDetail',
        component: () => import('../views/ItemDetailView.vue'),
      },
      {
        path: '/looks',
        name: 'Looks',
        component: () => import('../views/LookManagerView.vue'),
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue'),
      },
    ],
  })
}

/**
 * Mount a view with router navigation.
 */
async function mountView(viewComponent, routePath = '/') {
  const router = await setupRouter()
  await router.push(routePath)
  const wrapper = mount(viewComponent, {
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

// ────────────────────────────────────────────
// WardrobeView
// ────────────────────────────────────────────
describe('WardrobeView.vue', () => {
  beforeEach(async () => {
    await db.open()
    await db.items.clear()
  })

  it('renders header and search input', async () => {
    const View = (await import('../views/WardrobeView.vue')).default
    const { wrapper } = await mountView(View)
    expect(wrapper.text()).toContain('guarda roupa')
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
  })

  it('shows empty state when no items', async () => {
    const View = (await import('../views/WardrobeView.vue')).default
    const { wrapper } = await mountView(View)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Nenhuma peça encontrada')
    })
  })

  it('shows correct item count and renders items', async () => {
    await addItem({ type: 'top', description: 'A' })
    await addItem({ type: 'bottom', description: 'B' })

    const View = (await import('../views/WardrobeView.vue')).default
    const { wrapper } = await mountView(View)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('2 peças')
      expect(wrapper.text()).toContain('A')
      expect(wrapper.text()).toContain('B')
    })
  })

  it('filters by type when a filter pill is clicked', async () => {
    await addItem({ type: 'top', description: 'Top' })
    await addItem({ type: 'bottom', description: 'Bottom' })

    const View = (await import('../views/WardrobeView.vue')).default
    const { wrapper } = await mountView(View)

    // Wait for items to load and render
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('2 peças')
    })

    // Click the "Parte de Baixo" filter pill
    const allBtns = wrapper.findAll('button')
    const bottomBtn = allBtns.find((b) => b.text().includes('Parte de Baixo'))
    expect(bottomBtn).toBeDefined()
    await bottomBtn.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('1 peças')
      expect(wrapper.text()).toContain('Bottom')
    })
  })
})

// ────────────────────────────────────────────
// ItemDetailView
// ────────────────────────────────────────────
describe('ItemDetailView.vue', () => {
  let itemId

  beforeEach(async () => {
    await db.open()
    await db.items.clear()
    itemId = await addItem({ type: 'shoes', description: 'Tênis branco' })
  })

  it('shows item details in view mode', async () => {
    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper } = await mountView(View, `/item/${itemId}`)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Tênis branco')
      expect(wrapper.text()).toContain('shoes')
    })
  })

  it('shows "não encontrada" for non-existent item', async () => {
    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper } = await mountView(View, '/item/99999')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Peça não encontrada')
    })
  })

  it('shows create form when id param is "new"', async () => {
    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper } = await mountView(View, '/item/new')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Nova Peça')
      expect(wrapper.text()).toContain('Salvar peça')
      expect(wrapper.text()).toContain('Adicionar foto')
    })
  })

  it('switches from view to create mode on route change', async () => {
    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper, router } = await mountView(View, `/item/${itemId}`)

    // Wait for view mode to load
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Tênis branco')
    })

    // Navigate to new — same component, different param
    await router.push('/item/new')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Nova Peça')
      expect(wrapper.text()).not.toContain('Tênis branco')
    })
  })

  it('has and triggers delete button', async () => {
    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper, router } = await mountView(View, `/item/${itemId}`)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Remover')
    })

    const pushSpy = vi.spyOn(router, 'push')
    const allBtns = wrapper.findAll('button')
    const removeBtn = allBtns.find((b) => b.text().includes('Remover'))
    await removeBtn.trigger('click')

    await vi.waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith('/')
    })
    pushSpy.mockRestore()
  })

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockImplementation(() => Promise.resolve(false))

    const View = (await import('../views/ItemDetailView.vue')).default
    const { wrapper, router } = await mountView(View, `/item/${itemId}`)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Remover')
    })

    const pushSpy = vi.spyOn(router, 'push')
    const allBtns = wrapper.findAll('button')
    const removeBtn = allBtns.find((b) => b.text().includes('Remover'))
    await removeBtn.trigger('click')

    expect(pushSpy).not.toHaveBeenCalled()

    confirmMock.mockImplementation(() => Promise.resolve(true))

    // Item should still exist
    const item = await db.items.get(itemId)
    expect(item).toBeDefined()
    expect(item.description).toBe('Tênis branco')

    pushSpy.mockRestore()
  })
})

// ────────────────────────────────────────────
// LookManagerView
// ────────────────────────────────────────────
describe('LookManagerView.vue', () => {
  let i1, i2

  beforeEach(async () => {
    await db.open()
    await db.items.clear()
    await db.looks.clear()
    i1 = await addItem({ type: 'top', description: 'Camisa' })
    i2 = await addItem({ type: 'bottom', description: 'Calça' })
  })

  it('renders header and create button', async () => {
    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)
    expect(wrapper.text()).toContain('Looks')
    expect(wrapper.text()).toContain('Criar look')
  })

  it('shows empty state when no looks', async () => {
    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Nenhum look ainda')
    })
  })

  it('renders look list with item count', async () => {
    await addLook({ description: 'Look Teste', itemIds: [i1, i2] })
    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Look Teste')
      expect(wrapper.text()).toContain('2 peças')
    })
  })

  it('opens create sheet (Teleport renders to body)', async () => {
    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)

    // Click "+ Criar look" button (the dashed border button)
    const allBtns = wrapper.findAll('button')
    const createBtn = allBtns.find((b) => b.text().includes('Criar look'))
    await createBtn.trigger('click')

    await vi.waitFor(() => {
      // Teleported content: check document.body
      expect(document.body.textContent).toContain('Novo Look')
    })
  })

  it('view sheet shows look items', async () => {
    await addLook({ description: 'Look Visualizar', itemIds: [i1, i2] })
    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)

    // Wait for look to render
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Look Visualizar')
    })

    // Click the look card to open view sheet
    const lookCard = wrapper.find('div.cursor-pointer')
    await lookCard.trigger('click')

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Remover look')
    })
  })

  it('deletes a look (verified via DB)', async () => {
    const lookId = await addLook({ description: 'DB Delete', itemIds: [i1, i2] })
    let looks = await db.looks.toArray()
    expect(looks).toHaveLength(1)

    await db.looks.delete(lookId)
    looks = await db.looks.toArray()
    expect(looks).toHaveLength(0)
  })

  it('enters edit mode and shows editable description input', async () => {
    const lookId = await addLook({ description: 'Editável', itemIds: [i1, i2] })

    const View = (await import('../views/LookManagerView.vue')).default
    const { wrapper } = await mountView(View)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Editável')
    })

    // Open detail sheet
    const lookCard = wrapper.find('div.cursor-pointer')
    await lookCard.trigger('click')

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Editável')
    })

    // Click "Editar"
    await vi.waitFor(() => {
      const btn = Array.from(document.body.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Editar',
      )
      expect(btn).toBeDefined()
    })
    const editBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Editar',
    )
    editBtn.click()

    // Edit mode should show Salvar alterações and Cancelar
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Salvar alterações')
      expect(document.body.textContent).toContain('Cancelar')
    })

    // Cancel should revert to view mode
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Cancelar',
    )
    cancelBtn.click()

    await vi.waitFor(() => {
      expect(document.body.textContent).not.toContain('Salvar alterações')
      expect(document.body.textContent).toContain('Remover look')
    })
  })
})

// ────────────────────────────────────────────
// SettingsView
// ────────────────────────────────────────────
describe('SettingsView.vue', () => {
  beforeEach(() => {
    mockSaveAs.mockClear()
  })

  it('renders export and import buttons', async () => {
    const View = (await import('../views/SettingsView.vue')).default
    const { wrapper } = await mountView(View)

    expect(wrapper.text()).toContain('Exportar backup')
    expect(wrapper.text()).toContain('Importar backup')
  })

  it('shows success status after export', async () => {
    const View = (await import('../views/SettingsView.vue')).default
    const { wrapper } = await mountView(View)

    const allBtns = wrapper.findAll('button')
    const exportBtn = allBtns.find((b) => b.text().includes('Exportar'))
    await exportBtn.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('sucesso')
    })
  })

  it('shows error when importing non-zip file', async () => {
    const View = (await import('../views/SettingsView.vue')).default
    const { wrapper } = await mountView(View)

    // SettingsView's handleImport checks file.name.endsWith('.zip')
    // We call the component method directly
    const badFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    const event = { target: { files: [badFile] } }

    // @ts-expect-error - script setup exposes handleImport
    await wrapper.vm.handleImport(event)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Selecione um arquivo .zip')
    })
  })
})
