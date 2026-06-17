import db from '../database/db'

// Only available in development mode
if (import.meta.env.PROD) {
  console.warn('[Seeder] Este módulo não deve ser importado em produção.')
}

/**
 * Generate a compressible fake image blob (~100KB) that simulates a WebP.
 * Uses Math.random() + sinusoidal pattern — NOT cryptographic, but fast and
 * compressible enough for realistic JSZip benchmark results.
 */
function createFakeImageBlob(sizeKB = 100) {
  const size = sizeKB * 1024
  const arr = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    // Sinusoidal pattern + light noise = compressible, realistic
    arr[i] = Math.sin(i * 0.1) * 64 + 128 + (Math.random() * 20 - 10)
  }
  return new Blob([arr], { type: 'image/webp' })
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
 * @param {number} [options.imageSizeKB=100] - Size of each fake image blob
 * @param {(phase: string, current: number, total: number) => void} [options.onProgress]
 * @returns {Promise<number>} The number of items inserted
 */
export async function seedMockWardrobe(quantity = 100, options = {}) {
  const { imageSizeKB = 100, onProgress } = options

  if (import.meta.env.PROD) {
    throw new Error('[Seeder] Não disponível em produção.')
  }

  console.log(`[Seeder] Iniciando injeção de ${quantity} peças no VesteDB...`)

  const items = []
  for (let i = 1; i <= quantity; i++) {
    items.push({
      type: SAMPLE_TYPES[i % SAMPLE_TYPES.length],
      description: `${SAMPLE_DESCRIPTIONS[i % SAMPLE_DESCRIPTIONS.length]} #${i}`,
      imageBlob: createFakeImageBlob(imageSizeKB),
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
