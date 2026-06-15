<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  { name: 'Peças', path: '/', icon: 'grid' },
  { name: 'Novo', path: '/item/new', icon: 'plus' },
  { name: 'Looks', path: '/looks', icon: 'layers' },
  { name: 'Config', path: '/settings', icon: 'settings' },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-100"
  >
    <div class="flex items-center justify-around py-2 max-w-lg mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="flex flex-col items-center gap-0.5 px-4 py-1 transition-transform duration-200 ease-out active:scale-90"
        @click="router.push(tab.path)"
      >
        <div
          class="w-1.5 h-1.5 rounded-full mb-0.5"
          :class="isActive(tab.path) ? 'bg-accent' : 'bg-transparent'"
        />
        <span
          class="text-[10px] font-medium uppercase tracking-wider"
          :class="isActive(tab.path) ? 'text-accent' : 'text-text-muted'"
        >
          {{ tab.name }}
        </span>
      </button>
    </div>
  </nav>
</template>
