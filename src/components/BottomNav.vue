<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useWorkingState } from '../composables/useWorkingState'

const router = useRouter()
const route = useRoute()
const { isWorking } = useWorkingState()

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 w-full bg-white pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-soft z-40 px-6 flex justify-between items-center"
  >
    <!-- Peças -->
    <button
      class="flex flex-col items-center gap-1 transition-all duration-200 ease-out active:scale-95 group"
      :class="{ 'pointer-events-none opacity-40': isWorking }"
      @click="router.push('/')"
    >
      <svg
        :class="isActive('/') ? 'text-accent stroke-2' : 'text-text-muted stroke-[1.5]'"
        class="w-6 h-6 transition-colors duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 3a3 3 0 00-3 3v1m3-4a3 3 0 013 3v1m-3-4v4m0 0L3 13.5a1.5 1.5 0 00.5 2.5h17a1.5 1.5 0 00.5-2.5L12 8z"
        />
      </svg>
      <span
        :class="isActive('/') ? 'text-accent font-bold' : 'text-text-muted font-medium'"
        class="text-[10px] uppercase tracking-wider transition-colors duration-200"
      >
        Peças
      </span>
    </button>

    <!-- Novo (FAB) -->
    <button
      class="flex flex-col items-center gap-1 transition-all duration-200 ease-out active:scale-95 group relative -top-2"
      :class="{ 'pointer-events-none opacity-40': isWorking }"
      @click="router.push('/item/new')"
    >
      <div
        class="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-soft-lg border-4 border-white"
      >
        <svg class="w-5 h-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span
        :class="isActive('/item/new') ? 'text-accent font-bold' : 'text-text-muted font-medium'"
        class="text-[10px] uppercase tracking-wider transition-colors duration-200"
      >
        Novo
      </span>
    </button>

    <!-- Looks -->
    <button
      class="flex flex-col items-center gap-1 transition-all duration-200 ease-out active:scale-95 group"
      :class="{ 'pointer-events-none opacity-40': isWorking }"
      @click="router.push('/looks')"
    >
      <svg
        :class="isActive('/looks') ? 'text-accent stroke-2' : 'text-text-muted stroke-[1.5]'"
        class="w-6 h-6 transition-colors duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M14 8h4a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-4"
        />
      </svg>
      <span
        :class="isActive('/looks') ? 'text-accent font-bold' : 'text-text-muted font-medium'"
        class="text-[10px] uppercase tracking-wider transition-colors duration-200"
      >
        Looks
      </span>
    </button>

    <!-- Config -->
    <button
      class="flex flex-col items-center gap-1 transition-all duration-200 ease-out active:scale-95 group"
      :class="{ 'pointer-events-none opacity-40': isWorking }"
      @click="router.push('/settings')"
    >
      <svg
        :class="isActive('/settings') ? 'text-accent stroke-2' : 'text-text-muted stroke-[1.5]'"
        class="w-6 h-6 transition-colors duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 6h12M6 6a2 2 0 104 0M18 12H6M18 12a2 2 0 10-4 0M18 18H6M18 18a2 2 0 10-4 0"
        />
      </svg>
      <span
        :class="isActive('/settings') ? 'text-accent font-bold' : 'text-text-muted font-medium'"
        class="text-[10px] uppercase tracking-wider transition-colors duration-200"
      >
        Config
      </span>
    </button>
  </nav>
</template>
