import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    // Run files sequentially — all share the same IndexedDB instance
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    fileParallelism: false,
  },
})
