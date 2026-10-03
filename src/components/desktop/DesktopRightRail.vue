<template>
  <aside class="desktop-right-rail-root" aria-label="Supporting Information">
    <!-- Posts Near You Placeholder Surface -->
    <div class="right-rail-card">
      <div class="rail-card-header">
        <div class="rail-title-row">
          <Compass :size="18" class="rail-header-icon" aria-hidden="true" />
          <h2 class="rail-heading">Posts Near You</h2>
        </div>
        <span class="preview-tag">Preview</span>
      </div>

      <div class="rail-card-body">
        <div class="radar-placeholder-box">
          <div class="radar-circle outer"></div>
          <div class="radar-circle inner"></div>
          <MapPin :size="20" class="radar-center-pin" aria-hidden="true" />
        </div>

        <p class="rail-placeholder-copy">
          Nearby discovery will appear here once location-based search is available.
        </p>
        <span class="rail-sub-note">
          Community reports are currently sorted by latest submissions.
        </span>
      </div>
    </div>

    <!-- Community Recovery Tips Card -->
    <div class="right-rail-card tips-card">
      <div class="rail-card-header">
        <div class="rail-title-row">
          <Sparkles :size="17" class="rail-tips-icon" aria-hidden="true" />
          <h3 class="rail-subheading">Recovery Tips</h3>
        </div>
      </div>

      <ul class="tips-list" role="list">
        <li class="tip-item" role="listitem">
          <span class="tip-num">1</span>
          <span class="tip-text">Add clear photos and note any distinctive markings or scratches.</span>
        </li>
        <li class="tip-item" role="listitem">
          <span class="tip-num">2</span>
          <span class="tip-text">Specify the exact landmarks or last known area where the item was seen.</span>
        </li>
        <li class="tip-item" role="listitem">
          <span class="tip-num">3</span>
          <span class="tip-text">Use private chat for handoffs and always meet in safe, public spaces.</span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Compass, MapPin, Sparkles } from "lucide-vue-next";
</script>

<style scoped>
.desktop-right-rail-root {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0 24px 0;
  user-select: none;
}

.right-rail-card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.rail-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rail-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rail-header-icon {
  color: var(--app-primary, #2640DB);
}

.rail-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.2px;
  color: var(--app-text-primary);
}

.preview-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.10));
  color: var(--app-primary, #2640DB);
  padding: 2px 7px;
  border-radius: 6px;
}

.rail-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 4px 4px 4px;
}

.radar-placeholder-box {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed var(--app-primary-soft, rgba(38, 64, 219, 0.3));
}

.radar-circle.outer {
  width: 100%;
  height: 100%;
  background: var(--app-primary-subtle, rgba(38, 64, 219, 0.04));
}

.radar-circle.inner {
  width: 62%;
  height: 62%;
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
}

.radar-center-pin {
  color: var(--app-primary, #2640DB);
  position: relative;
  z-index: 2;
}

.rail-placeholder-copy {
  margin: 0 0 8px 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--app-text-secondary);
  font-weight: 450;
}

.rail-sub-note {
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--app-text-tertiary);
}

/* Tips Card */
.tips-card {
  padding: 16px 18px;
}

.rail-tips-icon {
  color: #f59e0b; /* Amber accent */
}

.rail-subheading {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.1px;
  color: var(--app-text-primary);
}

.tips-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--app-text-secondary);
}

.tip-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.tip-text {
  flex: 1;
}
</style>
