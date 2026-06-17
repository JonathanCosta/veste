import { ref } from 'vue'

/**
 * Global shared working state.
 * When `isWorking` is true, the BottomNav and other actions should be locked
 * to prevent accidental navigation during export/import operations.
 */
const isWorking = ref(false)

export function useWorkingState() {
  function startWorking() {
    isWorking.value = true
  }

  function stopWorking() {
    isWorking.value = false
  }

  return {
    isWorking,
    startWorking,
    stopWorking,
  }
}
