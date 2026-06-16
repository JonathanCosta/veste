<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLooks } from '../composables/useLooks'
import { getItems, getItemsByIds, addLook, updateLook } from '../services/wardrobeService'
import { compressImage } from '../services/imageService'
import { useDialog } from '../composables/useDialog'

const router = useRouter()
const dialog = useDialog()

const { looks, loading, loadLooks, deleteLook } = useLooks()

// View look sheet
const showSheet = ref(false)
const selectedLook = ref(null)
const lookItems = ref([])
const itemUrls = ref([])
const lookPhotoUrl = ref(null)
const lookFileInput = ref(null)
const savingPhoto = ref(false)

// Create look sheet
const showCreateSheet = ref(false)
const createDescription = ref('')
const allItems = ref([])
const selectedItemIds = ref([])
const saving = ref(false)
const allItemUrls = ref([])

let isActive = true

onMounted(async () => {
  loadLooks()
  allItems.value = await getItems()
  allItemUrls.value = allItems.value.map((item) =>
    item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
  )
})

onUnmounted(() => {
  isActive = false
  revokeAllUrls()
  if (lookPhotoUrl.value) {
    URL.revokeObjectURL(lookPhotoUrl.value)
    lookPhotoUrl.value = null
  }
})

function revokeAllUrls() {
  for (const url of itemUrls.value) {
    URL.revokeObjectURL(url)
  }
  itemUrls.value = []
}

function revokeAllItemUrls() {
  for (const url of allItemUrls.value) {
    if (url) URL.revokeObjectURL(url)
  }
  allItemUrls.value = []
}

async function openLook(look) {
  revokeAllUrls()
  if (lookPhotoUrl.value) {
    URL.revokeObjectURL(lookPhotoUrl.value)
    lookPhotoUrl.value = null
  }
  selectedLook.value = look
  const items = await getItemsByIds(look.itemIds || [])
  if (!isActive) return
  lookItems.value = items
  itemUrls.value = items.map((item) =>
    item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
  )
  if (look.imageBlob) {
    lookPhotoUrl.value = URL.createObjectURL(look.imageBlob)
  }
  showSheet.value = true
}

function closeSheet() {
  revokeAllUrls()
  if (lookPhotoUrl.value) {
    URL.revokeObjectURL(lookPhotoUrl.value)
    lookPhotoUrl.value = null
  }
  showSheet.value = false
  selectedLook.value = null
  lookItems.value = []
}

async function handleLookPhotoSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  savingPhoto.value = true
  try {
    const blob = await compressImage(file)
    if (!selectedLook.value?.id) return
    await updateLook(selectedLook.value.id, { imageBlob: blob })
    // Update reactive state
    if (lookPhotoUrl.value) {
      URL.revokeObjectURL(lookPhotoUrl.value)
    }
    lookPhotoUrl.value = URL.createObjectURL(blob)
    selectedLook.value = { ...selectedLook.value, imageBlob: blob }
    loadLooks()
  } catch (e) {
    console.error('Failed to save look photo:', e)
    await dialog.alert('Erro ao salvar foto: ' + e.message)
  } finally {
    savingPhoto.value = false
    if (lookFileInput.value) {
      lookFileInput.value.value = ''
    }
  }
}

function toggleItemSelection(itemId) {
  const idx = selectedItemIds.value.indexOf(itemId)
  if (idx >= 0) {
    selectedItemIds.value.splice(idx, 1)
  } else {
    selectedItemIds.value.push(itemId)
  }
}

function openCreateSheet() {
  createDescription.value = ''
  selectedItemIds.value = []
  showCreateSheet.value = true
}

function closeCreateSheet() {
  showCreateSheet.value = false
}

async function handleCreateLook() {
  if (selectedItemIds.value.length < 2) {
    await dialog.alert('Selecione pelo menos 2 peças para criar um look')
    return
  }
  saving.value = true
  try {
    await addLook({
      description: createDescription.value.trim(),
      itemIds: [...selectedItemIds.value],
    })
    closeCreateSheet()
    loadLooks()
  } catch (e) {
    await dialog.alert('Erro ao criar look: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete(look) {
  const ok = await dialog.confirm('Tem certeza que deseja remover este look?', 'Remover look')
  if (!ok) return
  await deleteLook(look.id)
  if (selectedLook.value?.id === look.id) closeSheet()
  loadLooks()
}

function getItemUrl(index) {
  return itemUrls.value[index] || null
}
</script>

<template>
  <div class="px-4 pb-4">
    <!-- Brand header -->
    <div class="flex items-center gap-2 pt-4 pb-2">
      <img src="/logo.png" alt="Veste Logo" class="h-8 w-8 object-contain" />
      <span class="text-sm font-bold tracking-widest uppercase text-accent">Veste</span>
    </div>

    <header class="mt-2 mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Looks</h1>
      <p class="text-sm text-text-muted mt-0.5">{{ looks.length }} looks</p>
    </header>

    <button
      class="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-text-muted active:scale-[0.97] transition-transform duration-200 mb-5"
      @click="openCreateSheet"
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
            <!-- Minimalist drawer handle -->
            <div class="flex flex-col items-center mb-5">
              <div class="w-14 h-1.5 bg-accent/10 rounded-full shadow-inner" />
              <div class="w-10 h-px bg-accent/5 mt-0.5 rounded-full" />
            </div>

            <h2 class="text-lg font-bold mb-1">{{ selectedLook?.description || 'Look' }}</h2>
            <p class="text-sm text-text-muted mb-4">
              {{ selectedLook?.itemIds?.length || 0 }} peças
            </p>

            <!-- Look photo -->
            <div v-if="lookPhotoUrl" class="mb-4">
              <img
                :src="lookPhotoUrl"
                alt="Foto do look"
                class="w-full aspect-[3/4] object-cover rounded-2xl shadow-soft"
              />
            </div>
            <button
              v-else
              class="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-text-muted active:scale-[0.97] transition-transform duration-200 mb-4 flex items-center justify-center gap-2"
              :disabled="savingPhoto"
              @click="lookFileInput?.click()"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {{ savingPhoto ? 'Salvando...' : 'Adicionar foto vestindo este look' }}
            </button>
            <input
              ref="lookFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleLookPhotoSelected"
            />

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

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreateSheet" class="fixed inset-0 z-50 flex items-end">
          <div class="absolute inset-0 bg-black/20" @click="closeCreateSheet" />
          <div
            class="relative w-full bg-white rounded-t-3xl shadow-soft-lg p-6 pb-10 max-h-[80vh] overflow-y-auto"
          >
            <!-- Minimalist drawer handle -->
            <div class="flex flex-col items-center mb-5">
              <div class="w-14 h-1.5 bg-accent/10 rounded-full shadow-inner" />
              <div class="w-10 h-px bg-accent/5 mt-0.5 rounded-full" />
            </div>

            <h2 class="text-lg font-bold mb-1">Novo Look</h2>
            <p class="text-sm text-text-muted mb-4">Selecione pelo menos 2 peças</p>

            <input
              v-model="createDescription"
              type="text"
              placeholder="Descrição do look (opcional)"
              class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow mb-4"
            />

            <div v-if="allItems.length === 0" class="text-center py-6 text-text-muted text-sm">
              Nenhuma peça disponível. Adicione peças primeiro.
            </div>

            <div v-else class="grid grid-cols-3 gap-2 mb-5">
              <div
                v-for="(item, index) in allItems"
                :key="item.id"
                class="rounded-xl overflow-hidden bg-gray-50 ring-2 transition-all duration-200 cursor-pointer active:scale-95"
                :class="
                  selectedItemIds.includes(item.id)
                    ? 'ring-accent scale-[0.98] opacity-60'
                    : 'ring-transparent'
                "
                @click="toggleItemSelection(item.id)"
              >
                <div class="aspect-[3/4] bg-gray-100">
                  <img
                    v-if="allItemUrls[index]"
                    :src="allItemUrls[index]"
                    :alt="item.description"
                    class="w-full h-full object-cover"
                  />
                </div>
                <p class="text-[10px] p-1 truncate text-text-muted">{{ item.type }}</p>
              </div>
            </div>

            <button
              class="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200 disabled:opacity-50"
              :disabled="selectedItemIds.length < 2 || saving"
              @click="handleCreateLook"
            >
              {{ saving ? 'Salvando...' : `Criar look (${selectedItemIds.length} peças)` }}
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
