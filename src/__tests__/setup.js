import 'fake-indexeddb/auto'
import { beforeAll, afterEach } from 'vitest'
import db from '../database/db'

// Ensure DB is open for all tests
beforeAll(async () => {
  await db.open()
})

// Clear all data after each test file
afterEach(async () => {
  await db.items.clear()
  await db.categories.clear()
  await db.looks.clear()
})
