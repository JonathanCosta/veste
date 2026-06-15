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
  <div class="px-4 pt-6 pb-4">
    <header class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Guarda-Roupa</h1>
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
        class="shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 active:scale-90"
        :class="
          activeFilter === ''
            ? 'bg-accent text-white'
            : 'bg-white/70 text-text-muted ring-1 ring-gray-200/50'
        "
        @click="activeFilter = ''"
      >
        Todas
      </button>
      <button
        v-for="type in ITEM_TYPES"
        :key="type"
        class="shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-all duration-200 active:scale-90"
        :class="
          activeFilter === type
            ? 'bg-accent text-white'
            : 'bg-white/70 text-text-muted ring-1 ring-gray-200/50'
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

    <div v-if="loading" class="grid grid-cols-2 gap-3">
      <div v-for="n in 4" :key="n" class="rounded-2xl bg-white/50 animate-pulse">
        <div class="aspect-[3/4] bg-gray-100 rounded-t-2xl" />
        <div class="p-2.5 space-y-2">
          <div class="h-3 bg-gray-100 rounded w-3/4" />
          <div class="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>

    <TransitionGroup
      v-else
      :key="filteredItems.length"
      name="list"
      tag="div"
      class="grid grid-cols-2 gap-3"
    >
      <div v-for="item in filteredItems" :key="item.id" @click="router.push(`/item/${item.id}`)">
        <ItemCard :item="item" />
      </div>
    </TransitionGroup>

    <div v-if="!loading && filteredItems.length === 0" class="text-center py-16">
      <p class="text-text-muted text-sm">Nenhuma peça encontrada</p>
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
