<template>
  <ion-page class="policy-page">
    <PageHeader
      :title="pageTitle"
      :subtitle="policy?.effectiveDate ? `Effective ${policy.effectiveDate}` : undefined"
      :show-back="true"
      default-back-url="/settings"
      @back="router.replace('/settings')"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="policy-content">
      <div class="policy-container">
        <article class="policy-article" v-html="renderedHtml"></article>

        <div class="policy-footer-nav">
          <button type="button" class="back-to-legal-btn" @click="router.replace('/settings')">
            <ArrowLeft :size="16" />
            <span>Back to Settings</span>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { ArrowLeft } from 'lucide-vue-next';
import PageHeader from '../components/PageHeader.vue';
import { POLICIES, PolicyDefinition } from '../data/policies';
import { parseMarkdownToHtml } from '../utils/markdown';

const props = defineProps<{
  policySlug?: string;
  customTitle?: string;
  customContent?: string;
}>();

const route = useRoute();
const router = useRouter();

const currentSlug = computed<string>(() => {
  if (props.policySlug) return props.policySlug;
  const param = route.params.slug as string;
  if (param) return param;
  // If matched via specific public path like /privacy or /terms
  if (route.path.includes('privacy')) return 'privacy';
  if (route.path.includes('terms')) return 'terms';
  if (route.path.includes('community-guidelines')) return 'community-guidelines';
  if (route.path.includes('delete-account')) return 'delete-account';
  return 'privacy';
});

const policy = computed<PolicyDefinition | undefined>(() => {
  return POLICIES[currentSlug.value] || POLICIES.privacy;
});

const pageTitle = computed(() => {
  if (props.customTitle) return props.customTitle;
  return policy.value?.shortTitle || 'Legal Policy';
});

const rawMarkdown = computed(() => {
  if (props.customContent) return props.customContent;
  return policy.value?.rawContent || '';
});

const renderedHtml = computed(() => {
  return parseMarkdownToHtml(rawMarkdown.value);
});
</script>

<style scoped>
.policy-page {
  --background: var(--app-bg, #0B0D13);
}

.policy-content {
  --background: var(--app-bg, #0B0D13);
}

.policy-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 20px calc(80px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.policy-article {
  user-select: text;
  -webkit-user-select: text;
  color: var(--app-text-primary, #E2E8F0);
  font-size: 15px;
  line-height: 1.7;
}

/* Deep styles for rendered markdown content */
:deep(.policy-h1) {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--app-text-primary, #FFFFFF);
  margin: 0 0 16px 0;
  line-height: 1.25;
}

:deep(.policy-h2) {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--app-text-primary, #FFFFFF);
  margin: 32px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  line-height: 1.3;
}

:deep(.policy-h3) {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary, #FFFFFF);
  margin: 22px 0 8px 0;
  line-height: 1.35;
}

:deep(.policy-p) {
  margin: 0 0 14px 0;
  color: var(--app-text-secondary, #94A3B8);
  font-size: 15px;
}

:deep(.policy-ul),
:deep(.policy-ol) {
  margin: 0 0 18px 0;
  padding-left: 24px;
  color: var(--app-text-secondary, #94A3B8);
}

:deep(.policy-li) {
  margin-bottom: 6px;
  line-height: 1.6;
}

:deep(.policy-bold) {
  color: var(--app-text-primary, #FFFFFF);
  font-weight: 600;
}

:deep(.policy-hr) {
  border: 0;
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.08));
  margin: 36px 0 24px 0;
}

:deep(.policy-link) {
  color: var(--app-accent, #3B82F6);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
}

:deep(.policy-placeholder) {
  display: inline-block;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 12.5px;
  background: rgba(38, 64, 219, 0.15);
  color: var(--app-primary, #60A5FA);
  border: 1px dashed rgba(38, 64, 219, 0.4);
  border-radius: 6px;
  margin: 2px 0;
}

.policy-footer-nav {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  display: flex;
  justify-content: flex-start;
}

.back-to-legal-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.1));
  color: var(--app-text-primary, #FFFFFF);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-to-legal-btn:hover {
  background: var(--app-surface-secondary, rgba(255, 255, 255, 0.09));
  transform: translateX(-2px);
}

.back-to-legal-btn:active {
  transform: scale(0.97);
}
</style>
