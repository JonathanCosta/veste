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
    looks.value = await getLooks()
    loading.value = false
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
