<script setup>
import { ref } from 'vue'
import { exportBackup, importBackup } from '../services/backupService'

const importing = ref(false)
const status = ref('')

async function handleExport() {
  try {
    status.value = 'Exportando...'
    await exportBackup()
    status.value = 'Backup baixado com sucesso!'
  } catch (e) {
    status.value = 'Erro ao exportar: ' + e.message
  }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.endsWith('.zip')) {
    status.value = 'Selecione um arquivo .zip'
    return
  }
  try {
    importing.value = true
    status.value = 'Importando...'
    await importBackup(file)
    status.value = 'Dados restaurados com sucesso!'
  } catch (e) {
    status.value = 'Erro ao importar: ' + e.message
  } finally {
    importing.value = false
    event.target.value = ''
  }
}
</script>

<template>
  <div class="px-4 pt-6 pb-4">
    <header class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Configurações</h1>
    </header>

    <section class="space-y-4">
      <div class="rounded-2xl bg-white shadow-soft p-5">
        <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">Dados</h2>

        <button
          class="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-2xl active:scale-[0.97] transition-transform duration-200 mb-2"
          :disabled="importing"
          @click="handleExport"
        >
          Exportar backup
        </button>

        <label
          class="block w-full py-2.5 bg-white text-text-muted text-sm font-medium rounded-2xl ring-1 ring-gray-200 text-center active:scale-[0.97] transition-transform duration-200 cursor-pointer"
        >
          {{ importing ? 'Importando...' : 'Importar backup' }}
          <input
            type="file"
            accept=".zip"
            class="hidden"
            :disabled="importing"
            @change="handleImport"
          />
        </label>
      </div>

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
    </section>

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
