import { ref } from 'vue'
import {
  getLooks,
  getLook,
  addLook,
  updateLook,
  deleteLook,
  getLooksByItem,
  getItemsByIds,
} from '../services/wardrobeService'

export function useLooks() {
  const looks = ref([])
  const loading = ref(false)

  async function loadLooks() {
    loading.value = true
    try {
      looks.value = await getLooks()
    } catch (e) {
      console.error('Failed to load looks:', e)
      looks.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    looks,
    loading,
    loadLooks,
    getLook,
    addLook,
    updateLook,
    deleteLook,
    getLooksByItem,
    getItemsByIds,
  }
}
