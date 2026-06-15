import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/veste/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
      manifest: {
        name: 'Veste — Look do Dia',
        short_name: 'Veste',
        description: 'Guarda-roupa virtual offline-first',
        theme_color: '#F7F7F6',
        background_color: '#F7F7F6',
        display: 'standalone',
        start_url: '/veste/',
        icons: [
          {
            src: '/veste/icons/android/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/veste/icons/android/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
