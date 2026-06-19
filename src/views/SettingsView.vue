<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { exportBackup, importBackup } from '../services/backupService'
import { seedMockWardrobe } from '../utils/seeder'
import { useWorkingState } from '../composables/useWorkingState'
import { useDialog } from '../composables/useDialog'

const router = useRouter()
const dialog = useDialog()
const { startWorking, stopWorking } = useWorkingState()
const isDev = import.meta.env.DEV

const exporting = ref(false)
const importing = ref(false)
const seeding = ref(false)
const status = ref('')

const progress = ref({ phase: '', current: 0, total: 0 })
const abortController = ref(null)

// ─── Export ────────────────────────────────────────────────────────

async function handleExport() {
  const ctrl = new AbortController()
  abortController.value = ctrl

  exporting.value = true
  startWorking()
  status.value = ''
  progress.value = { phase: 'init', current: 0, total: 0 }

  try {
    await exportBackup({
      signal: ctrl.signal,
      onProgress: (p) => {
        progress.value = p
      },
    })
    status.value = 'Backup baixado com sucesso!'
    progress.value = { phase: 'done', current: 0, total: 0 }
  } catch (e) {
    if (e.name === 'AbortError') {
      status.value = 'Exportação cancelada.'
    } else {
      status.value = 'Erro ao exportar: ' + e.message
    }
    progress.value = { phase: '', current: 0, total: 0 }
  } finally {
    exporting.value = false
    stopWorking()
    abortController.value = null
  }
}

function cancelExport() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
}

// ─── Import ────────────────────────────────────────────────────────

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.endsWith('.zip')) {
    status.value = 'Selecione um arquivo .zip'
    return
  }
  try {
    importing.value = true
    startWorking()
    status.value = 'Importando...'
    await importBackup(file)
    status.value = 'Dados restaurados com sucesso!'
  } catch (e) {
    status.value = 'Erro ao importar: ' + e.message
  } finally {
    importing.value = false
    stopWorking()
    event.target.value = ''
  }
}

// ─── Seeder (dev only) ────────────────────────────────────────────

async function handleSeed() {
  const confirmed = await dialog.confirm(
    'Serão geradas 500 peças de vestuário com imagens placeholder (~50 MB). Deseja continuar?',
    'Modo Desenvolvedor',
  )
  if (!confirmed) return

  seeding.value = true
  status.value = 'Gerando dados de teste...'
  startWorking()

  try {
    await seedMockWardrobe(500, {
      imageSizeKB: 100,
      onProgress: (phase, current, total) => {
        progress.value = { phase: 'seeding', current, total }
      },
    })
    status.value = '500 peças geradas com sucesso!'
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (e) {
    status.value = 'Erro ao gerar dados: ' + e.message
  } finally {
    seeding.value = false
    stopWorking()
    progress.value = { phase: '', current: 0, total: 0 }
  }
}

// ─── Computed text helpers ────────────────────────────────────────

const progressText = computed(() => {
  const p = progress.value
  switch (p.phase) {
    case 'init':
      return 'Preparando exportação...'
    case 'items':
      return `${p.current} de ${p.total} peças processadas`
    case 'looks':
      return `${p.current} de ${p.total} looks processados`
    case 'compressing':
      return 'Comprimindo arquivo...'
    case 'seeding':
      return `${p.current} de ${p.total} peças geradas...`
    case 'done':
      return ''
    default:
      return ''
  }
})

const progressPercent = computed(() => {
  const p = progress.value
  if (!p.phase || p.total === 0) return 0
  if (p.phase === 'compressing') return 90
  if (p.phase === 'done') return 100
  return Math.round((p.current / p.total) * 100)
})
</script>

<template>
  <div class="px-4 pt-6 pb-4">
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
      <h1 class="text-lg font-bold">Configurações</h1>
      <div class="w-9" />
    </div>

    <section class="space-y-4">
      <!-- ─── Data card ──────────────────────────────────────── -->
      <div class="rounded-2xl bg-white shadow-soft p-5">
        <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">Dados</h2>

        <!-- Progress area -->
        <div v-if="exporting" class="space-y-3 mb-3">
          <div class="h-1.5 w-full bg-gray-200/70 rounded-full overflow-hidden">
            <div
              class="bg-accent h-full rounded-full transition-all duration-300 ease-out"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <p class="text-xs text-text-muted text-center">{{ progressText }}</p>
          <button
            class="w-full py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 active:scale-[0.97] active:ring-red-200/30 transition-transform duration-200"
            @click="cancelExport"
          >
            Cancelar
          </button>
        </div>

        <!-- Export button -->
        <button
          class="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-2xl mb-2 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
          :class="{ 'active:scale-[0.97]': !exporting }"
          :disabled="exporting || importing"
          @click="handleExport"
        >
          {{ exporting ? 'Exportando...' : 'Exportar backup' }}
        </button>

        <!-- Import label -->
        <label
          class="block w-full py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 text-center disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all duration-200"
          :class="{ 'active:scale-[0.97]': !importing }"
        >
          {{ importing ? 'Importando...' : 'Importar backup' }}
          <input
            type="file"
            accept=".zip"
            class="hidden"
            :disabled="importing || exporting"
            @change="handleImport"
          />
        </label>
      </div>

      <!-- ─── About card ─────────────────────────────────────── -->
      <div class="rounded-2xl bg-white shadow-soft p-5 text-center">
        <img
          src="/logo.png"
          alt="Veste Logo"
          class="h-20 mx-auto object-contain mb-4 filter drop-shadow-sm"
        />
        <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted mb-2">Sobre</h2>
        <p class="text-xs text-text-muted leading-relaxed">
          Veste — Look do Dia v0.1.0<br />
          Guarda-roupa virtual offline-first.<br />
          100% local, sem servidores.
        </p>
      </div>

      <!-- ─── Developer card (dev only) ──────────────────────── -->
      <div v-if="isDev" class="rounded-2xl bg-white shadow-soft p-5 space-y-3">
        <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted">Desenvolvedor</h2>
        <button
          class="w-full py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
          :class="{ 'active:scale-[0.97]': !seeding }"
          :disabled="seeding || exporting || importing"
          @click="handleSeed"
        >
          {{ seeding ? 'Gerando...' : 'Gerar 500 peças de teste' }}
        </button>
      </div>
    </section>

    <!-- Status message -->
    <Transition name="fade">
      <p v-if="status" class="mt-4 text-sm text-center text-text-muted">{{ status }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
