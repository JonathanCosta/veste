<script setup>
import { ref, nextTick, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cropper from 'cropperjs'
import {
  getItem,
  deleteItem,
  addItem,
  getLooksByItem,
  ITEM_TYPES,
} from '../services/wardrobeService'
import { compressImage } from '../services/imageService'

const route = useRoute()
const router = useRouter()

const fileInput = ref(null)
const isNew = computed(() => route.params.id === 'new')

const item = ref(null)
const looks = ref([])
const loading = ref(true)
const saving = ref(false)
const imageUrl = ref(null)
const imageFile = ref(null)

// Form fields
const formType = ref('top')
const formDescription = ref('')

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

  // Revoke previous preview
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
  }
  imageFile.value = null

  // Read file as data URL for Cropper.js
  const reader = new FileReader()
  reader.onload = (e) => {
    cropImageUrl.value = e.target.result
    showCrop.value = true
    // Init Cropper after DOM renders
    nextTick(() => {
      const container = cropContainerRef.value
      if (!container) return
      const img = container.querySelector('img')
      if (!img) return
      const startCropper = () => {
        destroyCropper()
        cropperInstance = new Cropper(img, {
          aspectRatio: 3 / 4,
          viewMode: 2,
          background: false,
          autoCropArea: 0.85,
          responsive: true,
        })
      }
      if (img.complete) {
        startCropper()
      } else {
        img.onload = startCropper
      }
    })
  }
  reader.readAsDataURL(file)
}

async function confirmCrop() {
  if (!cropperInstance) return
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
    alert('Erro ao recortar imagem: ' + e.message)
  }
}

function cancelCrop() {
  showCrop.value = false
  destroyCropper()
  resetFileInput()
}

// ─── Save / Delete ───

async function handleSave() {
  if (!formDescription.value.trim()) {
    alert('Adicione uma descrição para a peça')
    return
  }
  saving.value = true
  try {
    const newItem = {
      type: formType.value,
      description: formDescription.value.trim(),
    }
    if (imageFile.value) {
      // If already a WebP blob (from crop), use directly.
      // Otherwise compress the original file.
      const blob =
        imageFile.value.type === 'image/webp'
          ? imageFile.value
          : await compressImage(imageFile.value)
      newItem.imageBlob = blob
    }
    const id = await addItem(newItem)
    router.push(`/item/${id}`)
  } catch (e) {
    alert('Erro ao salvar: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!confirm('Remover esta peça?')) return
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

    <!-- View/Edit mode -->
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

    <!-- Not found -->
    <div v-else class="text-center py-16">
      <p class="text-text-muted">Peça não encontrada</p>
      <button class="mt-4 text-sm text-accent underline" @click="router.push('/')">Voltar</button>
    </div>

    <!-- Crop overlay -->
    <Transition name="crop">
      <div v-if="showCrop" class="fixed inset-0 z-50 flex flex-col bg-black">
        <!-- Top bar -->
        <div class="flex items-center justify-between px-4 py-3 bg-black shrink-0">
          <button class="text-white/80 text-sm" @click="cancelCrop">Cancelar</button>
          <span class="text-white text-sm font-medium">Ajustar foto</span>
          <button class="text-accent text-sm font-semibold" @click="confirmCrop">Confirmar</button>
        </div>

        <!-- Cropper container -->
        <div ref="cropContainerRef" class="flex-1 flex items-center justify-center overflow-hidden">
          <img v-if="cropImageUrl" :src="cropImageUrl" class="max-w-full max-h-full" />
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
/* Override Cropper.js styles for dark background */
.cropper-view-box {
  outline: 1px solid theme('colors.accent');
  outline-color: rgba(45, 45, 45, 0.75);
}
.cropper-line {
  background-color: theme('colors.accent');
}
.cropper-point {
  background-color: theme('colors.accent');
  width: 10px;
  height: 10px;
}
.cropper-point.point-se {
  width: 12px;
  height: 12px;
}
</style>
