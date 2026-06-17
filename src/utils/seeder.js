import db from '../database/db'

// Only available in development mode
if (import.meta.env.PROD) {
  console.warn('[Seeder] Este módulo não deve ser importado em produção.')
}

const SAMPLE_DESCRIPTIONS = [
  'Camisa social branca',
  'Calça jeans azul',
  'Tênis casual preto',
  'Vestido floral',
  'Blazer cinza',
  'Saia midi plissada',
  'Camiseta básica preta',
  'Bermuda cargo verde',
  'Casaco de lã',
  'Mochila de couro',
]

const SAMPLE_TYPES = ['top', 'bottom', 'full', 'shoes', 'accessory']

/**
 * Seed the VesteDB with N test items.
 * @param {number} quantity - Number of items to create (default: 100)
 * @param {object} [options]
 * @param {(phase: string, current: number, total: number) => void} [options.onProgress]
 * @returns {Promise<number>} The number of items inserted
 */
export async function seedMockWardrobe(quantity = 100, options = {}) {
  const { onProgress } = options

  if (import.meta.env.PROD) {
    throw new Error('[Seeder] Não disponível em produção.')
  }

  console.log(`[Seeder] Iniciando injeção de ${quantity} peças no VesteDB...`)

  const items = []
  for (let i = 1; i <= quantity; i++) {
    items.push({
      type: SAMPLE_TYPES[i % SAMPLE_TYPES.length],
      description: `${SAMPLE_DESCRIPTIONS[i % SAMPLE_DESCRIPTIONS.length]} #${i}`,
      categoryId: 1,
      createdAt: Date.now() - i * 60000,
    })

    if (i % 50 === 0 && onProgress) {
      onProgress('items', i, quantity)
    }
  }

  await db.items.bulkAdd(items)
  console.log(`[Seeder] ${quantity} itens inseridos com sucesso.`)
  return quantity
}

// Expose globally for console access in dev mode
if (import.meta.env.DEV) {
  window.__VESTE_SEED = seedMockWardrobe
}
