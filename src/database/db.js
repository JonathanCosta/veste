import Dexie from 'dexie'

const db = new Dexie('VesteDB')

db.version(1).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt',
})

export default db
