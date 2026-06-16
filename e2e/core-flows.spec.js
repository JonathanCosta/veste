import { test, expect } from '@playwright/test'
import { Buffer } from 'buffer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal valid 1×1 white PNG */
function testImageBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )
}

/** Navigate to baseURL (http://localhost:5173/veste/) using a relative URL. */
async function goHome(page) {
  await page.goto('.')
}

/**
 * Navigate to a route via the BottomNav (Peças, Novo, Looks, Config).
 * More reliable than page.goto for SPA routes with base path.
 */
async function navTo(page, tabName) {
  await page.locator('nav').getByText(tabName, { exact: true }).click()
  await page.waitForTimeout(300)
}

/** Clear IndexedDB so each test starts with a clean slate */
async function clearIndexedDB(page) {
  await goHome(page)
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('VesteDB')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(new Error('Failed to delete DB'))
      req.onblocked = () => {
        const req2 = indexedDB.deleteDatabase('VesteDB')
        req2.onsuccess = () => resolve()
        req2.onerror = () => reject(new Error('Failed on blocked'))
      }
    })
  })
  await page.waitForTimeout(300)
}

/** Map internal type values to Portuguese button labels shown in the UI */
const TYPE_LABEL = {
  top: 'Parte de Cima',
  bottom: 'Parte de Baixo',
  full: 'Inteiro',
  shoes: 'Calçados',
  accessory: 'Acessórios',
}

/** Create a test item: navigate → upload → crop → fill → save */
async function createItem(page, description = 'Camiseta branca básica', type = 'top') {
  await navTo(page, 'Novo')
  await expect(page.locator('h1')).toContainText('Nova Peça', { timeout: 5000 })

  // Upload image — triggers crop overlay
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: testImageBuffer(),
  })

  // Wait for crop overlay
  const cropOverlay = page.getByText('Ajustar foto')
  await expect(cropOverlay).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(800)

  // Confirm crop
  await page.getByText('Confirmar', { exact: true }).click()

  // Wait for overlay to close
  await expect(cropOverlay).not.toBeVisible({ timeout: 5000 })

  // Select type using Portuguese label
  if (type !== 'top') {
    await page.getByText(TYPE_LABEL[type], { exact: true }).click()
  }

  // Fill description
  await page.fill('input[placeholder="Ex: Camiseta branca básica"]', description)

  // Save
  await page.getByText('Salvar peça').click()

  // Should land on item detail page
  await page.waitForURL(/\/item\/\d+/, { timeout: 8000 })
  await expect(page.getByText(description)).toBeVisible({ timeout: 5000 })
  return page.url()
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe('🔀 Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('should render BottomNav with 4 tabs', async ({ page }) => {
    await goHome(page)
    const nav = page.locator('nav')
    const tabs = nav.locator('button')
    await expect(tabs).toHaveCount(4)

    const labels = ['Peças', 'Novo', 'Looks', 'Config']
    for (let i = 0; i < labels.length; i++) {
      await expect(tabs.nth(i)).toContainText(labels[i])
    }
  })

  test('should navigate between all tabs and show page titles', async ({ page }) => {
    await goHome(page)

    await navTo(page, 'Novo')
    await expect(page.locator('h1')).toContainText('Nova Peça')

    await navTo(page, 'Looks')
    await expect(page.locator('h1')).toContainText('Looks')

    await navTo(page, 'Config')
    await expect(page.locator('h1')).toContainText('Configurações')

    await navTo(page, 'Peças')
    await expect(page.locator('h1')).toContainText('Guarda-Roupa')
  })

  test('should highlight active tab', async ({ page }) => {
    await navTo(page, 'Looks')
    const looksTab = page.locator('nav').getByText('Looks')
    await expect(looksTab).toHaveClass(/text-accent/)

    const pecasTab = page.locator('nav').getByText('Peças')
    await expect(pecasTab).toHaveClass(/text-text-muted/)
  })
})

test.describe('✏️ Edit item', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('should edit item description and type', async ({ page }) => {
    // Create an item first
    await createItem(page, 'Camiseta branca', 'top')

    // Click Editar
    await page.getByText('Editar', { exact: true }).click()
    await expect(page.locator('h1')).toContainText('Editar Peça')

    // Change description
    const descInput = page.locator('input[placeholder="Ex: Camiseta branca básica"]')
    await descInput.fill('Camiseta preta básica')

    // Change type to "Parte de Baixo" (bottom)
    await page.getByText('Parte de Baixo', { exact: true }).click()

    // Save
    await page.getByText('Salvar alterações').click()

    // Wait for save to complete and view to reload
    await page.waitForTimeout(1000)

    // Verify the changes are reflected
    await expect(page.getByText('Camiseta preta básica')).toBeVisible()
    await expect(page.getByText('bottom')).toBeVisible()
  })

  test('should cancel edit and revert changes', async ({ page }) => {
    await createItem(page, 'Vestido azul', 'full')

    // Enter edit mode
    await page.getByText('Editar', { exact: true }).click()
    await expect(page.locator('h1')).toContainText('Editar Peça')

    // Change fields
    const descInput = page.locator('input[placeholder="Ex: Camiseta branca básica"]')
    await descInput.fill('Vestido vermelho')
    await page.getByText('Calçados', { exact: true }).click()

    // Cancel
    await page.getByText('Cancelar', { exact: true }).click()

    // Verify original values are restored
    await expect(page.getByText('Vestido azul')).toBeVisible()
    await expect(page.getByText('full')).toBeVisible()
    await expect(page.getByText('Vestido vermelho')).not.toBeVisible()
  })
})

test.describe('👕 Wardrobe', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('should show empty state when no items exist', async ({ page }) => {
    await goHome(page)
    await expect(page.getByText('Nenhuma peça encontrada')).toBeVisible({ timeout: 5000 })
  })

  test('should show brand header with logo', async ({ page }) => {
    await goHome(page)
    await expect(page.locator('img[alt="Veste Logo"]')).toBeVisible()
  })

  test('should create an item with crop and view details', async ({ page }) => {
    await createItem(page, 'Camiseta verde', 'top')
    await expect(page.getByText('Camiseta verde')).toBeVisible()
    await expect(page.getByText('top')).toBeVisible()
  })

  test('should show item count in header', async ({ page }) => {
    await createItem(page, 'Tênis branco', 'shoes')
    await navTo(page, 'Peças')
    await expect(page.getByText('1 peças')).toBeVisible()
    await expect(page.getByText('Tênis branco')).toBeVisible()
  })

  test('should delete an item and return to empty state', async ({ page }) => {
    await createItem(page, 'Item para deletar', 'accessory')

    await page.getByText('Remover', { exact: true }).click()
    await expect(page.getByText('Confirmar', { exact: true })).toBeVisible({ timeout: 3000 })
    await page.getByText('Confirmar', { exact: true }).click()

    await expect(page.getByText('Nenhuma peça encontrada')).toBeVisible({ timeout: 8000 })
  })

  test('should filter items by type', async ({ page }) => {
    await createItem(page, 'Blusa azul', 'top')
    await navTo(page, 'Peças')
    await createItem(page, 'Sapato preto', 'shoes')
    await navTo(page, 'Peças')
    await page.waitForSelector('text=2 peças', { timeout: 5000 })

    // Click filter for "Calçados" (shoes)
    await page.getByText('Calçados').click()
    await page.waitForTimeout(300)

    await expect(page.getByText('Sapato preto')).toBeVisible()
    await expect(page.getByText('Blusa azul')).not.toBeVisible()

    await page.getByText('Todas').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Blusa azul')).toBeVisible()
  })
})

test.describe('👔 Looks', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('should show empty state when no looks exist', async ({ page }) => {
    await navTo(page, 'Looks')
    await expect(page.getByText('Nenhum look ainda')).toBeVisible({ timeout: 5000 })
  })

  test('should show brand header with logo on looks page', async ({ page }) => {
    await navTo(page, 'Looks')
    await expect(page.locator('img[alt="Veste Logo"]')).toBeVisible()
  })

  test('should create a look with 2 items', async ({ page }) => {
    await createItem(page, 'Camisa jeans', 'top')
    await navTo(page, 'Peças')
    await createItem(page, 'Calça preta', 'bottom')
    await navTo(page, 'Peças')

    await navTo(page, 'Looks')
    await page.getByText('+ Criar look').click()
    await expect(page.getByText('Novo Look')).toBeVisible({ timeout: 5000 })

    // Wait for items to appear in create sheet by checking their type text
    await expect(page.getByText('top', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('bottom', { exact: true }).first()).toBeVisible({ timeout: 5000 })

    // Select both items by clicking their type labels
    await page.getByText('top', { exact: true }).first().click()
    await page.getByText('bottom', { exact: true }).first().click()

    await page.fill('input[placeholder="Descrição do look (opcional)"]', 'Look casual')

    // Click the submit button (last button matching "Criar look")
    await page
      .locator('button')
      .filter({ hasText: /Criar look/ })
      .last()
      .click()
    await expect(page.getByText('Novo Look')).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    await expect(page.getByText('Look casual')).toBeVisible()
  })

  test('should view look details and delete a look', async ({ page }) => {
    await createItem(page, 'Jaqueta jeans', 'full')
    await navTo(page, 'Peças')
    await createItem(page, 'Bota couro', 'shoes')
    await navTo(page, 'Peças')

    await navTo(page, 'Looks')
    await page.getByText('+ Criar look').click()
    await expect(page.getByText('Novo Look')).toBeVisible({ timeout: 5000 })

    // Wait for items and select both
    await expect(page.getByText('full', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('shoes', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await page.getByText('full', { exact: true }).first().click()
    await page.getByText('shoes', { exact: true }).first().click()

    await page.fill('input[placeholder="Descrição do look (opcional)"]', 'Look inverno')
    await page
      .locator('button')
      .filter({ hasText: /Criar look/ })
      .last()
      .click()
    await expect(page.getByText('Novo Look')).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)

    // Open look detail sheet
    await page.getByText('Look inverno').click()
    await expect(page.getByText('2 peças').first()).toBeVisible()

    // Delete
    await page.getByText('Remover look', { exact: true }).click()
    await expect(page.getByText('Confirmar', { exact: true })).toBeVisible({ timeout: 3000 })
    await page.getByText('Confirmar', { exact: true }).click()
    await expect(page.getByText('Nenhum look ainda')).toBeVisible({ timeout: 5000 })
  })

  test('should not allow creating look with fewer than 2 items', async ({ page }) => {
    await createItem(page, 'Vestido florido', 'full')
    await navTo(page, 'Peças')

    await navTo(page, 'Looks')
    await page.getByText('+ Criar look').click()
    await expect(page.getByText('Novo Look')).toBeVisible({ timeout: 5000 })

    // Wait for item to appear
    await expect(page.getByText('full', { exact: true }).first()).toBeVisible({ timeout: 5000 })

    // Select only 1 item
    await page.getByText('full', { exact: true }).first().click()

    // The submit button should be disabled
    const createBtn = page
      .locator('button')
      .filter({ hasText: /Criar look/ })
      .last()
    await expect(createBtn).toBeDisabled()
  })
})

test.describe('⚙️ Settings', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('should show Settings page with all elements', async ({ page }) => {
    await navTo(page, 'Config')
    await expect(page.locator('h1')).toContainText('Configurações')
    await expect(page.locator('img[alt="Veste Logo"]')).toBeVisible()
    await expect(page.locator('text=Veste').first()).toBeVisible()
    await expect(page.getByText('Exportar backup')).toBeVisible()
    await expect(page.getByText('Importar backup')).toBeVisible()
    await expect(page.getByText('Veste — Look do Dia v0.1.0')).toBeVisible()
    await expect(page.getByText('Guarda-roupa virtual offline-first')).toBeVisible()
    await expect(page.getByText('100% local, sem servidores')).toBeVisible()
  })

  test('should trigger file picker on import click', async ({ page }) => {
    await navTo(page, 'Config')
    const importLabel = page.getByText('Importar backup')
    await expect(importLabel).toBeVisible()
    const fileInput = page.locator('input[accept=".zip"]')
    await expect(fileInput).toBeHidden()
  })
})

test.describe('🔄 Complete user journey', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page)
  })

  test('full flow: create items → create look → view → delete all', async ({ page }) => {
    // 1. Create 3 items of different types
    const items = [
      { desc: 'Regata azul', type: 'top' },
      { desc: 'Short jeans', type: 'bottom' },
      { desc: 'Chinelo', type: 'shoes' },
    ]
    for (const item of items) {
      await createItem(page, item.desc, item.type)
      await navTo(page, 'Peças')
    }

    // Verify 3 items in wardrobe
    await expect(page.getByText('3 peças')).toBeVisible({ timeout: 5000 })

    // 2. Create a look with the first 2 items (top and bottom)
    await navTo(page, 'Looks')
    await page.getByText('+ Criar look').click()
    await expect(page.getByText('Novo Look')).toBeVisible({ timeout: 5000 })

    // Wait for items to load by checking for type labels
    await expect(page.getByText('top', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('bottom', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('shoes', { exact: true }).first()).toBeVisible({ timeout: 5000 })

    // Select top and bottom items
    await page.getByText('top', { exact: true }).first().click()
    await page.getByText('bottom', { exact: true }).first().click()

    await page.fill('input[placeholder="Descrição do look (opcional)"]', 'Look praia')

    // Create the look
    await page
      .locator('button')
      .filter({ hasText: /Criar look/ })
      .last()
      .click()
    await expect(page.getByText('Novo Look')).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    await expect(page.getByText('Look praia')).toBeVisible()

    // 3. Open look and verify items (detail sheet shows item types)
    await page.getByText('Look praia').click()
    await expect(page.getByText('2 peças').first()).toBeVisible()
    // Verify the correct items are in the look (top and bottom)
    await expect(page.getByText('top', { exact: true }).first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('bottom', { exact: true }).first()).toBeVisible({ timeout: 3000 })

    // Close sheet by dispatching click on backdrop (avoids viewport/interception issues)
    await page.evaluate(() => {
      const sheet = document.querySelector('.fixed.inset-0.z-50')
      if (!sheet) return
      const backdrop = sheet.querySelector('.absolute.inset-0')
      if (backdrop instanceof HTMLElement) backdrop.click()
    })
    await page.waitForTimeout(500)

    // 4. Delete the look
    await page.getByText('Look praia').click()
    await page.getByText('Remover look', { exact: true }).click()
    await expect(page.getByText('Confirmar', { exact: true })).toBeVisible({ timeout: 3000 })
    await page.getByText('Confirmar', { exact: true }).click()
    await expect(page.getByText('Nenhum look ainda')).toBeVisible({ timeout: 5000 })

    // 5. Go back to wardrobe, verify items still exist
    await navTo(page, 'Peças')
    await expect(page.getByText('3 peças')).toBeVisible({ timeout: 5000 })
  })
})
