import { ref, watch, onUnmounted } from 'vue'
import db from '../database/db'
import { getLooksByItem } from '../services/wardrobeService'

/**
 * useRelatedLookItems
 *
 * Composable reativo que carrega todos os looks que contêm um determinado item.
 * Para cada look, carrega até 3 itens via bulkGet (preserva a ordem do array)
 * e cria ObjectURLs lazy para exibição das miniaturas no Polaroid Stack.
 *
 * @param {import('vue').Ref<number|null>} itemIdRef — ref reativa com o ID do item
 * @returns {{ relatedLooks: import('vue').Ref<Array>, loading: import('vue').Ref<boolean>, revokeAll: () => void }}
 */
export function useRelatedLookItems(itemIdRef) {
  const relatedLooks = ref([])
  const loading = ref(false)
  const _urls = ref([])

  async function load() {
    const id = itemIdRef.value
    if (!id) {
      relatedLooks.value = []
      loading.value = false
      return
    }

    loading.value = true
    try {
      const looks = await getLooksByItem(id)
      const result = []

      for (const look of looks) {
        // bulkGet preserves the order of the IDs array
        const itemIds = (look.itemIds || []).slice(0, 3)
        const items = itemIds.length ? await db.items.bulkGet(itemIds) : []
        const validItems = items.filter(Boolean)
        const itemUrls = validItems.map((item) =>
          item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
        )
        // Keep track for cleanup
        _urls.value.push(...itemUrls.filter(Boolean))

        result.push({
          ...look,
          items: validItems,
          itemUrls,
        })
      }

      relatedLooks.value = result
    } catch (e) {
      console.error('Failed to load related looks:', e)
      relatedLooks.value = []
    } finally {
      loading.value = false
    }
  }

  function revokeAll() {
    for (const url of _urls.value) {
      URL.revokeObjectURL(url)
    }
    _urls.value = []
  }

  watch(
    itemIdRef,
    () => {
      revokeAll()
      load()
    },
    { immediate: true },
  )

  onUnmounted(revokeAll)

  return {
    relatedLooks,
    loading,
    revokeAll,
  }
}
