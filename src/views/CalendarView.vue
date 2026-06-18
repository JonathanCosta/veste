<script setup>
import { ref, computed, onMounted } from 'vue'
import { getLogsByMonth } from '../services/calendarService'
import DayDetailSheet from '../components/DayDetailSheet.vue'

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1) // 1-indexed
const monthLogs = ref([])
const loading = ref(true)
const selectedDate = ref(null)

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const monthLabel = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

/**
 * Returns an array of { day, logsCount, isToday, isCurrentMonth } for each cell.
 * Includes leading empty cells for days before the 1st.
 */
const days = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay() // 0=Dom, 1=Seg, ...

  // Build a map: dateString -> log count
  const logMap = {}
  for (const log of monthLogs.value) {
    logMap[log.date] = (logMap[log.date] || 0) + 1
  }

  const result = []

  // Empty cells before the 1st
  for (let i = 0; i < startWeekday; i++) {
    result.push({ day: null, logsCount: 0, isToday: false, isCurrentMonth: true })
  }

  // Day cells
  const todayStr = new Date().toISOString().slice(0, 10)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({
      day: d,
      logsCount: logMap[dateStr] || 0,
      isToday: dateStr === todayStr,
      isCurrentMonth: true,
    })
  }

  return result
})

const hasLogs = computed(() => monthLogs.value.length > 0)

async function loadMonth() {
  loading.value = true
  try {
    monthLogs.value = await getLogsByMonth(currentYear.value, currentMonth.value)
  } catch (e) {
    console.error('Failed to load calendar logs:', e)
    monthLogs.value = []
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  selectedDate.value = null
  loadMonth()
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  selectedDate.value = null
  loadMonth()
}

function onDayClick(day) {
  if (!day) return
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  selectedDate.value = dateStr
}

function closeSheet() {
  selectedDate.value = null
  // Refresh month logs to update dot indicators
  loadMonth()
}

onMounted(loadMonth)
</script>

<template>
  <div class="min-h-screen px-4 pt-6 pb-4">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6">
      <button
        class="w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-text-muted hover:text-accent active:scale-90 transition-all duration-200"
        aria-label="Mês anterior"
        @click="prevMonth"
      >
        <svg class="w-4 h-4 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 class="text-base font-bold capitalize tracking-tight text-text-main">
        {{ monthLabel }}
      </h2>
      <button
        class="w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-text-muted hover:text-accent active:scale-90 transition-all duration-200"
        aria-label="Próximo mês"
        @click="nextMonth"
      >
        <svg class="w-4 h-4 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </header>

    <!-- Day-of-week labels -->
    <div class="grid grid-cols-7 gap-1 mb-2">
      <div
        v-for="label in DAY_LABELS"
        :key="label"
        class="text-center text-[10px] font-medium uppercase tracking-wider text-text-muted/60"
      >
        {{ label }}
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-7 gap-1">
      <div v-for="n in 35" :key="n" class="aspect-square rounded-xl bg-gray-200/50 animate-pulse" />
    </div>

    <!-- Calendar grid (always rendered, even when empty — days are always clickable) -->
    <div v-else class="grid grid-cols-7 gap-1">
      <div
        v-for="(cell, idx) in days"
        :key="idx"
        class="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
        :class="[
          cell.day ? 'bg-white shadow-soft hover:shadow-soft-lg' : 'pointer-events-none',
          cell.isToday ? 'ring-2 ring-accent/15' : '',
        ]"
        @click="onDayClick(cell.day)"
      >
        <template v-if="cell.day">
          <span
            class="text-sm font-medium leading-none"
            :class="cell.isToday ? 'text-accent' : 'text-text-main'"
          >
            {{ cell.day }}
          </span>
          <!-- Dot indicators -->
          <div v-if="cell.logsCount > 0" class="flex gap-0.5 mt-1">
            <div
              v-for="n in Math.min(cell.logsCount, 3)"
              :key="n"
              class="w-1.5 h-1.5 rounded-full bg-accent/60"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Empty state (overlaid below grid when no logs this month) -->
    <div
      v-if="!loading && !hasLogs"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <p class="text-text-muted/50 text-xs">Nenhum look registrado neste mês</p>
      <p class="text-text-muted/30 text-[10px] mt-1">Toque em um dia para começar</p>
    </div>

    <!-- Day detail sheet -->
    <Transition name="sheet">
      <DayDetailSheet v-if="selectedDate" :date="selectedDate" @close="closeSheet" />
    </Transition>
  </div>
</template>

<style>
.sheet-enter-active,
.sheet-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
