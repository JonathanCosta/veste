<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ItemCard from '../components/ItemCard.vue'
import { useItems } from '../composables/useItems'
import { ITEM_TYPES } from '../services/wardrobeService'

const router = useRouter()
const { items, loading, loadItems } = useItems()
const search = ref('')
const activeFilter = ref('')

const filteredItems = computed(() => {
  let list = items.value
  if (activeFilter.value) {
    list = list.filter((i) => i.type === activeFilter.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((i) => (i.description || '').toLowerCase().includes(q))
  }
  return list
})

onMounted(loadItems)
</script>

<template>
  <div class="px-4 pb-4">
    <!-- Centered logo mark -->
    <div class="flex justify-center pt-4 pb-3">
      <img src="/logo.png" alt="Veste Logo" class="h-8 w-8 object-contain" />
    </div>

    <header class="mt-2 mb-5">
      <h1 class="text-2xl font-bold tracking-tight">guarda roupa</h1>
      <p class="text-sm text-text-muted mt-0.5">{{ filteredItems.length }} peças</p>
    </header>

    <div class="relative mb-4">
      <input
        v-model="search"
        type="search"
        placeholder="Buscar peças..."
        class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
      />
    </div>

    <div class="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
      <button
        class="shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
        :class="
          activeFilter === ''
            ? 'text-white bg-accent rounded-lg shadow-[0_6px_20px_rgba(45,45,45,0.25)] border border-accent font-bold'
            : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
        "
        @click="activeFilter = ''"
      >
        Todas
      </button>
      <button
        v-for="type in ITEM_TYPES"
        :key="type"
        class="shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
        :class="
          activeFilter === type
            ? 'text-white bg-accent rounded-lg shadow-[0_6px_20px_rgba(45,45,45,0.25)] border border-accent font-bold'
            : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
        "
        @click="activeFilter = activeFilter === type ? '' : type"
      >
        {{
          type === 'top'
            ? 'Parte de Cima'
            : type === 'bottom'
              ? 'Parte de Baixo'
              : type === 'full'
                ? 'Inteiro'
                : type === 'shoes'
                  ? 'Calçados'
                  : 'Acessórios'
        }}
      </button>
    </div>

    <!-- Drawer Front Container — simulates the front panel of an open drawer -->
    <template v-if="loading">
      <div
        class="bg-[#FCFCFA] rounded-t-[2.5rem] p-5 shadow-[0_-12px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] border-t border-gray-200/60 mt-4 min-h-[70vh]"
      >
        <div class="grid grid-cols-2 gap-4 animate-pulse">
          <div v-for="n in 4" :key="n" class="flex flex-col gap-2">
            <div class="w-full aspect-[3/4] bg-neutral-200 rounded-2xl" />
            <div class="w-3/4 h-3 bg-neutral-200 rounded mt-1" />
            <div class="w-1/2 h-2.5 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="filteredItems.length === 0">
      <div
        class="bg-[#FCFCFA] rounded-t-[2.5rem] p-5 shadow-[0_-12px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] border-t border-gray-200/60 mt-4 min-h-[70vh]"
      >
        <div class="text-center py-16">
          <p class="text-text-muted text-sm">Nenhuma peça encontrada</p>
        </div>
      </div>
    </template>

    <!-- Drawer container — simulates an open drawer with recessed depth -->
    <div
      v-else
      class="bg-[#FCFCFA] rounded-t-[2.5rem] p-5 shadow-[0_-12px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] border-t border-gray-200/60 mt-4 min-h-[70vh]"
    >
      <!-- Decorative slit simulating the drawer slide groove -->
      <div class="w-full h-[1px] bg-gray-200/80 mb-6 shadow-[0_1px_0_rgba(255,255,255,0.9)]"></div>
      <TransitionGroup name="list" tag="div" class="grid grid-cols-2 gap-3">
        <div v-for="item in filteredItems" :key="item.id" @click="router.push(`/item/${item.id}`)">
          <ItemCard :item="item" />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
