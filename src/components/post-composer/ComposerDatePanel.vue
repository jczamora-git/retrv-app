<template>
  <div class="composer-date-panel">
    <!-- Hero Selected Date Card -->
    <div class="hero-date-card">
      <div class="hero-top-row">
        <span class="hero-relative-badge" :class="{ 'is-today': activeDateMeta.isToday }">
          {{ activeDateMeta.relativeLabel }}
        </span>
        <span class="hero-weekday">{{ activeDateMeta.weekdayLong }}</span>
      </div>
      <div class="hero-date-text">
        {{ activeDateMeta.monthLong }} {{ activeDateMeta.dayNumber }}, {{ activeDateMeta.year }}
      </div>
    </div>

    <!-- PRESETS VIEW -->
    <div v-if="currentView === 'presets'" class="presets-view-container">
      <!-- Interactive Range Slider -->
      <div class="slider-section">
        <div class="slider-meta-row">
          <span class="slider-meta-title">Timeframe</span>
          <span class="slider-meta-val">
            {{ activeDateMeta.isRecent ? (activeDateMeta.daysAgo === 0 ? "Happened Today" : `${activeDateMeta.daysAgo} days ago`) : "Historical Date" }}
          </span>
        </div>

        <div class="slider-track-box">
          <input
            :value="sliderVal"
            type="range"
            min="0"
            max="30"
            step="1"
            class="modern-range-slider"
            :style="sliderProgressStyle"
            aria-label="Date slider in days ago"
            @input="onSliderInput(($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>

        <!-- Ticks along the slider -->
        <div class="slider-ticks-row">
          <button
            type="button"
            class="tick-btn"
            :class="{ active: draftDaysAgo === 0 }"
            @click="onSelectShortcut(0)"
          >
            Today
          </button>
          <button
            type="button"
            class="tick-btn"
            :class="{ active: draftDaysAgo === 7 }"
            @click="onSelectShortcut(7)"
          >
            7d
          </button>
          <button
            type="button"
            class="tick-btn"
            :class="{ active: draftDaysAgo === 14 }"
            @click="onSelectShortcut(14)"
          >
            14d
          </button>
          <button
            type="button"
            class="tick-btn"
            :class="{ active: draftDaysAgo === 21 }"
            @click="onSelectShortcut(21)"
          >
            21d
          </button>
          <button
            type="button"
            class="tick-btn"
            :class="{ active: draftDaysAgo === 30 }"
            @click="onSelectShortcut(30)"
          >
            30d ago
          </button>
        </div>
      </div>

      <!-- Horizontal Day Cards Carousel with Super-thin Scrollbar -->
      <div class="day-carousel-section">
        <div ref="cardsTrackEl" class="day-cards-track">
          <button
            v-for="item in daysList"
            :key="item.daysAgo"
            :ref="(el) => setCardRef(el, item.daysAgo)"
            type="button"
            class="day-card"
            :class="{ active: draftDaysAgo === item.daysAgo }"
            :aria-pressed="draftDaysAgo === item.daysAgo"
            @click="onSelectShortcut(item.daysAgo)"
          >
            <span class="card-weekday">{{ item.weekdayShort }}</span>
            <span class="card-number">{{ item.dayNumber }}</span>
            <span class="card-month">{{ item.monthShort }}</span>
          </button>
        </div>
      </div>

      <!-- Structured Quick Shortcuts (3x2 Grid) -->
      <div class="shortcuts-section">
        <span class="shortcuts-title">Quick Shortcuts</span>
        <div class="shortcuts-grid">
          <button
            v-for="p in presets"
            :key="p.days"
            type="button"
            class="shortcut-btn"
            :class="{ active: draftDaysAgo === p.days }"
            :aria-pressed="draftDaysAgo === p.days"
            @click="onSelectShortcut(p.days)"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Custom Date Secondary Navigation Button -->
        <button
          type="button"
          class="custom-date-nav-btn"
          aria-label="Open custom calendar date picker"
          @click="setView('calendar')"
        >
          <div class="custom-date-nav-left">
            <CalendarDays :size="18" class="custom-date-icon" />
            <span class="custom-date-label">Custom date</span>
          </div>
          <ChevronRight :size="18" class="custom-date-chevron" />
        </button>
      </div>
    </div>

    <!-- CUSTOM CALENDAR VIEW -->
    <ComposerDateCalendar
      v-else-if="currentView === 'calendar'"
      :model-value="selectedIso"
      @update:model-value="onCalendarSelect"
      @back-to-presets="setView('presets')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type ComponentPublicInstance } from "vue";
import { CalendarDays, ChevronRight } from "lucide-vue-next";
import ComposerDateCalendar from "./ComposerDateCalendar.vue";

export type DatePanelView = "presets" | "calendar";

interface DayItem {
  daysAgo: number;
  iso: string;
  dayNumber: number;
  monthShort: string;
  monthLong: string;
  weekdayShort: string;
  weekdayLong: string;
  relativeLabel: string;
  formattedDisplay: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    view?: DatePanelView;
  }>(),
  {
    modelValue: "",
    view: "presets"
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "update:view", value: DatePanelView): void;
  (e: "apply", value: string): void;
}>();

const currentView = ref<DatePanelView>(props.view || "presets");

watch(
  () => props.view,
  (newV) => {
    if (newV) currentView.value = newV;
  }
);

const setView = (v: DatePanelView) => {
  currentView.value = v;
  emit("update:view", v);
};

const now = new Date();
const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const getTodayIso = (): string => {
  return `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
};

const selectedIso = ref<string>(props.modelValue || getTodayIso());
const draftDaysAgo = ref<number>(0);
const cardsTrackEl = ref<HTMLElement | null>(null);
const cardRefs = new Map<number, HTMLElement>();

const setCardRef = (el: Element | ComponentPublicInstance | null, days: number) => {
  if (el instanceof HTMLElement) {
    cardRefs.set(days, el);
  } else {
    cardRefs.delete(days);
  }
};

const generateDaysList = (): DayItem[] => {
  const list: DayItem[] = [];

  for (let i = 0; i <= 30; i++) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${day}`;

    const dayNumber = d.getDate();
    const monthShort = d.toLocaleDateString("en-US", { month: "short" });
    const monthLong = d.toLocaleDateString("en-US", { month: "long" });
    const weekdayShort = d.toLocaleDateString("en-US", { weekday: "short" });
    const weekdayLong = d.toLocaleDateString("en-US", { weekday: "long" });

    let relativeLabel = `${i} days ago`;
    if (i === 0) relativeLabel = "Today";
    else if (i === 1) relativeLabel = "Yesterday";

    const formattedDisplay = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    list.push({
      daysAgo: i,
      iso,
      dayNumber,
      monthShort,
      monthLong,
      weekdayShort,
      weekdayLong,
      relativeLabel,
      formattedDisplay
    });
  }
  return list;
};

const daysList = ref<DayItem[]>(generateDaysList());

// Compute metadata for any selected date (recent or historical)
const activeDateMeta = computed(() => {
  const iso = selectedIso.value || getTodayIso();
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = todayDate;
    return {
      iso,
      daysAgo: 0,
      isToday: true,
      isRecent: true,
      relativeLabel: "TODAY",
      weekdayLong: d.toLocaleDateString("en-US", { weekday: "long" }),
      monthLong: d.toLocaleDateString("en-US", { month: "long" }),
      dayNumber: d.getDate(),
      year: d.getFullYear()
    };
  }

  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const diffMs = todayDate.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isRecent = diffDays >= 0 && diffDays <= 30;
  const isToday = diffDays === 0;

  let relativeLabel = "SELECTED DATE";
  if (diffDays === 0) relativeLabel = "TODAY";
  else if (diffDays === 1) relativeLabel = "YESTERDAY";
  else if (diffDays > 1 && diffDays <= 30) relativeLabel = `${diffDays} DAYS AGO`;

  return {
    iso,
    daysAgo: diffDays,
    isToday,
    isRecent,
    relativeLabel,
    weekdayLong: d.toLocaleDateString("en-US", { weekday: "long" }),
    monthLong: d.toLocaleDateString("en-US", { month: "long" }),
    dayNumber: d.getDate(),
    year: d.getFullYear()
  };
});

const calculateDaysAgo = (iso: string): number => {
  if (!iso) return 0;
  const match = daysList.value.find((item) => item.iso === iso);
  if (match) return match.daysAgo;

  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const diffMs = todayDate.getTime() - target.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 0 && days <= 30) return days;
  return -1; // Historical date outside 30-day range
};

const sliderVal = computed(() => {
  return draftDaysAgo.value >= 0 ? draftDaysAgo.value : 0;
});

const sliderProgressStyle = computed(() => {
  const current = draftDaysAgo.value >= 0 ? draftDaysAgo.value : 0;
  const pct = (current / 30) * 100;
  return {
    background: `linear-gradient(to right, var(--app-primary, #2640DB) 0%, var(--app-primary, #2640DB) ${pct}%, var(--app-surface-secondary, rgba(20,25,30,0.08)) ${pct}%, var(--app-surface-secondary, rgba(20,25,30,0.08)) 100%)`
  };
});

const presets = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "3 days ago", days: 3 },
  { label: "1 week ago", days: 7 },
  { label: "2 weeks ago", days: 14 },
  { label: "30 days ago", days: 30 }
];

const onSelectShortcut = (days: number) => {
  draftDaysAgo.value = days;
  const item = daysList.value[days];
  if (item) {
    selectedIso.value = item.iso;
  }
};

const onSliderInput = (val: number) => {
  onSelectShortcut(val);
};

const scrollToActiveCard = (smooth = true) => {
  nextTick(() => {
    if (currentView.value !== "presets" || draftDaysAgo.value < 0) return;
    const cardEl = cardRefs.get(draftDaysAgo.value);
    const track = cardsTrackEl.value;
    if (cardEl && track) {
      const cardLeft = cardEl.offsetLeft;
      const cardWidth = cardEl.offsetWidth;
      const trackWidth = track.offsetWidth;
      const targetScroll = cardLeft - trackWidth / 2 + cardWidth / 2;
      track.scrollTo({
        left: targetScroll,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  });
};

watch(selectedIso, (newIso) => {
  if (newIso) {
    emit("update:modelValue", newIso);
  }
});

watch(draftDaysAgo, () => {
  scrollToActiveCard(true);
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal !== selectedIso.value) {
      selectedIso.value = newVal;
      draftDaysAgo.value = calculateDaysAgo(newVal);
    }
  }
);

onMounted(() => {
  if (props.modelValue) {
    selectedIso.value = props.modelValue;
  }
  draftDaysAgo.value = calculateDaysAgo(selectedIso.value);
  scrollToActiveCard(false);
});

const onCalendarSelect = (iso: string) => {
  selectedIso.value = iso;
  draftDaysAgo.value = calculateDaysAgo(iso);
};
</script>

<style scoped>
.composer-date-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.presets-view-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero Date Card */
.hero-date-card {
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  border: 1px solid var(--app-primary-soft, rgba(38, 64, 219, 0.2));
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-relative-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--app-primary, #2640DB);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-weekday {
  font-size: 13px;
  color: var(--app-text-tertiary);
  font-weight: 500;
}

.hero-date-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
  letter-spacing: -0.015em;
}

/* Range Slider Section */
.slider-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 12px;
  padding: 12px 14px;
}

.slider-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-meta-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--app-text-tertiary);
}

.slider-meta-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-primary, #2640DB);
}

.slider-track-box {
  padding: 4px 0;
}

.modern-range-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.modern-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--app-primary, #2640DB);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.modern-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider-ticks-row {
  display: flex;
  justify-content: space-between;
}

.tick-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: var(--app-text-tertiary);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.tick-btn:hover,
.tick-btn.active {
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

/* Day Cards Carousel with subtle 3px scrollbar */
.day-carousel-section {
  width: 100%;
  overflow: hidden;
}

.day-cards-track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 10px 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border-strong, rgba(20, 25, 30, 0.2)) transparent;
}

.day-cards-track::-webkit-scrollbar {
  height: 3px;
}

.day-cards-track::-webkit-scrollbar-track {
  background: transparent;
}

.day-cards-track::-webkit-scrollbar-thumb {
  background: var(--app-border-strong, rgba(20, 25, 30, 0.2));
  border-radius: 999px;
}

.day-cards-track::-webkit-scrollbar-thumb:hover {
  background: var(--app-text-tertiary, rgba(20, 25, 30, 0.4));
}

.day-card {
  flex: 0 0 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 12px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-card:hover {
  border-color: var(--app-border-strong, rgba(20, 25, 30, 0.18));
}

.day-card.active {
  background: var(--app-primary, #2640DB);
  border-color: var(--app-primary, #2640DB);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(38, 64, 219, 0.25);
}

.card-weekday {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--app-text-tertiary);
}

.day-card.active .card-weekday {
  color: rgba(255, 255, 255, 0.8);
}

.card-number {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 2px 0;
}

.day-card.active .card-number {
  color: #ffffff;
}

.card-month {
  font-size: 10.5px;
  color: var(--app-text-tertiary);
}

.day-card.active .card-month {
  color: rgba(255, 255, 255, 0.8);
}

/* Structured Quick Shortcuts (3x2 Grid) */
.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcuts-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--app-text-tertiary);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@media (max-width: 380px) {
  .shortcuts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.shortcut-btn {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 10px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  font-size: 12.5px;
  font-weight: 550;
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.shortcut-btn:hover {
  background: var(--app-surface-tertiary);
  border-color: var(--app-border-strong, rgba(20, 25, 30, 0.16));
  color: var(--app-text-primary);
}

.shortcut-btn.active {
  background: var(--app-primary, #2640DB);
  border-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-weight: 650;
  box-shadow: 0 2px 8px rgba(38, 64, 219, 0.22);
}

/* Custom Date Secondary Navigation Button */
.custom-date-nav-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  color: var(--app-text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 2px;
}

.custom-date-nav-btn:hover {
  background: var(--app-surface-tertiary);
  border-color: var(--app-border-strong, rgba(20, 25, 30, 0.16));
}

.custom-date-nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-date-icon {
  color: var(--app-primary, #2640DB);
  flex-shrink: 0;
}

.custom-date-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.custom-date-chevron {
  color: var(--app-text-tertiary);
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.custom-date-nav-btn:hover .custom-date-chevron {
  color: var(--app-text-primary);
  transform: translateX(2px);
}
</style>
