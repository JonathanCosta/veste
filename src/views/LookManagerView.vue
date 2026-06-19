<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLooks } from '../composables/useLooks'
import { labelForType } from '../utils/labels'
import {
  getItems,
  getItemsByIds,
  addLook,
  updateLook,
  ITEM_TYPES,
} from '../services/wardrobeService'
import { compressImage } from '../services/imageService'
import { useDialog } from '../composables/useDialog'
import LogoIcon from '../components/LogoIcon.vue'

const router = useRouter()
const dialog = useDialog()

const { looks, loading, loadLooks, deleteLook } = useLooks()

// Search / filter
const searchLook = ref('')

const filteredLooks = computed(() => {
  const q = searchLook.value.trim().toLowerCase()
  if (!q) return looks.value
  return looks.value.filter((l) => (l.description || '').toLowerCase().includes(q))
})

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
const originalLookItemIds = ref([])

// Items available to add: those NOT in the original look
const availableItems = computed(() => {
  if (!originalLookItemIds.value.length) return allItems.value
  return allItems.value.filter((item) => !originalLookItemIds.value.includes(item.id))
})

// Reactive display for the look items section while editing
const editingLookDisplay = computed(() => {
  const originalIds = new Set(originalLookItemIds.value)
  const results = []

  // Original items — show with state normal or removed
  for (const item of lookItems.value) {
    const stillInEditing = editingItemIds.value.includes(item.id)
    results.push({
      ...item,
      _state: stillInEditing ? 'normal' : 'removed',
    })
  }

  // Newly added items (in editingItemIds but not in original)
  for (const id of editingItemIds.value) {
    if (!originalIds.has(id)) {
      const item = allItems.value.find((i) => i.id === id)
      if (item && !results.find((r) => r.id === id)) {
        results.push({ ...item, _state: 'added' })
      }
    }
  }

  return results
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

// Create sheet pagination + filter
const createVisibleCount = ref(24)
const CREATE_PAGE_SIZE = 24
const createFilter = ref('')

const createFilteredItems = computed(() => {
  let list = allItems.value
  if (createFilter.value) {
    list = list.filter((i) => i.type === createFilter.value)
  }
  return list
})

const createPaginatedItems = computed(() => {
  return createFilteredItems.value.slice(0, createVisibleCount.value)
})

const createHasMore = computed(() => {
  return createVisibleCount.value < createFilteredItems.value.length
})

// Edit sheet pagination + filter
const editVisibleCount = ref(24)
const EDIT_PAGE_SIZE = 24
const editFilter = ref('')

const editFilteredItems = computed(() => {
  let list = availableItems.value
  if (editFilter.value) {
    list = list.filter((i) => i.type === editFilter.value)
  }
  return list
})

const editPaginatedItems = computed(() => {
  return editFilteredItems.value.slice(0, editVisibleCount.value)
})

const editHasMore = computed(() => {
  return editVisibleCount.value < editFilteredItems.value.length
})

function loadMoreCreate() {
  createVisibleCount.value += CREATE_PAGE_SIZE
}

function toggleCreateFilter(type) {
  createFilter.value = createFilter.value === type ? '' : type
  createVisibleCount.value = CREATE_PAGE_SIZE
}

function loadMoreEdit() {
  editVisibleCount.value += EDIT_PAGE_SIZE
}

function toggleEditFilter(type) {
  editFilter.value = editFilter.value === type ? '' : type
  editVisibleCount.value = EDIT_PAGE_SIZE
}

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
  revokeAllItemUrls()
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
  originalLookItemIds.value = []
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
  originalLookItemIds.value = [...(selectedLook.value.itemIds || [])]
  editingItemIds.value = [...(selectedLook.value.itemIds || [])]
  showAddItems.value = false
  isEditingLook.value = true
}

function cancelLookEdit() {
  isEditingLook.value = false
  editDescription.value = ''
  editingItemIds.value = []
  originalLookItemIds.value = []
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

function getLookItemUrl(itemId) {
  const idx = lookItems.value.findIndex((i) => i.id === itemId)
  return idx >= 0 ? itemUrls.value[idx] || null : null
}
</script>

<template>
  <div class="px-4 pb-4">
    <!-- Brand icon mark -->
    <div class="flex justify-center pt-4 pb-1">
      <LogoIcon size="w-20 h-20" class="mx-auto" />
    </div>
    <p class="text-center text-xs text-text-muted pb-3">{{ filteredLooks.length }} looks</p>

    <button
      class="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-text-muted active:scale-[0.97] transition-transform duration-200 mb-5"
      @click="openCreateSheet"
    >
      + Criar look
    </button>

    <!-- Search -->
    <div class="relative mb-4">
      <input
        type="search"
        placeholder="Buscar looks..."
        class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
        :value="searchLook"
        @input="searchLook = $event.target.value"
      />
    </div>

    <!-- Loading -->
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3">
      <div
        v-for="n in 5"
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

    <!-- Empty: no looks at all -->
    <div v-else-if="looks.length === 0" class="text-center py-16">
      <p class="text-text-muted text-sm">Nenhum look ainda</p>
    </div>

    <!-- Empty: search returned nothing -->
    <div v-else-if="filteredLooks.length === 0" class="text-center py-16">
      <p class="text-text-muted text-sm">Nenhum look encontrado</p>
    </div>

    <!-- Looks list -->
    <TransitionGroup v-else name="list" tag="div" class="flex flex-col gap-3">
      <div
        v-for="look in filteredLooks"
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
                class="w-14 h-2.5 bg-accent rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-white/10 relative flex items-center justify-center"
              >
                <!-- Metallic central fixation pin -->
                <div class="w-1.5 h-1.5 rounded-full bg-white/40 shadow-inner"></div>
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

            <!-- Look photo (edit mode only) -->
            <div v-if="isEditingLook" class="mb-4">
              <img
                v-if="lookPhotoUrl"
                :src="lookPhotoUrl"
                alt="Foto do look"
                class="w-full aspect-[3/4] object-cover rounded-2xl shadow-soft"
              />
              <button
                class="w-full flex items-center justify-center gap-2 text-sm text-text-muted border-2 border-dashed border-gray-200 rounded-2xl active:scale-95 transition-transform duration-200"
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
            </div>

            <!-- View mode: Hero Visual + Recipe Grid -->
            <div v-if="!isEditingLook" class="mb-6">
              <!-- Hero: photo or polaroid stack -->
              <img
                v-if="lookPhotoUrl"
                :src="lookPhotoUrl"
                alt="Foto do look"
                class="w-full aspect-[3/4] object-cover rounded-2xl shadow-soft look-hero"
              />
              <div
                v-else
                class="flex items-center justify-center py-8 select-none look-hero"
                :class="
                  lookItems.length >= 4
                    ? '-space-x-8 sm:-space-x-10'
                    : lookItems.length === 3
                      ? '-space-x-6'
                      : lookItems.length === 2
                        ? '-space-x-4'
                        : ''
                "
              >
                <div
                  v-for="(item, idx) in lookItems.slice(0, 4)"
                  :key="item.id"
                  :class="[
                    'w-24 h-32 sm:w-28 sm:h-36 bg-white p-1 rounded shadow-soft-lg border border-gray-200/60 transform flex-shrink-0 transition-transform',
                    idx === 0 ? '-rotate-6 z-0' : '',
                    idx === 1 ? 'rotate-2 z-10' : '',
                    idx === 2 ? '-rotate-3 z-20 scale-105' : '',
                    idx === 3 ? 'rotate-6 z-30' : '',
                  ]"
                >
                  <img
                    v-if="getLookItemUrl(item.id)"
                    :src="getLookItemUrl(item.id)"
                    alt=""
                    class="w-full h-full object-cover rounded-sm"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-gradient-to-b from-[#F9F9F7] to-[#EDEDE8] rounded-sm flex items-center justify-center"
                  >
                    <svg
                      class="w-8 h-8 text-text-muted/50 stroke-[1.2]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 3a3 3 0 00-3 3v1m3-4a3 3 0 013 3v1m-3-4v4m0 0L3 13.5a1.5 1.5 0 00.5 2.5h17a1.5 1.5 0 00.5-2.5L12 8z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <!-- Photo upload button -->
              <button
                class="w-full flex items-center justify-center gap-2 text-sm text-text-muted border-2 border-dashed border-gray-200 rounded-2xl active:scale-95 transition-transform duration-200"
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

              <!-- Recipe Grid -->
              <p class="text-xs font-medium text-text-muted mb-3 mt-6 look-grid-title">
                peças deste look
              </p>
              <div class="grid grid-cols-3 gap-2 look-grid">
                <router-link
                  v-for="(item, index) in lookItems"
                  :key="item.id"
                  :to="`/item/${item.id}`"
                  class="rounded-2xl shadow-soft overflow-hidden bg-white active:scale-95 transition-transform duration-200 ease-out"
                >
                  <div class="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                    <img
                      v-if="getItemUrl(index)"
                      :src="getItemUrl(index)"
                      :alt="item.description || 'Peça'"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="w-full h-full bg-gradient-to-b from-[#F9F9F7] to-[#EDEDE8] flex flex-col items-center justify-center p-4 select-none"
                    >
                      <svg
                        class="w-10 h-10 text-text-muted/70 stroke-[1.2]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 3a3 3 0 00-3 3v1m3-4a3 3 0 013 3v1m-3-4v4m0 0L3 13.5a1.5 1.5 0 00.5 2.5h17a1.5 1.5 0 00.5-2.5L12 8z"
                        />
                      </svg>
                      <span
                        class="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mt-3"
                        >Sem Peça</span
                      >
                    </div>
                  </div>
                  <div class="p-2.5">
                    <p class="text-xs text-text-main font-medium truncate">
                      {{ item.description || 'Sem descrição' }}
                    </p>
                    <p class="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
                      {{ labelForType(item.type) }}
                    </p>
                  </div>
                </router-link>
              </div>
            </div>

            <!-- File input (shared) -->
            <input
              ref="lookFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleLookPhotoSelected"
            />

            <!-- Edit mode: reactive display with states -->
            <div v-if="isEditingLook" class="flex gap-3 flex-wrap mb-4">
              <div
                v-for="item in editingLookDisplay"
                :key="item.id"
                class="w-20 rounded-xl overflow-hidden bg-gray-50 relative transition-all duration-300"
                :class="{
                  'opacity-40 ring-2 ring-red-300 ring-inset': item._state === 'removed',
                  'ring-2 ring-accent ring-inset': item._state === 'added',
                  'ring-0': item._state === 'normal',
                }"
              >
                <div class="aspect-[3/4] bg-gray-100">
                  <img
                    v-if="getItemThumbUrl(item.id)"
                    :src="getItemThumbUrl(item.id)"
                    :alt="item.description"
                    class="w-full h-full object-cover"
                  />
                </div>
                <p class="text-[10px] p-1 truncate text-text-muted">
                  {{ labelForType(item.type) }}
                </p>

                <!-- Removed: re-add overlay -->
                <div
                  v-if="item._state === 'removed'"
                  class="absolute inset-0 flex items-center justify-center rounded-xl active:scale-95 transition-transform cursor-pointer"
                  @click.stop="toggleAddItem(item.id)"
                >
                  <span
                    class="text-[10px] font-bold text-red-500 bg-white/80 px-1.5 py-0.5 rounded"
                  >
                    Removida
                  </span>
                </div>
                <!-- Added: check overlay — click to remove -->
                <div
                  v-else-if="item._state === 'added'"
                  class="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  @click.stop="toggleAddItem(item.id)"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <!-- Normal: remove overlay -->
                <div
                  v-else
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

                <!-- Edit sheet filter pills -->
                <div
                  v-if="availableItems.length > 0"
                  class="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none"
                >
                  <button
                    class="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
                    :class="
                      editFilter === ''
                        ? 'text-white bg-accent rounded-lg font-bold'
                        : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
                    "
                    @click="toggleEditFilter('')"
                  >
                    Todas
                  </button>
                  <button
                    v-for="type in ITEM_TYPES"
                    :key="type"
                    class="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
                    :class="
                      editFilter === type
                        ? 'text-white bg-accent rounded-lg font-bold'
                        : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
                    "
                    @click="toggleEditFilter(type)"
                  >
                    {{ labelForType(type) }}
                  </button>
                </div>

                <div
                  v-if="editFilteredItems.length === 0"
                  class="text-center py-4 text-text-muted text-xs"
                >
                  Nenhuma peça disponível para adicionar
                </div>
                <div v-else class="grid grid-cols-3 gap-2">
                  <div
                    v-for="item in editPaginatedItems"
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
                        v-if="getItemThumbUrl(item.id)"
                        :src="getItemThumbUrl(item.id)"
                        :alt="item.description"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <p class="text-[10px] p-1 truncate text-text-muted">
                      {{ labelForType(item.type) }}
                    </p>
                  </div>
                </div>

                <!-- Edit sheet load more -->
                <button
                  v-if="editHasMore"
                  class="w-full mt-3 py-2 text-xs text-text-muted font-medium rounded-2xl ring-1 ring-gray-200 bg-white/80 active:scale-[0.97] transition-transform duration-200"
                  @click="loadMoreEdit"
                >
                  Ver mais
                  {{ Math.min(EDIT_PAGE_SIZE, editFilteredItems.length - editVisibleCount) }} peças
                </button>
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
                class="w-14 h-2.5 bg-accent rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-white/10 relative flex items-center justify-center"
              >
                <!-- Metallic central fixation pin -->
                <div class="w-1.5 h-1.5 rounded-full bg-white/40 shadow-inner"></div>
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

            <!-- Create sheet filter pills -->
            <div
              v-if="allItems.length > 0"
              class="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none"
            >
              <button
                class="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
                :class="
                  createFilter === ''
                    ? 'text-white bg-accent rounded-lg font-bold'
                    : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
                "
                @click="toggleCreateFilter('')"
              >
                Todas
              </button>
              <button
                v-for="type in ITEM_TYPES"
                :key="type"
                class="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-all duration-200 active:scale-95"
                :class="
                  createFilter === type
                    ? 'text-white bg-accent rounded-lg font-bold'
                    : 'text-text-muted bg-white border border-dashed border-gray-300 rounded-lg'
                "
                @click="toggleCreateFilter(type)"
              >
                {{ labelForType(type) }}
              </button>
              <span class="shrink-0 text-[10px] text-text-muted self-center ml-auto">
                {{ createFilteredItems.length }} peças
              </span>
            </div>

            <div
              v-if="createFilteredItems.length === 0"
              class="text-center py-4 text-text-muted text-sm"
            >
              Nenhuma peça encontrada
            </div>

            <div v-else class="grid grid-cols-3 gap-2 mb-3">
              <div
                v-for="item in createPaginatedItems"
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
                    v-if="getItemThumbUrl(item.id)"
                    :src="getItemThumbUrl(item.id)"
                    :alt="item.description"
                    class="w-full h-full object-cover"
                  />
                </div>
                <p class="text-[10px] p-1 truncate text-text-muted">
                  {{ labelForType(item.type) }}
                </p>
              </div>
            </div>

            <!-- Create sheet load more -->
            <button
              v-if="createHasMore"
              class="w-full mb-4 py-2 text-xs text-text-muted font-medium rounded-2xl ring-1 ring-gray-200 bg-white/80 active:scale-[0.97] transition-transform duration-200"
              @click="loadMoreCreate"
            >
              Ver mais
              {{ Math.min(CREATE_PAGE_SIZE, createFilteredItems.length - createVisibleCount) }}
              peças
            </button>

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

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.drawer-grid > * {
  content-visibility: auto;
  contain-intrinsic-size: 320px;
}

/* ─── Hero + Grid entrance animation ─────────────────────────── */

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.look-hero {
  animation: fadeInUp 0.5s ease-out 0.05s both;
}

.look-grid-title {
  animation: fadeInUp 0.4s ease-out 0.1s both;
}

.look-grid {
  content-visibility: auto;
  contain-intrinsic-size: 160px;
}

.look-grid > * {
  animation: fadeInUp 0.4s ease-out both;
}

.look-grid > *:nth-child(1) {
  animation-delay: 0.15s;
}
.look-grid > *:nth-child(2) {
  animation-delay: 0.2s;
}
.look-grid > *:nth-child(3) {
  animation-delay: 0.25s;
}
.look-grid > *:nth-child(4) {
  animation-delay: 0.3s;
}
.look-grid > *:nth-child(5) {
  animation-delay: 0.35s;
}
.look-grid > *:nth-child(6) {
  animation-delay: 0.4s;
}
.look-grid > *:nth-child(n + 7) {
  animation-delay: 0.45s;
}

/* router-link reset — card should look like a div */
.look-grid a,
.look-grid a:visited,
.look-grid a:hover {
  text-decoration: none;
  color: inherit;
  display: block;
}
</style>
