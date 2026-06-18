import Dexie from 'dexie'

const db = new Dexie('VesteDB')

db.version(1).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt',
})

db.version(2).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt',
  calendar_logs: '++id, date, entityType, entityId, order',
})

db.version(3).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt',
  calendar_logs: '++id, date, entityType, entityId, order',
})

export default db
