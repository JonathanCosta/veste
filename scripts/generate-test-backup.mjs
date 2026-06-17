#!/usr/bin/env node

/**
 * Gera um arquivo .zip de backup do Veste com dados sintéticos,
 * pronto para ser importado via Settings → Importar backup.
 *
 * Uso:
 *   node scripts/generate-test-backup.mjs           → 200 peças
 *   node scripts/generate-test-backup.mjs 500       → 500 peças
 *   node scripts/generate-test-backup.mjs 200 --no-images
 *
 * O zip gerado segue o mesmo formato do exportBackup():
 *   data.json              → metadados (items, categories, looks)
 *   images/item_1.webp     → imagens placeholder
 *   images/look_1.webp     → imagem do look (se houver)
 */

import JSZip from 'jszip'
import { writeFileSync } from 'fs'

// ─── Config ──────────────────────────────────────────────────────

const QUANTITY = parseInt(process.argv[2], 10) || 200
const NO_IMAGES = process.argv.includes('--no-images')
const IMAGE_SIZE_KB = 50
const OUTPUT_FILE = `backup-veste-teste-${QUANTITY}.zip`

// ─── Sample data ─────────────────────────────────────────────────

const SAMPLE_DESCRIPTIONS = [
  'Camisa social branca',
  'Camisa social azul clara',
  'Camisa social listrada',
  'Calça jeans azul escuro',
  'Calça jeans preta',
  'Calça social cinza',
  'Calça cargo verde',
  'Tênis casual preto',
  'Tênis esportivo branco',
  'Tênis slide marrom',
  'Vestido floral verão',
  'Vestido midi preto',
  'Blazer cinza chumbo',
  'Blazer azul marinho',
  'Jaqueta jeans',
  'Casaco de lã bege',
  'Casaco corta-vento preto',
  'Saia midi plissada',
  'Saia jeans curta',
  'Camiseta básica preta',
  'Camiseta básica branca',
  'Camiseta estampada',
  'Bermuda cargo verde',
  'Bermuda jeans azul',
  'Mochila de couro preta',
  'Bolsa transversal',
  'Cinto slim marrom',
  'Óculos de sol aviador',
  'Chapéu panamá',
  'Lenço estampado',
  'Relógio prata',
  'Pulseira de miçangas',
]

const SAMPLE_TYPES = ['top', 'bottom', 'full', 'shoes', 'accessory']

const CATEGORIES = [
  { id: 1, name: 'Casual' },
  { id: 2, name: 'Social' },
  { id: 3, name: 'Esporte' },
  { id: 4, name: 'Festa' },
  { id: 5, name: 'Inverno' },
  { id: 6, name: 'Verão' },
  { id: 7, name: 'Acessórios' },
]

// ─── Helpers ─────────────────────────────────────────────────────

function createFakeImageData(sizeKB = IMAGE_SIZE_KB) {
  const size = sizeKB * 1024
  const arr = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    arr[i] = (Math.sin(i * 0.1) * 64 + 128) + (Math.random() * 20 - 10)
  }
  return arr
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Generate ─────────────────────────────────────────────────────

async function main() {
  console.log(`Gerando backup com ${QUANTITY} peças...`)
  const start = Date.now()

  const zip = new JSZip()
  const items = []
  const looks = []

  // ── Items ──────────────────────────────────────────────────
  for (let i = 1; i <= QUANTITY; i++) {
    const description = `${randomItem(SAMPLE_DESCRIPTIONS)} #${i}`
    const type = randomItem(SAMPLE_TYPES)
    const categoryId = randomItem(CATEGORIES).id

    const item = {
      id: i,
      type,
      description,
      categoryId,
      createdAt: Date.now() - i * 3600000, // 1h apart
    }

    if (!NO_IMAGES) {
      const imgData = createFakeImageData()
      zip.file(`images/item_${i}.webp`, imgData)
    }

    items.push(item)

    if (i % 50 === 0) {
      process.stdout.write(`  items: ${i}/${QUANTITY}\r`)
    }
  }
  process.stdout.write(`  items: ${QUANTITY}/${QUANTITY} ✓\n`)

  // ── Looks ──────────────────────────────────────────────────
  const lookCount = Math.min(Math.floor(QUANTITY / 4), 50)
  for (let j = 1; j <= lookCount; j++) {
    // Pick 2-4 random item IDs that exist
    const count = 2 + Math.floor(Math.random() * 3) // 2-4
    const itemIds = []
    for (let k = 0; k < count; k++) {
      const id = 1 + Math.floor(Math.random() * QUANTITY)
      if (!itemIds.includes(id)) itemIds.push(id)
    }
    if (itemIds.length < 2) continue

    const look = {
      id: j,
      description: `Look ${j}: ${randomItem(['Casual', 'Trabalho', 'Fim de Semana', 'Evento', 'Esporte'])}`,
      itemIds,
      createdAt: Date.now() - j * 7200000,
    }

    // 50% of looks get a placeholder image
    if (!NO_IMAGES && Math.random() > 0.5) {
      const imgData = createFakeImageData(30) // smaller
      zip.file(`images/look_${j}.webp`, imgData)
    }

    looks.push(look)
  }

  console.log(`  looks: ${looks.length} gerados`)

  // ── data.json ──────────────────────────────────────────────
  const data = { items, categories: CATEGORIES, looks }
  zip.file('data.json', JSON.stringify(data, null, 2))

  // ── Generate zip ──────────────────────────────────────────
  process.stdout.write('Comprimindo... ')
  const blob = await zip.generateAsync({ type: 'nodebuffer' })
  writeFileSync(OUTPUT_FILE, blob)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const sizeMB = (blob.byteLength / 1024 / 1024).toFixed(2)
  console.log(`✓ ${OUTPUT_FILE} (${sizeMB} MB em ${elapsed}s)`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
