<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import ItemCard from '../components/ItemCard.vue'
import { useItems } from '../composables/useItems'
import { labelForType } from '../utils/labels'
import { ITEM_TYPES } from '../services/wardrobeService'

const router = useRouter()
const { items, loading, loadItems } = useItems()
const search = ref('')
const activeFilter = ref('')
const corFiltroAtivo = ref('')
const visibleCount = ref(20)
const PAGE_SIZE = 20
const isLoadingMore = ref(false)

// IntersectionObserver for infinite scroll
const sentinel = ref(null)
let observer = null

const filteredItems = computed(() => {
  let list = items.value
  if (activeFilter.value) {
    list = list.filter((i) => i.type === activeFilter.value)
  }
  if (corFiltroAtivo.value) {
    list = list.filter((i) => i.cor === corFiltroAtivo.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((i) => (i.description || '').toLowerCase().includes(q))
  }
  return list
})

const categoryCounts = computed(() => {
  const list = items.value
  const counts = { todas: list.length, top: 0, bottom: 0, full: 0, shoes: 0, accessory: 0 }
  for (const item of list) {
    if (counts[item.type] !== undefined) counts[item.type]++
  }
  return counts
})

const itemsFiltradosPorTipo = computed(() => {
  if (!activeFilter.value) return items.value
  return items.value.filter((i) => i.type === activeFilter.value)
})

const coresEmUso = computed(() => {
  return [...new Set(itemsFiltradosPorTipo.value.map((p) => p.cor).filter(Boolean))]
})

const paginatedItems = computed(() => {
  return filteredItems.value.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  return visibleCount.value < filteredItems.value.length
})

function loadMore() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true
  visibleCount.value += PAGE_SIZE
  nextTick(() => {
    isLoadingMore.value = false
  })
}

// Reset pagination when filter or search changes
function resetFilter() {
  activeFilter.value = ''
  visibleCount.value = PAGE_SIZE
  reattachObserver()
}

function toggleFilter(type) {
  activeFilter.value = activeFilter.value === type ? '' : type
  visibleCount.value = PAGE_SIZE
  reattachObserver()
}

function toggleCorFilter(cor) {
  corFiltroAtivo.value = corFiltroAtivo.value === cor ? '' : cor
  visibleCount.value = PAGE_SIZE
  reattachObserver()
}

function handleSearchInput(val) {
  search.value = val
  visibleCount.value = PAGE_SIZE
  reattachObserver()
}

function reattachObserver() {
  nextTick(() => {
    observer?.disconnect()
    if (sentinel.value && hasMore.value) {
      observer?.observe(sentinel.value)
    }
  })
}

function setupObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value) {
        loadMore()
      }
    },
    { rootMargin: '400px' },
  )
  reattachObserver()
}

onMounted(async () => {
  await loadItems()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
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
        type="search"
        placeholder="Buscar peças..."
        class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
        :value="search"
        @input="handleSearchInput($event.target.value)"
      />
    </div>

    <div class="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
      <button
        class="shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
        :class="
          activeFilter === ''
            ? 'text-white bg-accent rounded-lg shadow-soft border border-accent font-bold'
            : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
        "
        @click="resetFilter()"
      >
        Todas
        <span class="ml-1.5 text-xs opacity-60">({{ categoryCounts.todas }})</span>
      </button>
      <button
        v-for="type in ITEM_TYPES"
        :key="type"
        class="shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
        :class="
          activeFilter === type
            ? 'text-white bg-accent rounded-lg shadow-soft border border-accent font-bold'
            : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
        "
        @click="toggleFilter(type)"
      >
        {{ labelForType(type) }}
        <span class="ml-1.5 text-xs opacity-60">({{ categoryCounts[type] }})</span>
      </button>
    </div>

    <!-- Color filter bar — dynamic from items in use -->
    <div v-if="coresEmUso.length" class="flex overflow-x-auto gap-4 py-2 px-2 mb-2 scrollbar-none">
      <button
        class="h-10 px-5 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 shadow-sm text-xs font-semibold text-neutral-600 transition-all duration-200 ease-out active:scale-95"
        :class="
          corFiltroAtivo === ''
            ? 'ring-2 ring-accent ring-offset-2 ring-offset-app-bg scale-110'
            : 'opacity-60'
        "
        @click="toggleCorFilter('')"
      >
        TOD
      </button>
      <button
        v-for="cor in coresEmUso"
        :key="cor"
        class="w-10 h-10 rounded-full flex-shrink-0 border border-black/5 shadow-sm transition-all duration-200 ease-out active:scale-95"
        :class="
          corFiltroAtivo === cor
            ? 'ring-2 ring-accent ring-offset-2 ring-offset-app-bg scale-110'
            : ''
        "
        :style="{ backgroundColor: cor }"
        @click="toggleCorFilter(cor)"
      />
    </div>

    <!-- Drawer Front Container — initial loading skeleton -->
    <template v-if="loading">
      <div
        class="bg-[#FCFCFA] rounded-t-[2.5rem] p-5 shadow-[0_-12px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] border-t border-gray-200/60 mt-4 min-h-[70vh]"
      >
        <div class="grid grid-cols-2 gap-4 animate-pulse">
          <div v-for="n in 6" :key="n" class="flex flex-col gap-2">
            <div class="w-full aspect-[3/4] bg-gray-200 rounded-2xl shadow-soft" />
            <div class="w-3/4 h-3 bg-gray-200 rounded mt-1" />
            <div class="w-1/2 h-2.5 bg-gray-200 rounded" />
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
      <TransitionGroup name="list" tag="div" class="grid grid-cols-2 gap-3 drawer-grid">
        <div
          v-for="(item, index) in paginatedItems"
          :key="item.id"
          :style="{ '--index': index }"
          @click="router.push(`/item/${item.id}`)"
        >
          <ItemCard :item="item" />
        </div>
      </TransitionGroup>

      <!-- Sentinel for infinite scroll -->
      <div ref="sentinel" class="h-4" />

      <!-- Load more button (fallback) -->
      <button
        v-if="hasMore"
        class="w-full mt-2 py-3 text-sm text-text-muted font-medium rounded-2xl ring-1 ring-gray-200 bg-white/80 active:scale-[0.97] transition-transform duration-200"
        @click="loadMore"
      >
        Ver mais {{ Math.min(PAGE_SIZE, filteredItems.length - visibleCount) }} peças
      </button>
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

.list-enter-active {
  transition-delay: calc(var(--index, 0) * 30ms);
}

.drawer-grid > * {
  content-visibility: auto;
  contain-intrinsic-size: 320px;
}
</style>
