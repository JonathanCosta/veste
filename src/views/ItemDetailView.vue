<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

onMounted(async () => {
  if (isNew.value) {
    loading.value = false
    return
  }
  const id = Number(route.params.id)
  if (!id) {
    loading.value = false
    return
  }
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

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  imageFile.value = file
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageUrl.value = URL.createObjectURL(file)
}

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
      const blob = await compressImage(imageFile.value)
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
      @click="$refs.fileInput.click()"
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
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
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
