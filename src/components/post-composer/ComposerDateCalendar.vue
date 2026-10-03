<template>
  <div class="composer-date-calendar">
    <!-- DAYS VIEW -->
    <template v-if="viewMode === 'days'">
      <!-- Sub-header navigation row -->
      <div class="calendar-top-bar">
        <button
          type="button"
          class="back-presets-btn"
          aria-label="Back to date shortcuts"
          @click="$emit('back-to-presets')"
        >
          <ChevronLeft :size="16" />
          <span>Back to shortcuts</span>
        </button>

        <!-- Month Navigation & Jump Controls -->
        <div class="month-nav-controls">
          <button
            type="button"
            class="month-nav-btn"
            :disabled="!canGoPrevMonth"
            aria-label="Previous month"
            @click="prevMonth"
          >
            <ChevronLeft :size="18" />
          </button>
          <button
            type="button"
            class="month-label-btn"
            aria-label="Select month and year"
            @click="openMonthYearPicker"
          >
            <span>{{ currentMonthLabel }}</span>
            <ChevronDown :size="14" class="month-label-chevron" />
          </button>
          <button
            type="button"
            class="month-nav-btn"
            :disabled="!canGoNextMonth"
            aria-label="Next month"
            @click="nextMonth"
          >
            <ChevronRight :size="18" />
          </button>
        </div>
      </div>

      <!-- Calendar Surface -->
      <div class="calendar-surface">
        <!-- Weekday column headings -->
        <div class="weekdays-grid" role="row">
          <span v-for="wd in weekdays" :key="wd" class="weekday-cell" role="columnheader">
            {{ wd }}
          </span>
        </div>

        <!-- Month Days Grid -->
        <div class="days-grid" role="grid" aria-label="Calendar dates">
          <!-- Leading empty slots for alignment -->
          <div
            v-for="empty in firstDayOffset"
            :key="`empty-${empty}`"
            class="empty-cell"
            aria-hidden="true"
          ></div>

          <!-- Days of the month -->
          <button
            v-for="day in monthDays"
            :key="day.iso"
            type="button"
            class="calendar-day-btn"
            :class="{
              selected: day.iso === modelValue,
              'is-today': day.isToday,
              disabled: day.isDisabled
            }"
            :disabled="day.isDisabled"
            :aria-label="day.ariaLabel"
            :aria-pressed="day.iso === modelValue"
            @click="onSelectDay(day.iso)"
          >
            <span class="day-number">{{ day.dayNumber }}</span>
            <span v-if="day.isToday" class="today-dot" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <!-- Range explanation note -->
      <div class="range-hint">
        <span>You can select any date in the past</span>
      </div>
    </template>

    <!-- MONTH & YEAR PICKER VIEW -->
    <template v-else-if="viewMode === 'month-year'">
      <div class="month-year-picker-wrap">
        <div class="picker-top-bar">
          <button
            type="button"
            class="back-presets-btn"
            aria-label="Back to calendar"
            @click="viewMode = 'days'"
          >
            <ChevronLeft :size="16" />
            <span>Back to calendar</span>
          </button>
          <span class="picker-title">Select Month & Year</span>
        </div>

        <!-- Year Selector (Scrollable Horizontal / Grid) -->
        <div class="year-select-section">
          <span class="section-label">Year</span>
          <div class="year-chips-scroll">
            <button
              v-for="y in availableYears"
              :key="y"
              type="button"
              class="year-chip-btn"
              :class="{ active: pickerYear === y }"
              :aria-pressed="pickerYear === y"
              @click="pickerYear = y"
            >
              {{ y }}
            </button>
          </div>
        </div>

        <!-- Month Selector (12 Months Grid) -->
        <div class="month-select-section">
          <span class="section-label">Month</span>
          <div class="months-grid">
            <button
              v-for="(mName, mIdx) in monthNames"
              :key="mName"
              type="button"
              class="month-cell-btn"
              :class="{
                active: pickerYear === viewDate.getFullYear() && viewDate.getMonth() === mIdx,
                disabled: isMonthDisabled(pickerYear, mIdx)
              }"
              :disabled="isMonthDisabled(pickerYear, mIdx)"
              @click="onSelectMonth(mIdx)"
            >
              {{ mName }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-vue-next";

interface DayCell {
  iso: string;
  dayNumber: number;
  isToday: boolean;
  isDisabled: boolean;
  ariaLabel: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
  }>(),
  {
    modelValue: ""
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", iso: string): void;
  (e: "back-to-presets"): void;
}>();

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Reference date for current time
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const viewMode = ref<"days" | "month-year">("days");

// Initialize viewed month to selected date's month or current month
const parseIsoToDate = (iso: string): Date | null => {
  if (!iso) return null;
  const parts = iso.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
};

const getInitialViewDate = (): Date => {
  const parsed = parseIsoToDate(props.modelValue);
  if (parsed) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

const viewDate = ref<Date>(getInitialViewDate());
const pickerYear = ref<number>(viewDate.value.getFullYear());

// Synchronize viewDate if modelValue changes externally while on calendar
watch(
  () => props.modelValue,
  (newIso) => {
    const parsed = parseIsoToDate(newIso);
    if (parsed) {
      viewDate.value = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      pickerYear.value = parsed.getFullYear();
    }
  }
);

const currentMonthLabel = computed(() => {
  return viewDate.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
});

// Navigation limits: Future months disabled, past months completely allowed
const maxAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const canGoPrevMonth = computed(() => {
  // Safe technical clamp down to year 1900
  return viewDate.value.getFullYear() > 1900;
});

const canGoNextMonth = computed(() => {
  return viewDate.value.getTime() < maxAllowedMonth.getTime();
});

const prevMonth = () => {
  if (!canGoPrevMonth.value) return;
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1);
};

const nextMonth = () => {
  if (!canGoNextMonth.value) return;
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1);
};

const openMonthYearPicker = () => {
  pickerYear.value = viewDate.value.getFullYear();
  viewMode.value = "month-year";
};

// Available years for quick historical jumping (current year down to 1970)
const availableYears = computed(() => {
  const currentY = today.getFullYear();
  const years: number[] = [];
  for (let y = currentY; y >= 1970; y--) {
    years.push(y);
  }
  return years;
});

const isMonthDisabled = (year: number, monthIdx: number): boolean => {
  if (year > today.getFullYear()) return true;
  if (year === today.getFullYear() && monthIdx > today.getMonth()) return true;
  return false;
};

const onSelectMonth = (monthIdx: number) => {
  if (isMonthDisabled(pickerYear.value, monthIdx)) return;
  viewDate.value = new Date(pickerYear.value, monthIdx, 1);
  viewMode.value = "days";
};

// Day alignment and days in month
const firstDayOffset = computed(() => {
  return new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1).getDay();
});

const monthDays = computed<DayCell[]>(() => {
  const y = viewDate.value.getFullYear();
  const m = viewDate.value.getMonth();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const cells: DayCell[] = [];

  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let d = 1; d <= totalDays; d++) {
    const cellDate = new Date(y, m, d);
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = iso === todayIso;

    // Allowed: any date on or before today
    const isDisabled = cellDate.getTime() > today.getTime();

    const ariaLabel = cellDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    cells.push({
      iso,
      dayNumber: d,
      isToday,
      isDisabled,
      ariaLabel
    });
  }

  return cells;
});

const onSelectDay = (iso: string) => {
  emit("update:modelValue", iso);
};
</script>

<style scoped>
.composer-date-calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.calendar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.back-presets-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--app-primary, #2640DB);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: opacity 0.15s ease;
}

.back-presets-btn:hover {
  opacity: 0.85;
}

.month-nav-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.month-label-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--app-text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.month-label-btn:hover {
  background: var(--app-surface-tertiary);
  color: var(--app-primary, #2640DB);
}

.month-label-chevron {
  color: var(--app-text-tertiary);
}

.month-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  color: var(--app-text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.month-nav-btn:hover:not(:disabled) {
  background: var(--app-surface-tertiary);
  color: var(--app-primary, #2640DB);
}

.month-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Calendar Surface */
.calendar-surface {
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 14px;
  padding: 12px 10px;
}

.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.weekday-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--app-text-tertiary);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.empty-cell {
  height: 38px;
}

.calendar-day-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--app-text-primary);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.calendar-day-btn:hover:not(.disabled):not(.selected) {
  background: var(--app-surface-tertiary);
}

.calendar-day-btn.selected {
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(38, 64, 219, 0.28);
}

.calendar-day-btn.is-today:not(.selected) {
  border-color: var(--app-primary-soft, rgba(38, 64, 219, 0.3));
  font-weight: 700;
  color: var(--app-primary, #2640DB);
}

.calendar-day-btn.disabled {
  opacity: 0.28;
  cursor: not-allowed;
  color: var(--app-text-tertiary);
}

.today-dot {
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--app-primary, #2640DB);
}

.calendar-day-btn.selected .today-dot {
  background-color: #ffffff;
}

.range-hint {
  text-align: center;
  font-size: 12px;
  color: var(--app-text-tertiary);
  padding-top: 2px;
}

/* Month & Year Picker Styles */
.month-year-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 14px;
  padding: 14px;
}

.picker-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.section-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--app-text-tertiary);
  margin-bottom: 6px;
  display: block;
}

.year-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border-strong, rgba(20, 25, 30, 0.2)) transparent;
}

.year-chips-scroll::-webkit-scrollbar {
  height: 3px;
}

.year-chips-scroll::-webkit-scrollbar-thumb {
  background: var(--app-border-strong, rgba(20, 25, 30, 0.2));
  border-radius: 999px;
}

.year-chip-btn {
  flex: 0 0 auto;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--app-surface);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.year-chip-btn:hover {
  background: var(--app-surface-tertiary);
  color: var(--app-text-primary);
}

.year-chip-btn.active {
  background: var(--app-primary, #2640DB);
  border-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-weight: 700;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.month-cell-btn {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--app-surface);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.month-cell-btn:hover:not(.disabled):not(.active) {
  background: var(--app-surface-tertiary);
  color: var(--app-primary, #2640DB);
}

.month-cell-btn.active {
  background: var(--app-primary, #2640DB);
  border-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-weight: 700;
}

.month-cell-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  color: var(--app-text-tertiary);
}
</style>

