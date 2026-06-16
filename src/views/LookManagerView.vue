<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLooks } from '../composables/useLooks'
import { getItemsByIds } from '../services/wardrobeService'

const router = useRouter()
const { looks, loading, loadLooks, deleteLook } = useLooks()
const showSheet = ref(false)
const selectedLook = ref(null)
const lookItems = ref([])
const itemUrls = ref([])
let isActive = true

onMounted(loadLooks)

onUnmounted(() => {
  isActive = false
  revokeAllUrls()
})

function revokeAllUrls() {
  for (const url of itemUrls.value) {
    URL.revokeObjectURL(url)
  }
  itemUrls.value = []
}

async function openLook(look) {
  revokeAllUrls()
  selectedLook.value = look
  const items = await getItemsByIds(look.itemIds || [])
  if (!isActive) return
  lookItems.value = items
  itemUrls.value = items.map((item) =>
    item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
  )
  showSheet.value = true
}

function closeSheet() {
  revokeAllUrls()
  showSheet.value = false
  selectedLook.value = null
  lookItems.value = []
}

async function handleDelete(look) {
  if (!confirm('Remover este look?')) return
  await deleteLook(look.id)
  if (selectedLook.value?.id === look.id) closeSheet()
  loadLooks()
}

function getItemUrl(index) {
  return itemUrls.value[index] || null
}
</script>

<template>
  <div class="px-4 pt-6 pb-4">
    <header class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Looks</h1>
      <p class="text-sm text-text-muted mt-0.5">{{ looks.length }} looks</p>
    </header>

    <button
      class="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-text-muted active:scale-[0.97] transition-transform duration-200 mb-5"
      @click="router.push('/?newLook=true')"
    >
      + Criar look
    </button>

    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="h-24 rounded-2xl bg-white/50 animate-pulse" />
    </div>

    <TransitionGroup v-else name="list" tag="div" class="flex flex-col gap-3">
      <div
        v-for="look in looks"
        :key="look.id"
        class="rounded-2xl bg-white shadow-soft p-4 active:scale-[0.97] transition-transform duration-200 cursor-pointer"
        @click="openLook(look)"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ look.description || 'Look sem nome' }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ look.itemIds?.length || 0 }} peças</p>
          </div>
          <svg
            class="w-5 h-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </TransitionGroup>

    <div v-if="!loading && looks.length === 0" class="text-center py-16">
      <p class="text-text-muted text-sm">Nenhum look ainda</p>
    </div>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showSheet" class="fixed inset-0 z-50 flex items-end">
          <div class="absolute inset-0 bg-black/20" @click="closeSheet" />
          <div
            class="relative w-full bg-white rounded-t-3xl shadow-soft-lg p-6 pb-10 max-h-[70vh] overflow-y-auto"
          >
            <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h2 class="text-lg font-bold mb-1">{{ selectedLook?.description || 'Look' }}</h2>
            <p class="text-sm text-text-muted mb-4">
              {{ selectedLook?.itemIds?.length || 0 }} peças
            </p>

            <div class="flex gap-3 flex-wrap mb-6">
              <div
                v-for="(item, index) in lookItems"
                :key="item.id"
                class="w-20 rounded-xl overflow-hidden bg-gray-50"
                @click="router.push(`/item/${item.id}`)"
              >
                <div class="aspect-[3/4] bg-gray-100">
                  <img
                    v-if="getItemUrl(index)"
                    :src="getItemUrl(index)"
                    :alt="item.description"
                    class="w-full h-full object-cover"
                  />
                </div>
                <p class="text-[10px] p-1 truncate text-text-muted">{{ item.type }}</p>
              </div>
            </div>

            <button
              class="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200"
              @click="handleDelete(selectedLook)"
            >
              Remover look
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
