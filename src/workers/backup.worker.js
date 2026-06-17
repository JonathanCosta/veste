/**
 * Web Worker for backup/restore operations.
 * Handles JSZip compression/decompression off the main thread.
 *
 * Message protocol:
 *   Main → Worker:
 *     { type: 'EXPORT_START' }
 *     { type: 'EXPORT_CHUNK', items: Array, looks: Array }
 *       - items/looks are objects that MAY contain `imageBlob: Blob`
 *       - the worker adds each blob as `images/item_X.webp` or `images/look_X.webp`
 *     { type: 'EXPORT_FINALIZE', dataJson: string }
 *       - dataJson is the pre-serialized JSON for data.json
 *     { type: 'IMPORT_START', zipBlob: Blob }
 *     { type: 'ABORT' }
 *
 *   Worker → Main:
 *     { type: 'PROGRESS', phase: string, current: number, total: number }
 *     { type: 'SUCCESS', blob: Blob }
 *       - Transferable blob for download
 *     { type: 'SUCCESS_IMPORT', items: Array, categories: Array, looks: Array, calendar_logs: Array }
 *       - Parsed + hydrated data ready for Dexie insertion
 *     { type: 'ERROR', error: string }
 */
import JSZip from 'jszip'

let currentZip = null
let abortRequested = false

self.onmessage = async (e) => {
  const msg = e.data

  if (msg.type === 'ABORT') {
    abortRequested = true
    currentZip = null
    return
  }

  try {
    switch (msg.type) {
      case 'EXPORT_START':
        abortRequested = false
        currentZip = new JSZip()
        self.postMessage({ type: 'PROGRESS', phase: 'init', current: 0, total: 0 })
        break

      case 'EXPORT_CHUNK':
        if (abortRequested || !currentZip) return
        handleChunk(msg)
        break

      case 'EXPORT_FINALIZE':
        if (abortRequested || !currentZip) return
        await handleFinalize(msg)
        break

      case 'IMPORT_START':
        abortRequested = false
        await handleImport(msg)
        break

      default:
        self.postMessage({ type: 'ERROR', error: `Unknown message type: ${msg.type}` })
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: err.message || String(err) })
  }
}

// ─── Export helpers ───────────────────────────────────────────────

function handleChunk(msg) {
  const { items = [], looks = [] } = msg

  for (const item of items) {
    if (abortRequested) return
    if (item.imageBlob) {
      currentZip.file(`images/item_${item.id}.webp`, item.imageBlob)
    }
  }

  for (const look of looks) {
    if (abortRequested) return
    if (look.imageBlob) {
      currentZip.file(`images/look_${look.id}.webp`, look.imageBlob)
    }
  }
}

async function handleFinalize(msg) {
  const { dataJson } = msg

  currentZip.file('data.json', dataJson)

  self.postMessage({ type: 'PROGRESS', phase: 'compressing', current: 0, total: 0 })

  const blob = await currentZip.generateAsync({ type: 'blob' })
  currentZip = null

  if (abortRequested) return
  if (blob.size === 0) {
    self.postMessage({ type: 'ERROR', error: 'Arquivo ZIP gerado está vazio.' })
    return
  }

  // Send the blob to main thread (structured clone)
  self.postMessage({ type: 'SUCCESS', blob })
}

// ─── Import ───────────────────────────────────────────────────────

async function handleImport(msg) {
  const { zipBlob } = msg

  self.postMessage({ type: 'PROGRESS', phase: 'extracting', current: 0, total: 0 })

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
  if (!Array.isArray(parsed.calendar_logs)) {
    throw new Error('Backup inválido: calendar_logs deve ser um array')
  }

  // Validate IDs
  for (const item of parsed.items) {
    if (abortRequested) return
    if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0) {
      throw new Error('Backup inválido: item id deve ser um inteiro positivo')
    }
  }
  for (const look of parsed.looks) {
    if (abortRequested) return
    if (typeof look.id !== 'number' || !Number.isInteger(look.id) || look.id <= 0) {
      throw new Error('Backup inválido: look id deve ser um inteiro positivo')
    }
  }

  const total =
    parsed.items.length +
    parsed.categories.length +
    parsed.looks.length +
    parsed.calendar_logs.length
  let processed = 0

  // Hydrate items with blobs
  const hydratedItems = []
  for (const item of parsed.items) {
    if (abortRequested) return
    const imgFile = zip.file(`images/item_${item.id}.webp`)
    let blob
    if (imgFile) {
      const rawBlob = await imgFile.async('blob')
      if (rawBlob.type === '' || rawBlob.type === 'image/webp') {
        blob = rawBlob
      }
    }
    hydratedItems.push({ ...item, imageBlob: blob })
    processed++
    if (processed % 20 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        phase: 'importing',
        current: processed,
        total,
      })
    }
  }

  // Hydrate looks with blobs
  const hydratedLooks = []
  for (const look of parsed.looks) {
    if (abortRequested) return
    const imgFile = zip.file(`images/look_${look.id}.webp`)
    let blob
    if (imgFile) {
      const rawBlob = await imgFile.async('blob')
      if (rawBlob.type === '' || rawBlob.type === 'image/webp') {
        blob = rawBlob
      }
    }
    hydratedLooks.push({ ...look, imageBlob: blob })
    processed++
  }

  self.postMessage({
    type: 'SUCCESS_IMPORT',
    items: hydratedItems,
    categories: parsed.categories,
    looks: hydratedLooks,
    calendar_logs: parsed.calendar_logs,
  })
}
