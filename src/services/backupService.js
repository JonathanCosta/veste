/**
 * Backup service — orchestrates export/import via a Web Worker.
 *
 * The worker handles all JSZip compression/decompression off the main thread.
 * Items are read from Dexie in chunks (50 at a time) to keep heap pressure low.
 * Metadata (data.json) is built on the main thread and sent as a final string.
 */
import FileSaver from 'file-saver'
const { saveAs } = FileSaver
import db from '../database/db'

const CHUNK_SIZE = 50
const MAX_ZIP_SIZE = 50 * 1024 * 1024 // 50 MB

// ─── Export ────────────────────────────────────────────────────────

/**
 * Export all data to a .zip file.
 *
 * @param {object} [options]
 * @param {(progress: { phase: string, current: number, total: number }) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<void>}
 */
export async function exportBackup(options = {}) {
  const { onProgress, signal } = options

  const totalItems = await db.items.count()
  const totalLooks = await db.looks.count()

  if (totalItems === 0 && totalLooks === 0) {
    throw new Error('Nenhum dado para exportar.')
  }

  const worker = new Worker(new URL('../workers/backup.worker.js', import.meta.url), {
    type: 'module',
  })

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.terminate()
      if (signal) {
        try {
          signal.removeEventListener('abort', onAbort)
        } catch {}
      }
    }

    const onAbort = () => {
      worker.postMessage({ type: 'ABORT' })
      worker.terminate()
      reject(new DOMException('Exportação cancelada.', 'AbortError'))
    }

    if (signal) {
      if (signal.aborted) {
        worker.terminate()
        return reject(new DOMException('Exportação cancelada.', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    worker.onmessage = (e) => {
      const msg = e.data

      switch (msg.type) {
        case 'PROGRESS':
          onProgress?.(msg)
          break

        case 'SUCCESS': {
          saveAs(msg.blob, `backup-veste-${Date.now()}.zip`)
          cleanup()
          resolve()
          break
        }

        case 'ERROR':
          cleanup()
          reject(new Error(msg.error))
          break
      }
    }

    worker.onerror = (err) => {
      cleanup()
      reject(new Error(err.message || 'Erro no worker de exportação'))
    }

    // ── Kick off the export ──────────────────────────────
    ;(async () => {
      try {
        worker.postMessage({ type: 'EXPORT_START' })

        // Read items in chunks
        let itemsOffset = 0
        while (itemsOffset < totalItems) {
          if (signal?.aborted) {
            worker.postMessage({ type: 'ABORT' })
            worker.terminate()
            return
          }
          const chunk = await db.items.offset(itemsOffset).limit(CHUNK_SIZE).toArray()

          worker.postMessage({ type: 'EXPORT_CHUNK', items: chunk, looks: [] })
          itemsOffset += chunk.length

          onProgress?.({
            phase: 'items',
            current: Math.min(itemsOffset, totalItems),
            total: totalItems,
          })
        }

        // Read looks in chunks
        let looksOffset = 0
        while (looksOffset < totalLooks) {
          if (signal?.aborted) {
            worker.postMessage({ type: 'ABORT' })
            worker.terminate()
            return
          }
          const chunk = await db.looks.offset(looksOffset).limit(CHUNK_SIZE).toArray()

          worker.postMessage({ type: 'EXPORT_CHUNK', items: [], looks: chunk })
          looksOffset += chunk.length

          onProgress?.({
            phase: 'looks',
            current: Math.min(looksOffset, totalLooks),
            total: totalLooks,
          })
        }

        // Build metadata JSON on main thread (no Blobs)
        const allItems = await db.items.toArray()
        const allCategories = await db.categories.toArray()
        const allLooks = await db.looks.toArray()

        // Strip Blobs from data before serialization
        const allCalendarLogs = await db.calendar_logs.toArray()
        const data = {
          items: allItems.map(({ imageBlob, ...rest }) => rest),
          categories: allCategories,
          looks: allLooks.map(({ imageBlob, ...rest }) => rest),
          calendar_logs: allCalendarLogs,
        }
        const dataJson = JSON.stringify(data, null, 2)

        onProgress?.({ phase: 'compressing', current: 0, total: 0 })
        worker.postMessage({ type: 'EXPORT_FINALIZE', dataJson })
      } catch (err) {
        worker.postMessage({ type: 'ABORT' })
        worker.terminate()
        reject(err)
      }
    })()
  })
}

// ─── Import ────────────────────────────────────────────────────────

/**
 * Import data from a .zip backup file.
 *
 * @param {File} file - The .zip file selected by the user
 * @returns {Promise<void>}
 */
export async function importBackup(file) {
  if (file.size > MAX_ZIP_SIZE) {
    throw new Error(`Arquivo muito grande (máx ${MAX_ZIP_SIZE / 1024 / 1024} MB)`)
  }

  const worker = new Worker(new URL('../workers/backup.worker.js', import.meta.url), {
    type: 'module',
  })

  await new Promise((resolve, reject) => {
    const cleanup = () => worker.terminate()

    worker.onmessage = async (e) => {
      const msg = e.data

      switch (msg.type) {
        case 'PROGRESS':
          break

        case 'SUCCESS_IMPORT': {
          try {
            await db.transaction(
              'rw',
              db.items,
              db.categories,
              db.looks,
              db.calendar_logs,
              async () => {
                await db.items.clear()
                await db.categories.clear()
                await db.looks.clear()
                await db.calendar_logs.clear()

                for (const item of msg.items || []) {
                  await db.items.put(item)
                }
                for (const cat of msg.categories || []) {
                  await db.categories.put(cat)
                }
                for (const look of msg.looks || []) {
                  await db.looks.put(look)
                }
                for (const log of msg.calendar_logs || []) {
                  await db.calendar_logs.put(log)
                }
              },
            )
            cleanup()
            resolve()
          } catch (err) {
            cleanup()
            reject(new Error(`Erro ao restaurar dados: ${err.message}`))
          }
          break
        }

        case 'ERROR':
          cleanup()
          reject(new Error(msg.error))
          break
      }
    }

    worker.onerror = (err) => {
      cleanup()
      reject(new Error(err.message || 'Erro no worker de importação'))
    }

    // Read the file and send to worker
    file
      .arrayBuffer()
      .then((buffer) => {
        const blob = new Blob([buffer], { type: file.type || 'application/zip' })
        worker.postMessage({ type: 'IMPORT_START', zipBlob: blob })
      })
      .catch((err) => {
        cleanup()
        reject(new Error(`Erro ao ler arquivo: ${err.message}`))
      })
  })
}
