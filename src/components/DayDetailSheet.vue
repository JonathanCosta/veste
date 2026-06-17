<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getLogsByDate, addCalendarLog, deleteCalendarLog } from '../services/calendarService'
import { getItems } from '../services/wardrobeService'
import { labelForType } from '../utils/labels'
import { useDialog } from '../composables/useDialog'
import db from '../database/db'

const props = defineProps({
  date: { type: String, required: true },
})

const emit = defineEmits(['close'])

const dialog = useDialog()

const loading = ref(true)
const logs = ref([])

/** Map "item-{id}" | "look-{id}" → entity row from Dexie */
const loadedEntities = ref({})
/** Map "item-{id}" | "look-{id}" → ObjectURL for thumbnail */
const entityUrls = ref({})

// ── Add panel state ─────────────────────────────────────────────────────
const showAddPanel = ref('') // '' | 'item' | 'look'
const allItems = ref([])
const allLooks = ref([])
const loadingPicker = ref(false)
const searchPicker = ref('')

// ── Helpers ──────────────────────────────────────────────────────────────

function entityKey(log) {
  return `${log.entityType}-${log.entityId}`
}

function getDisplayEntity(log) {
  return loadedEntities.value[entityKey(log)] || null
}

function getThumbnailUrl(log) {
  return entityUrls.value[entityKey(log)] || null
}

// ── Load logs for this date ──────────────────────────────────────────────

async function loadLogs() {
  loading.value = true
  try {
    logs.value = await getLogsByDate(props.date)

    // Collect unique entity references
    const seen = new Set()
    const entitiesToLoad = []
    for (const log of logs.value) {
      const key = entityKey(log)
      if (!seen.has(key)) {
        seen.add(key)
        entitiesToLoad.push({ type: log.entityType, id: log.entityId, key })
      }
    }

    // Fetch all entities in parallel
    const entries = await Promise.all(
      entitiesToLoad.map(async ({ type, id, key }) => {
        const table = type === 'item' ? db.items : db.looks
        const entity = await table.get(id)
        return { key, entity, type }
      }),
    )

    const details = {}
    const urls = {}
    for (const { key, entity, type } of entries) {
      if (entity) {
        details[key] = { ...entity, _entityType: type }
        if (entity.imageBlob) {
          urls[key] = URL.createObjectURL(entity.imageBlob)
        }
      }
    }
    loadedEntities.value = details
    entityUrls.value = urls
  } catch (e) {
    console.error('Failed to load calendar logs:', e)
    logs.value = []
  } finally {
    loading.value = false
  }
}

// ── Remove log ────────────────────────────────────────────────────────────

async function handleRemove(log) {
  const entity = getDisplayEntity(log)
  const name = entity?.description || `${log.entityType} #${log.entityId}`
  const confirmed = await dialog.confirm(
    `Remover "${name}" do dia ${props.date}?`,
    'Remover do diário',
  )
  if (!confirmed) return

  // Revoke URL if any
  const key = entityKey(log)
  if (entityUrls.value[key]) {
    URL.revokeObjectURL(entityUrls.value[key])
    delete entityUrls.value[key]
  }
  delete loadedEntities.value[key]

  await deleteCalendarLog(log.id)
  logs.value = logs.value.filter((l) => l.id !== log.id)
}

// ── Add item / look ───────────────────────────────────────────────────────

function toggleAddPanel(type) {
  showAddPanel.value = showAddPanel.value === type ? '' : type
  searchPicker.value = ''
  if (showAddPanel.value) {
    loadPickerData()
  }
}

async function loadPickerData() {
  loadingPicker.value = true
  try {
    if (showAddPanel.value === 'item') {
      allItems.value = await getItems()
    } else if (showAddPanel.value === 'look') {
      allLooks.value = await db.looks.reverse().sortBy('createdAt')
    }
  } catch (e) {
    console.error('Failed to load picker data:', e)
  } finally {
    loadingPicker.value = false
  }
}

async function handleAdd(entityType, entityId) {
  try {
    const maxOrder = logs.value.reduce((max, l) => Math.max(max, l.order || 0), -1)
    await addCalendarLog({ date: props.date, entityType, entityId, order: maxOrder + 1 })
    showAddPanel.value = ''
    await loadLogs()
  } catch (e) {
    console.error('Failed to add calendar log:', e)
  }
}

// ── Computed — filter out already-added entities ──────────────────────────

const availableItems = computed(() => {
  const addedIds = new Set(logs.value.filter((l) => l.entityType === 'item').map((l) => l.entityId))
  const q = searchPicker.value.trim().toLowerCase()
  let list = allItems.value.filter((i) => !addedIds.has(i.id))
  if (q) {
    list = list.filter((i) => (i.description || '').toLowerCase().includes(q))
  }
  return list
})

const availableLooks = computed(() => {
  const addedIds = new Set(logs.value.filter((l) => l.entityType === 'look').map((l) => l.entityId))
  const q = searchPicker.value.trim().toLowerCase()
  let list = allLooks.value.filter((l) => !addedIds.has(l.id))
  if (q) {
    list = list.filter((l) => (l.description || '').toLowerCase().includes(q))
  }
  return list
})

// ── Date formatting ───────────────────────────────────────────────────────

const formattedDate = computed(() => {
  const [y, m, d] = props.date.split('-')
  const date = new Date(+y, +m - 1, +d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

// ── Lifecycle ─────────────────────────────────────────────────────────────

function revokeAllUrls() {
  for (const url of Object.values(entityUrls.value)) {
    URL.revokeObjectURL(url)
  }
  entityUrls.value = {}
}

onMounted(loadLogs)

onUnmounted(revokeAllUrls)

watch(
  () => props.date,
  () => {
    revokeAllUrls()
    loadedEntities.value = {}
    showAddPanel.value = ''
    loadLogs()
  },
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/20" @click="emit('close')" />

    <!-- Sheet panel -->
    <div
      class="relative w-full bg-white rounded-t-3xl shadow-soft-lg p-6 pb-10 max-h-[80vh] overflow-y-auto"
    >
      <!-- Pull handle -->
      <div class="w-full flex justify-center pt-3 pb-5 cursor-grab active:cursor-grabbing">
        <div
          class="w-14 h-3.5 bg-accent rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-neutral-700 relative flex items-center justify-center"
        >
          <div class="w-1 h-1 bg-neutral-400 rounded-full shadow-inner" />
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold capitalize">Diário de Uso</h2>
        <button
          class="text-xs text-text-muted underline underline-offset-2 active:scale-95 transition-transform"
          @click="emit('close')"
        >
          Fechar
        </button>
      </div>

      <p class="text-sm text-text-muted mb-5 capitalize">
        {{ formattedDate }}
      </p>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-3">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3 animate-pulse">
          <div class="w-12 h-12 rounded-xl bg-gray-200/50 shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3 w-3/4 bg-gray-200/50 rounded" />
            <div class="h-2.5 w-1/3 bg-gray-200/50 rounded" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="logs.length === 0 && !showAddPanel"
        class="flex flex-col items-center py-8 text-text-muted"
      >
        <p class="text-sm">Nenhum registro neste dia</p>
        <p class="text-xs mt-1 opacity-60">Adicione uma peça ou look abaixo</p>
      </div>

      <!-- Log list -->
      <div v-else class="space-y-2 mb-6">
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex items-center gap-3 bg-white/70 rounded-2xl p-3 ring-1 ring-gray-200/50"
        >
          <!-- Thumbnail -->
          <div
            class="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center"
          >
            <img
              v-if="getThumbnailUrl(log)"
              :src="getThumbnailUrl(log)"
              alt=""
              class="w-full h-full object-cover"
            />
            <svg
              v-else
              class="w-5 h-5 text-text-muted/30 stroke-[1.5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-main truncate">
              {{ getDisplayEntity(log)?.description || `${log.entityType} #${log.entityId}` }}
            </p>
            <p class="text-[11px] text-text-muted/60 mt-0.5">
              <template v-if="log.entityType === 'item'">
                {{ labelForType(getDisplayEntity(log)?.type) }}
              </template>
              <template v-else> Look </template>
              <span class="mx-1">·</span>
              Ordem {{ log.order }}
            </p>
          </div>

          <!-- Remove -->
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center text-text-muted/50 hover:text-red-400 active:scale-90 transition-all duration-200 shrink-0"
            aria-label="Remover"
            @click="handleRemove(log)"
          >
            <svg class="w-4 h-4 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Add buttons -->
      <div class="flex gap-2 mb-4">
        <button
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-medium bg-accent text-white active:scale-95 transition-transform duration-200"
          @click="toggleAddPanel('item')"
        >
          <svg class="w-4 h-4 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Peça
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-medium bg-accent text-white active:scale-95 transition-transform duration-200"
          @click="toggleAddPanel('look')"
        >
          <svg class="w-4 h-4 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Look
        </button>
      </div>

      <!-- Add panel: Items -->
      <div
        v-if="showAddPanel === 'item'"
        class="bg-white/70 rounded-2xl ring-1 ring-gray-200/50 p-3 max-h-60 overflow-y-auto"
      >
        <!-- Search input -->
        <input
          v-model="searchPicker"
          type="text"
          placeholder="Buscar peça…"
          class="w-full bg-white/70 rounded-xl px-3 py-2 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow mb-2"
        />

        <div v-if="loadingPicker" class="flex justify-center py-6">
          <div
            class="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
          />
        </div>

        <p
          v-else-if="availableItems.length === 0"
          class="text-xs text-text-muted/60 text-center py-4"
        >
          Nenhuma peça disponível
        </p>

        <button
          v-for="item in availableItems"
          :key="item.id"
          class="w-full flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-white active:scale-95 transition-all duration-150 text-left"
          @click="handleAdd('item', item.id)"
        >
          <!-- Small thumb -->
          <div class="w-8 h-8 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
            <img
              v-if="item.imageBlob"
              :src="URL.createObjectURL(item.imageBlob)"
              alt=""
              class="w-full h-full object-cover"
              @load="(e) => URL.revokeObjectURL(e.target.src)"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-main truncate">{{ item.description }}</p>
            <p class="text-[10px] text-text-muted/60">{{ labelForType(item.type) }}</p>
          </div>
          <svg
            class="w-4 h-4 text-accent shrink-0 stroke-[2]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Add panel: Looks -->
      <div
        v-if="showAddPanel === 'look'"
        class="bg-white/70 rounded-2xl ring-1 ring-gray-200/50 p-3 max-h-60 overflow-y-auto"
      >
        <!-- Search input -->
        <input
          v-model="searchPicker"
          type="text"
          placeholder="Buscar look…"
          class="w-full bg-white/70 rounded-xl px-3 py-2 text-sm text-text-main placeholder:text-text-muted outline-none ring-1 ring-gray-200/50 focus:ring-accent/20 transition-shadow mb-2"
        />

        <div v-if="loadingPicker" class="flex justify-center py-6">
          <div
            class="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
          />
        </div>

        <p
          v-else-if="availableLooks.length === 0"
          class="text-xs text-text-muted/60 text-center py-4"
        >
          Nenhum look disponível
        </p>

        <button
          v-for="look in availableLooks"
          :key="look.id"
          class="w-full flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-white active:scale-95 transition-all duration-150 text-left"
          @click="handleAdd('look', look.id)"
        >
          <!-- Small thumb -->
          <div class="w-8 h-8 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
            <img
              v-if="look.imageBlob"
              :src="URL.createObjectURL(look.imageBlob)"
              alt=""
              class="w-full h-full object-cover"
              @load="(e) => URL.revokeObjectURL(e.target.src)"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-main truncate">
              {{ look.description || `Look #${look.id}` }}
            </p>
            <p class="text-[10px] text-text-muted/60">{{ look.itemIds?.length || 0 }} peças</p>
          </div>
          <svg
            class="w-4 h-4 text-accent shrink-0 stroke-[2]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
