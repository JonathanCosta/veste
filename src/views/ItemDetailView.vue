<script setup>
import { ref, nextTick, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cropper from 'cropperjs'
import { useDialog } from '../composables/useDialog'
import {
  getItem,
  deleteItem,
  addItem,
  updateItem,
  getLooksByItem,
  ITEM_TYPES,
} from '../services/wardrobeService'
import { compressImage } from '../services/imageService'

const route = useRoute()
const router = useRouter()
const dialog = useDialog()

const fileInput = ref(null)
const isNew = computed(() => route.params.id === 'new')

const item = ref(null)
const looks = ref([])
const loading = ref(true)
const saving = ref(false)
const imageUrl = ref(null)
const imageFile = ref(null)
const isCropping = ref(false)

// Form fields
const formType = ref('top')
const formDescription = ref('')

// Edit mode
const isEditing = ref(false)

function enterEditMode() {
  if (!item.value) return
  formType.value = item.value.type || 'top'
  formDescription.value = item.value.description || ''
  isEditing.value = true
}

function cancelEdit() {
  if (showCrop.value) cancelCrop()
  isEditing.value = false
  // Revoke any newly cropped image and restore original
  if (imageFile.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = item.value?.imageBlob ? URL.createObjectURL(item.value.imageBlob) : null
    imageFile.value = null
  }
  formType.value = item.value?.type || 'top'
  formDescription.value = item.value?.description || ''
}

// Crop state
const showCrop = ref(false)
const cropImageUrl = ref('')
const cropContainerRef = ref(null)
let cropperInstance = null

async function loadItem(id) {
  loading.value = true
  item.value = null
  looks.value = []
  showCrop.value = false
  destroyCropper()
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
  }
  imageFile.value = null
  formType.value = 'top'
  formDescription.value = ''

  if (id === 'new') {
    loading.value = false
    return
  }
  const numericId = Number(id)
  if (!numericId) {
    loading.value = false
    return
  }
  try {
    item.value = await getItem(numericId)
    if (item.value?.imageBlob) {
      imageUrl.value = URL.createObjectURL(item.value.imageBlob)
    }
    if (item.value) {
      const lookRefs = await getLooksByItem(numericId)
      looks.value = lookRefs
    }
  } catch (e) {
    console.error('Failed to load item:', e)
    item.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (newId) => {
    loadItem(newId)
  },
  { immediate: true },
)

onUnmounted(() => {
  destroyCropper()
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

// ─── Crop helpers ───

function destroyCropper() {
  // NOTE: Do NOT set showCrop = false here. This is called from inside
  // startCropper() AFTER showCrop is set to true, which would hide the overlay.
  // The caller (loadItem, confirmCrop, cancelCrop) manages showCrop explicitly.
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  if (cropImageUrl.value) {
    URL.revokeObjectURL(cropImageUrl.value)
    cropImageUrl.value = ''
  }
}

function resetFileInput() {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    dialog.alert('Selecione apenas arquivos de imagem.')
    resetFileInput()
    return
  }

  // Revoke previous preview
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
  }
  imageFile.value = null

  // Use Blob URL instead of data URL (more memory efficient)
  cropImageUrl.value = URL.createObjectURL(file)
  showCrop.value = true

  // Init Cropper after DOM renders
  nextTick(() => {
    const container = cropContainerRef.value
    if (!container) return
    const img = container.querySelector('img')
    if (!img) return
    const startCropper = () => {
      // Only destroy Cropper instance, do NOT call destroyCropper() because
      // it revokes the Blob URL (URL.revokeObjectURL) which would invalidate
      // the <img> src before Cropper.js can initialize.
      if (cropperInstance) {
        cropperInstance.destroy()
        cropperInstance = null
      }
      cropperInstance = new Cropper(img, {
        template: `<cropper-canvas>
    <cropper-image rotatable scalable skewable translatable></cropper-image>
    <cropper-shade hidden></cropper-shade>
    <cropper-handle action="select" plain></cropper-handle>
    <cropper-selection initial-coverage="1" movable resizable aspect-ratio="0.75">
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
      <cropper-handle action="n-resize"></cropper-handle>
      <cropper-handle action="e-resize"></cropper-handle>
      <cropper-handle action="s-resize"></cropper-handle>
      <cropper-handle action="w-resize"></cropper-handle>
      <cropper-handle action="ne-resize"></cropper-handle>
      <cropper-handle action="nw-resize"></cropper-handle>
      <cropper-handle action="se-resize"></cropper-handle>
      <cropper-handle action="sw-resize"></cropper-handle>
    </cropper-selection>
  </cropper-canvas>`,
      })
    }
    if (img.complete) {
      startCropper()
    } else {
      img.onload = startCropper
      img.onerror = () => {
        dialog.alert('Falha ao carregar a imagem.')
        cancelCrop()
      }
    }
  })
}

async function confirmCrop() {
  if (!cropperInstance || isCropping.value) return
  isCropping.value = true
  try {
    // Cropper.js v2: use the SELECTION's $toCanvas() which crops to the
    // selected area, unlike the canvas-level $toCanvas() which renders
    // the entire viewport.
    const cropperSelection = cropperInstance.getCropperSelection()
    if (!cropperSelection) throw new Error('Cropper selection not found')

    const canvasEl = await cropperSelection.$toCanvas({
      width: 1080,
      height: 1080,
    })

    const blob = await new Promise((resolve) => {
      canvasEl.toBlob(
        (b) => {
          if (b) resolve(b)
        },
        'image/webp',
        0.85,
      )
    })

    if (!blob) throw new Error('Failed to generate blob')

    // Store cropped blob as the image file (already WebP)
    imageFile.value = blob
    // Show preview
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = URL.createObjectURL(blob)
    // Close crop overlay
    showCrop.value = false
    destroyCropper()
    resetFileInput()
  } catch (e) {
    console.error('Crop failed:', e)
    dialog.alert('Erro ao recortar imagem: ' + e.message)
  } finally {
    isCropping.value = false
  }
}

function rotateImage(deg) {
  const imageEl = cropperInstance?.getCropperImage()
  if (imageEl) imageEl.$rotate(`${deg}deg`)
}

function cancelCrop() {
  showCrop.value = false
  destroyCropper()
  resetFileInput()
}

// ─── Save / Delete ───

async function handleSave() {
  if (!formDescription.value.trim()) {
    await dialog.alert('Adicione uma descrição para a peça')
    return
  }
  saving.value = true
  try {
    const data = {
      type: formType.value,
      description: formDescription.value.trim(),
    }
    if (imageFile.value) {
      const blob =
        imageFile.value.type === 'image/webp'
          ? imageFile.value
          : await compressImage(imageFile.value)
      data.imageBlob = blob
    }

    if (isEditing.value && item.value?.id) {
      await updateItem(item.value.id, data)
      isEditing.value = false
      // Reload item to reflect changes
      await loadItem(item.value.id)
    } else {
      const id = await addItem(data)
      router.push(`/item/${id}`)
    }
  } catch (e) {
    await dialog.alert('Erro ao salvar: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  const ok = await dialog.confirm('Tem certeza que deseja remover esta peça?', 'Remover peça')
  if (!ok) return
  await deleteItem(item.value.id)
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Loading -->
    <div v-if="loading" class="animate-pulse">
      <div class="h-[50vh] bg-gray-100" />
    </div>

    <!-- Create mode -->
    <div v-else-if="isNew" class="px-4 pt-6 pb-24">
      <div class="flex items-center justify-between mb-6">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-transform duration-200"
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
        <h1 class="text-lg font-bold">Nova Peça</h1>
        <div class="w-9" />
      </div>

      <div
        class="aspect-[3/4] max-h-[40vh] rounded-2xl bg-white/70 shadow-soft overflow-hidden mb-5 flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform duration-200"
        @click="fileInput?.click()"
      >
        <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-cover" />
        <div v-else class="text-center text-text-muted">
          <svg class="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="text-sm">Adicionar foto</span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        />
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5"
            >Tipo</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in ITEM_TYPES"
              :key="t"
              class="px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-all duration-200 active:scale-90"
              :class="
                formType === t
                  ? 'bg-accent text-white'
                  : 'bg-white/70 text-text-muted ring-1 ring-gray-200/50'
              "
              @click="formType = t"
            >
              {{
                t === 'top'
                  ? 'Parte de Cima'
                  : t === 'bottom'
                    ? 'Parte de Baixo'
                    : t === 'full'
                      ? 'Inteiro'
                      : t === 'shoes'
                        ? 'Calçados'
                        : 'Acessórios'
              }}
            </button>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5"
            >Descrição</label
          >
          <input
            v-model="formDescription"
            type="text"
            placeholder="Ex: Camiseta branca básica"
            class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
          />
        </div>

        <button
          class="w-full py-3 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando...' : 'Salvar peça' }}
        </button>
      </div>
    </div>

    <!-- View mode -->
    <div v-else-if="item && !isEditing" class="pb-6">
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
            @click="enterEditMode"
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

    <!-- Edit mode -->
    <div v-else-if="item && isEditing" class="px-4 pt-6 pb-24">
      <div class="flex items-center justify-between mb-6">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-transform duration-200"
          @click="cancelEdit"
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
        <h1 class="text-lg font-bold">Editar Peça</h1>
        <div class="w-9" />
      </div>

      <div
        class="aspect-[3/4] max-h-[40vh] rounded-2xl bg-white/70 shadow-soft overflow-hidden mb-5 flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform duration-200"
        @click="fileInput?.click()"
      >
        <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-cover" />
        <div v-else class="text-center text-text-muted">
          <svg class="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="text-sm">Trocar foto</span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        />
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5"
            >Tipo</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in ITEM_TYPES"
              :key="t"
              class="px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-all duration-200 active:scale-90"
              :class="
                formType === t
                  ? 'bg-accent text-white'
                  : 'bg-white/70 text-text-muted ring-1 ring-gray-200/50'
              "
              @click="formType = t"
            >
              {{
                t === 'top'
                  ? 'Parte de Cima'
                  : t === 'bottom'
                    ? 'Parte de Baixo'
                    : t === 'full'
                      ? 'Inteiro'
                      : t === 'shoes'
                        ? 'Calçados'
                        : 'Acessórios'
              }}
            </button>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5"
            >Descrição</label
          >
          <input
            v-model="formDescription"
            type="text"
            placeholder="Ex: Camiseta branca básica"
            class="w-full bg-white/70 rounded-2xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow"
          />
        </div>

        <div class="flex gap-3">
          <button
            class="flex-1 py-3 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? 'Salvando...' : 'Salvar alterações' }}
          </button>
          <button
            class="flex-1 py-3 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 active:scale-[0.97] transition-transform duration-200"
            :disabled="saving"
            @click="cancelEdit"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else class="text-center py-16">
      <p class="text-text-muted">Peça não encontrada</p>
      <button class="mt-4 text-sm text-accent underline" @click="router.push('/')">Voltar</button>
    </div>

    <!-- Crop overlay — Estúdio Veste -->
    <Transition name="crop">
      <div v-if="showCrop" class="fixed inset-0 z-[70] flex flex-col bg-black">
        <div ref="cropContainerRef" class="flex-1 relative w-full h-full overflow-hidden">
          <!-- Top bar (gradient overlay) -->
          <div
            class="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-6 z-10"
          >
            <button
              class="text-sm font-medium text-white/70 tracking-wide active:scale-95 transition-transform"
              @click="cancelCrop"
            >
              Cancelar
            </button>
            <h2 class="text-xs font-bold uppercase tracking-widest text-white/90">Ajustar Foto</h2>
            <button
              class="text-sm font-bold text-white bg-accent px-4 py-1.5 rounded-full shadow-soft active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isCropping"
              @click="confirmCrop"
            >
              Concluir
            </button>
          </div>

          <!-- Cropper image -->
          <div class="absolute inset-0 w-full h-full bg-studio-bg z-0">
            <img
              v-if="cropImageUrl"
              :src="cropImageUrl"
              class="block max-w-full max-h-full opacity-0"
              @error="
                dialog.alert('Falha ao carregar a imagem.')
                cancelCrop()
              "
            />
          </div>

          <!-- Bottom toolbar (rotation) -->
          <div
            class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-8 flex justify-center gap-8 z-10"
          >
            <button
              class="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full text-white transition-all"
              @click="rotateImage(-90)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
            </button>
            <button
              class="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full text-white transition-all"
              @click="rotateImage(90)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

/* Crop overlay transition */
.crop-enter-active,
.crop-leave-active {
  transition: opacity 0.2s ease;
}
.crop-enter-from,
.crop-leave-to {
  opacity: 0;
}
</style>

<style>
cropper-canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
