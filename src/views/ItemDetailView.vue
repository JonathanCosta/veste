<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getItem, deleteItem, getLooksByItem, getItemsByIds } from '../services/wardrobeService'

const route = useRoute()
const router = useRouter()
const item = ref(null)
const looks = ref([])
const loading = ref(true)
const imageUrl = ref(null)

onMounted(async () => {
  const id = Number(route.params.id)
  item.value = await getItem(id)
  if (item.value?.imageBlob) {
    imageUrl.value = URL.createObjectURL(item.value.imageBlob)
  }
  if (item.value) {
    const lookRefs = await getLooksByItem(id)
    looks.value = lookRefs
  }
  loading.value = false
})

onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

async function handleDelete() {
  if (!confirm('Remover esta peça?')) return
  await deleteItem(item.value.id)
  router.push('/')
}
</script>

<template>
  <div v-if="loading" class="animate-pulse">
    <div class="h-[50vh] bg-gray-100" />
  </div>

  <div v-else-if="item" class="pb-6">
    <div class="relative h-[50vh] bg-gray-100 overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.description"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-text-muted">
        sem imagem
      </div>
      <button
        class="absolute top-4 left-4 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-transform duration-200"
        @click="router.back()"
      >
        <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
    </div>

    <div class="px-4 pt-5">
      <h1 class="text-xl font-bold">{{ item.description || 'Sem descrição' }}</h1>
      <p class="text-sm text-text-muted capitalize mt-1">{{ item.type }}</p>

      <div class="flex gap-3 mt-6">
        <button
          class="flex-1 py-2.5 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200"
          @click="router.push(`/?edit=${item.id}`)"
        >
          Editar
        </button>
        <button
          class="flex-1 py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 active:scale-[0.97] transition-transform duration-200"
          @click="handleDelete"
        >
          Remover
        </button>
      </div>

      <section v-if="looks.length" class="mt-8">
        <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Looks com esta peça
        </h2>
        <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <div
            v-for="look in looks"
            :key="look.id"
            class="shrink-0 w-36 rounded-2xl bg-white shadow-soft p-3 active:scale-95 transition-transform duration-200 cursor-pointer"
            @click="router.push(`/looks?edit=${look.id}`)"
          >
            <p class="text-xs font-medium truncate">{{ look.description || 'Look' }}</p>
            <p class="text-[10px] text-text-muted mt-1">{{ look.itemIds?.length || 0 }} peças</p>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="text-center py-16">
    <p class="text-text-muted">Peça não encontrada</p>
    <button class="mt-4 text-sm text-accent underline" @click="router.push('/')">Voltar</button>
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
