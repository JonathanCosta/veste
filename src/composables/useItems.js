import { ref } from 'vue'
import {
  getItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  getItemsByType,
  getCategories,
  addCategory,
} from '../services/wardrobeService'

export function useItems() {
  const items = ref([])
  const loading = ref(false)

  async function loadItems() {
    loading.value = true
    items.value = await getItems()
    loading.value = false
  }

  return {
    items,
    loading,
    loadItems,
    getItem,
    addItem,
    updateItem,
    deleteItem,
    getItemsByType,
    getCategories,
    addCategory,
  }
}
