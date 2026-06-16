import JSZip from 'jszip'
import FileSaver from 'file-saver'
const { saveAs } = FileSaver
import db from '../database/db'

const MAX_ZIP_SIZE = 50 * 1024 * 1024 // 50 MB

export async function exportBackup() {
  const items = await db.items.toArray()
  const categories = await db.categories.toArray()
  const looks = await db.looks.toArray()

  const zip = new JSZip()

  const data = { items: [], categories, looks }

  for (const item of items) {
    const { imageBlob, ...rest } = item
    data.items.push(rest)
    if (imageBlob) {
      zip.file(`images/item_${item.id}.webp`, imageBlob)
    }
  }

  for (const look of looks) {
    if (look.imageBlob) {
      zip.file(`images/look_${look.id}.webp`, look.imageBlob)
      const { imageBlob, ...rest } = look
      data.looks = data.looks.map((l) => (l.id === look.id ? rest : l))
    }
  }

  zip.file('data.json', JSON.stringify(data, null, 2))
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `backup-veste-${Date.now()}.zip`)
}

function isValidId(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

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
    if (!isValidId(item.id)) {
      throw new Error('Invalid backup: item id must be a positive integer')
    }
  }
  for (const look of data.looks) {
    if (!isValidId(look.id)) {
      throw new Error('Invalid backup: look id must be a positive integer')
    }
  }
}

export async function importBackup(file) {
  if (file.size > MAX_ZIP_SIZE) {
    throw new Error(`File too large (max ${MAX_ZIP_SIZE / 1024 / 1024} MB)`)
  }

  const zip = await JSZip.loadAsync(file)
  const dataFile = zip.file('data.json')
  if (!dataFile) throw new Error('data.json not found in backup')

  const raw = await dataFile.async('text')
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Invalid backup: data.json is not valid JSON')
  }

  validateBackupData(data)

  await db.transaction('rw', db.items, db.categories, db.looks, async () => {
    await db.items.clear()
    await db.categories.clear()
    await db.looks.clear()

    for (const item of data.items) {
      const imgFile = zip.file(`images/item_${item.id}.webp`)
      let blob
      if (imgFile) {
        const rawBlob = await imgFile.async('blob')
        if (rawBlob.type === '' || rawBlob.type === 'image/webp') {
          blob = rawBlob
        }
      }
      await db.items.put({ ...item, imageBlob: blob })
    }

    for (const cat of data.categories) {
      await db.categories.put(cat)
    }

    for (const look of data.looks) {
      const imgFile = zip.file(`images/look_${look.id}.webp`)
      let blob
      if (imgFile) {
        const rawBlob = await imgFile.async('blob')
        if (rawBlob.type === '' || rawBlob.type === 'image/webp') {
          blob = rawBlob
        }
      }
      await db.looks.put({ ...look, imageBlob: blob })
    }
  })
}
