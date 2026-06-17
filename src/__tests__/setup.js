import 'fake-indexeddb/auto'
import { beforeAll, afterEach, vi } from 'vitest'
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

// ─── Global mocks ──────────────────────────────────────────────

/**
 * Minimal Worker mock for jsdom environment.
 * Stores the last message and provides methods for assertions.
 * Does NOT execute worker script — tests requiring worker logic
 * should mock at the service level instead.
 */
vi.stubGlobal(
  'Worker',
  class MockWorker {
    constructor(url) {
      this.url = url
      this.onmessage = null
      this.onerror = null
      this._terminated = false
      this._lastMessage = null
    }

    postMessage(msg) {
      this._lastMessage = msg
    }

    terminate() {
      this._terminated = true
    }

    addEventListener(event, handler) {
      if (event === 'message') this.onmessage = handler
      if (event === 'error') this.onerror = handler
    }

    removeEventListener() {}
  },
)

// Polyfill for IntersectionObserver (used by WardrobeView infinite scroll)
if (!globalThis.IntersectionObserver) {
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.IntersectionObserver = MockIntersectionObserver
}

// Polyfill for URL.createObjectURL needed by image tests
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn()
}
