<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const imageUrl = ref(null)

function createUrl() {
  if (props.item?.imageBlob) {
    return URL.createObjectURL(props.item.imageBlob)
  }
  return null
}

function revokeUrl() {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
  }
}

onMounted(() => {
  imageUrl.value = createUrl()
})

onUnmounted(() => {
  revokeUrl()
})

watch(
  () => props.item,
  () => {
    revokeUrl()
    imageUrl.value = createUrl()
  },
  { deep: false },
)
</script>

<template>
  <div
    class="rounded-2xl shadow-soft overflow-hidden bg-white active:scale-[0.97] transition-transform duration-200 ease-out cursor-pointer"
  >
    <div class="aspect-[3/4] bg-gray-100 relative overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.description || 'Peça'"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-text-muted text-sm">
        sem foto
      </div>
    </div>
    <div class="p-2.5">
      <p class="text-xs text-text-main font-medium truncate">
        {{ item.description || 'Sem descrição' }}
      </p>
      <p class="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
        {{ item.type }}
      </p>
    </div>
  </div>
</template>
