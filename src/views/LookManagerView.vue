<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

// Edit look mode
const isEditingLook = ref(false)
const editDescription = ref('')
const editingItemIds = ref([])
const showAddItems = ref(false)

const availableItems = computed(() => {
  if (!editingItemIds.value.length) return allItems.value
  return allItems.value.filter((item) => !editingItemIds.value.includes(item.id))
})
const availableItemUrls = computed(() => {
  return availableItems.value.map((item) => {
    const idx = allItems.value.findIndex((i) => i.id === item.id)
    return idx >= 0 ? allItemUrls.value[idx] : null
  })
})

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
  if (isEditingLook.value) cancelLookEdit()
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

// ─── Edit look ──────────────────────────────────────────────────

function enterLookEditMode() {
  if (!selectedLook.value) return
  editDescription.value = selectedLook.value.description || ''
  editingItemIds.value = [...(selectedLook.value.itemIds || [])]
  showAddItems.value = false
  isEditingLook.value = true
}

function cancelLookEdit() {
  isEditingLook.value = false
  editDescription.value = ''
  editingItemIds.value = []
  showAddItems.value = false
}

async function removeLookItem(itemId) {
  if (editingItemIds.value.length <= 2) {
    await dialog.alert('Um look precisa ter pelo menos 2 peças')
    return
  }
  const idx = editingItemIds.value.indexOf(itemId)
  if (idx >= 0) {
    editingItemIds.value.splice(idx, 1)
  }
}

function toggleAddItem(itemId) {
  const idx = editingItemIds.value.indexOf(itemId)
  if (idx >= 0) {
    editingItemIds.value.splice(idx, 1)
  } else {
    editingItemIds.value.push(itemId)
  }
}

async function saveLookChanges() {
  if (editingItemIds.value.length < 2) {
    await dialog.alert('Selecione pelo menos 2 peças')
    return
  }
  const id = selectedLook.value?.id
  if (!id) return
  await updateLook(id, {
    description: editDescription.value.trim(),
    itemIds: [...editingItemIds.value],
  })
  // Refresh detail sheet with updated data
  selectedLook.value = {
    ...selectedLook.value,
    description: editDescription.value.trim(),
    itemIds: [...editingItemIds.value],
  }
  lookItems.value = await getItemsByIds(editingItemIds.value)
  // Revoke old URLs and create new ones
  for (const url of itemUrls.value) {
    URL.revokeObjectURL(url)
  }
  itemUrls.value = lookItems.value.map((item) =>
    item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
  )
  isEditingLook.value = false
  showAddItems.value = false
  loadLooks()
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

function getItemThumbUrl(itemId) {
  const idx = allItems.value.findIndex((i) => i.id === itemId)
  if (idx === -1) return null
  return allItemUrls.value[idx] || null
}
</script>

<template>
  <div class="px-4 pb-4">
    <!-- Centered logo mark -->
    <div class="flex justify-center pt-4 pb-3">
      <img src="/logo.png" alt="Veste Logo" class="h-8 w-8 object-contain" />
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
      <div
        v-for="n in 3"
        :key="n"
        class="bg-white/50 rounded-3xl p-4 animate-pulse flex items-center justify-between"
      >
        <div class="flex flex-col gap-2">
          <div class="h-4 bg-gray-200 rounded w-28" />
          <div class="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div class="flex -space-x-3 pr-2">
          <div v-for="m in 3" :key="m" class="w-12 h-16 bg-gray-200 rounded shadow-md" />
        </div>
      </div>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="flex flex-col gap-3">
      <div
        v-for="look in looks"
        :key="look.id"
        class="bg-white rounded-3xl p-4 shadow-soft border border-gray-100 flex items-center justify-between transition-transform active:scale-[0.99] cursor-pointer"
        @click="openLook(look)"
      >
        <div class="flex flex-col gap-1">
          <h3 class="font-bold text-base text-text-main tracking-tight">
            {{ look.description || 'Look Sem Nome' }}
          </h3>
          <span
            class="text-xs font-medium text-text-muted bg-gray-100 px-2.5 py-1 rounded-md w-fit"
          >
            {{ look.itemIds?.length || 0 }} peças
          </span>
        </div>

        <!-- Polaroid Stack — up to 3 item photos with physical rotation -->
        <div class="flex items-center -space-x-5 pr-2 select-none">
          <div
            v-for="(itemId, idx) in (look.itemIds || []).slice(0, 3)"
            :key="itemId"
            :class="[
              'w-12 h-16 bg-white p-0.5 rounded shadow-md border border-gray-200/60 transform object-cover flex-shrink-0 transition-transform',
              idx === 0 ? '-rotate-6' : '',
              idx === 1 ? 'rotate-3 translate-y-0.5 z-10' : '',
              idx === 2 ? 'rotate-12 z-20' : '',
            ]"
          >
            <img
              v-if="getItemThumbUrl(itemId)"
              :src="getItemThumbUrl(itemId)"
              class="w-full h-full object-cover rounded-sm"
              alt=""
            />
          </div>
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
            <!-- 3D Pull Handle — leather/metal knob -->
            <div class="w-full flex justify-center pt-3 pb-5 cursor-grab active:cursor-grabbing">
              <div
                class="w-14 h-3.5 bg-accent rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-neutral-700 relative flex items-center justify-center"
              >
                <!-- Metallic central fixation pin -->
                <div class="w-1 h-1 bg-neutral-400 rounded-full shadow-inner"></div>
              </div>
            </div>

            <div class="flex items-center justify-between mb-1">
              <h2 v-if="!isEditingLook" class="text-lg font-bold">
                {{ selectedLook?.description || 'Look' }}
              </h2>
              <input
                v-else
                v-model="editDescription"
                type="text"
                placeholder="Descrição do look"
                class="flex-1 bg-white/70 rounded-xl px-3 py-2 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
              />
              <button
                v-if="!isEditingLook"
                class="shrink-0 ml-2 text-xs font-medium text-accent underline underline-offset-2 active:scale-95 transition-transform"
                @click="enterLookEditMode"
              >
                Editar
              </button>
            </div>
            <p class="text-sm text-text-muted mb-4">
              {{ isEditingLook ? editingItemIds.length : selectedLook?.itemIds?.length || 0 }} peças
            </p>

            <!-- Look photo -->
            <div class="mb-4">
              <img
                v-if="lookPhotoUrl"
                :src="lookPhotoUrl"
                alt="Foto do look"
                class="w-full aspect-[3/4] object-cover rounded-2xl shadow-soft"
              />
              <button
                class="w-full flex items-center justify-center gap-2 text-sm text-text-muted border-2 border-dashed border-gray-200 rounded-2xl active:scale-[0.97] transition-transform duration-200"
                :class="lookPhotoUrl ? 'mt-2 py-2 border-gray-200/50' : 'py-3'"
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
                {{
                  savingPhoto
                    ? 'Salvando...'
                    : lookPhotoUrl
                      ? 'Alterar foto'
                      : 'Adicionar foto vestindo este look'
                }}
              </button>
              <input
                ref="lookFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleLookPhotoSelected"
              />
            </div>

            <div class="flex gap-3 flex-wrap mb-4">
              <div
                v-for="(item, index) in lookItems"
                :key="item.id"
                class="w-20 rounded-xl overflow-hidden bg-gray-50 relative"
                :class="isEditingLook ? '' : 'cursor-pointer'"
                @click="isEditingLook ? null : router.push(`/item/${item.id}`)"
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
                <!-- Remove overlay in edit mode -->
                <div
                  v-if="isEditingLook"
                  class="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl active:scale-95 transition-transform cursor-pointer"
                  @click.stop="removeLookItem(item.id)"
                >
                  <svg
                    class="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Add items section (edit mode only) -->
            <div v-if="isEditingLook" class="mb-4">
              <button
                class="w-full py-2 text-xs font-medium text-accent underline underline-offset-2 active:scale-95 transition-transform mb-3"
                @click="showAddItems = !showAddItems"
              >
                {{ showAddItems ? 'Recolher' : '+ Adicionar peças' }}
              </button>
              <div v-if="showAddItems">
                <p class="text-xs text-text-muted mb-2">Peças disponíveis</p>
                <div
                  v-if="availableItems.length === 0"
                  class="text-center py-4 text-text-muted text-xs"
                >
                  Todas as peças já estão neste look
                </div>
                <div v-else class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(item, index) in availableItems"
                    :key="item.id"
                    class="rounded-lg overflow-hidden bg-gray-50 ring-2 transition-all duration-200 cursor-pointer active:scale-95"
                    :class="
                      editingItemIds.includes(item.id)
                        ? 'ring-accent scale-[0.98] opacity-60'
                        : 'ring-transparent'
                    "
                    @click="toggleAddItem(item.id)"
                  >
                    <div class="aspect-[3/4] bg-gray-100">
                      <img
                        v-if="availableItemUrls[index]"
                        :src="availableItemUrls[index]"
                        :alt="item.description"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <p class="text-[10px] p-1 truncate text-text-muted">{{ item.type }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div v-if="isEditingLook" class="flex gap-2">
              <button
                class="flex-1 py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 active:scale-[0.97] transition-transform duration-200"
                @click="cancelLookEdit"
              >
                Cancelar
              </button>
              <button
                class="flex-1 py-2.5 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200 disabled:opacity-50"
                :disabled="editingItemIds.length < 2"
                @click="saveLookChanges"
              >
                Salvar alterações
              </button>
            </div>
            <button
              v-else
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
            <!-- 3D Pull Handle — leather/metal knob -->
            <div class="w-full flex justify-center pt-3 pb-5 cursor-grab active:cursor-grabbing">
              <div
                class="w-14 h-3.5 bg-accent rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-neutral-700 relative flex items-center justify-center"
              >
                <!-- Metallic central fixation pin -->
                <div class="w-1 h-1 bg-neutral-400 rounded-full shadow-inner"></div>
              </div>
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
