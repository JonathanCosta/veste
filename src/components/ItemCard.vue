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
      <div
        v-else
        class="w-full h-full bg-gradient-to-b from-[#F9F9F7] to-[#EDEDE8] flex flex-col items-center justify-center p-4 select-none"
      >
        <!-- Tailoring Hanger Minimalist SVG -->
        <svg
          class="w-10 h-10 text-neutral-400/70 stroke-[1.2]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 3a3 3 0 00-3 3v1m3-4a3 3 0 013 3v1m-3-4v4m0 0L3 13.5a1.5 1.5 0 00.5 2.5h17a1.5 1.5 0 00.5-2.5L12 8z"
          />
        </svg>
        <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400/60 mt-3"
          >Sem Peça</span
        >
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
