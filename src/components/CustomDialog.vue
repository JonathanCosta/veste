<script setup>
import { useDialog } from '../composables/useDialog.js'
import { onMounted, onUnmounted } from 'vue'

const { visible, title, message, type, resolveDialog } = useDialog()

function handleConfirm() {
  resolveDialog(true)
}
function handleCancel() {
  resolveDialog(false)
}

function handleOverlayClick(e) {
  // Only close if the click is directly on the overlay (not the card)
  if (e.target === e.currentTarget) {
    handleCancel()
  }
}

function onKeydown(e) {
  if (!visible.value) return
  if (e.key === 'Escape') {
    handleCancel()
  } else if (e.key === 'Enter') {
    handleConfirm()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="dialog">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      @click="handleOverlayClick"
    >
      <div
        class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-soft-lg transform transition-all text-center"
        role="alertdialog"
        :aria-label="title"
      >
        <!-- Icon area (optional, minimalist) -->
        <div
          class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          :class="type === 'confirm' ? 'bg-app-bg' : 'bg-app-bg'"
        >
          <svg
            v-if="type === 'confirm'"
            class="w-6 h-6 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <!-- Title -->
        <h2 class="text-main text-lg font-semibold mb-2">
          {{ title }}
        </h2>

        <!-- Message -->
        <p class="text-muted text-sm leading-relaxed mb-6">
          {{ message }}
        </p>

        <!-- Buttons -->
        <div class="flex gap-3" :class="type === 'confirm' ? 'justify-between' : 'justify-center'">
          <button
            v-if="type === 'confirm'"
            class="flex-1 bg-app-bg text-main rounded-xl py-3 px-6 font-medium active:scale-95 transition-transform"
            @click="handleCancel"
          >
            Cancelar
          </button>
          <button
            class="flex-1 bg-accent text-white rounded-xl py-3 px-6 font-medium active:scale-95 transition-transform"
            @click="handleConfirm"
          >
            {{ type === 'confirm' ? 'Confirmar' : 'OK' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Entrance transition for the whole dialog */
.dialog-enter-active {
  transition: opacity 0.2s ease-out;
}
.dialog-leave-active {
  transition: opacity 0.15s ease-in;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

/* Scale + slight vertical movement for the card */
.dialog-enter-active > div {
  transition:
    transform 0.2s ease-out,
    opacity 0.2s ease-out;
}
.dialog-leave-active > div {
  transition:
    transform 0.15s ease-in,
    opacity 0.15s ease-in;
}
.dialog-enter-from > div,
.dialog-leave-to > div {
  transform: scale(0.92) translateY(8px);
  opacity: 0;
}
</style>
