<template>
  <div class="desktop-messages-workspace">
    <!-- Unauthenticated Guard State (Desktop) -->
    <div v-if="!hasValidSession" class="unauth-desktop-state">
      <div class="unauth-icon-bubble">
        <Lock :size="36" />
      </div>
      <h3 class="unauth-title">Sign in to view messages</h3>
      <p class="unauth-sub">
        Please sign in or create an account to view and participate in private conversations.
      </p>
      <button type="button" class="unauth-action-btn" @click="router.push('/auth')">
        Sign In
      </button>
    </div>

    <template v-else>
      <!-- Left Pane: Conversations Inbox List -->
      <DesktopConversationList
        :conversations="conversations"
        :selected-conversation-id="selectedConversationId"
        :loading="isConversationsLoading"
        :has-connection-error="hasConnectionError"
        @select="handleSelectConversation"
        @refresh="handleRefresh"
        @browse-reports="router.push({ name: 'Home' })"
      />

      <!-- Right Pane: Active Conversation View or No Selection Empty State -->
      <main class="desktop-chat-main-area">
        <DesktopConversationView
          v-if="selectedConversation"
          :conversation="selectedConversation"
          @message-sent="handleMessageSent"
        />

        <!-- Centered Quiet Empty State (No Conversation Selected) -->
        <div v-else class="chat-no-selection-state">
          <div class="no-selection-bubble">
            <MessageSquare :size="44" />
          </div>
          <h2 class="no-selection-title">Select a message</h2>
          <p class="no-selection-sub">
            Choose from your existing conversations, or message someone directly from a Lost &amp; Found report.
          </p>
          <button
            type="button"
            class="browse-reports-btn"
            @click="router.push({ name: 'Home' })"
          >
            Browse reports
          </button>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Lock, MessageSquare } from 'lucide-vue-next';
import DesktopConversationList from '../../components/desktop/messages/DesktopConversationList.vue';
import DesktopConversationView from '../../components/desktop/messages/DesktopConversationView.vue';
import { useConversations } from '../../composables/useConversations';
import { useAuth } from '../../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { hasValidSession } = useAuth();
const {
  conversations,
  isConversationsLoading,
  hasConnectionError,
  subscribeToConversations,
  stopConversationSubscription,
  markAsRead
} = useConversations();

const selectedConversationId = ref<string | null>(null);

const selectedConversation = computed(() => {
  if (!selectedConversationId.value) return null;
  return conversations.value.find((c) => c.id === selectedConversationId.value) || null;
});

const handleSelectConversation = (convId: string) => {
  selectedConversationId.value = convId;
  markAsRead(convId);
};

const handleRefresh = async () => {
  if (hasValidSession.value) {
    await subscribeToConversations();
  }
};

const handleMessageSent = () => {
  if (hasValidSession.value) {
    subscribeToConversations();
  }
};

// Check for initial conversation query param e.g. /messages?c=<id>
watch(
  () => route.query.c,
  (queryConvId) => {
    if (typeof queryConvId === 'string' && queryConvId) {
      selectedConversationId.value = queryConvId;
      markAsRead(queryConvId);
    }
  },
  { immediate: true }
);

// If no conversation is selected and list loads, keep empty selection or select query
watch(
  () => conversations.value.length,
  (len) => {
    if (len > 0 && !selectedConversationId.value && route.query.c) {
      const target = conversations.value.find((c) => c.id === route.query.c);
      if (target) {
        selectedConversationId.value = target.id;
        markAsRead(target.id);
      }
    }
  }
);

onMounted(() => {
  if (hasValidSession.value) {
    subscribeToConversations();
  }
});

watch(hasValidSession, (valid) => {
  if (valid) {
    subscribeToConversations();
  } else {
    stopConversationSubscription();
  }
});

onUnmounted(() => {
  stopConversationSubscription();
});
</script>

<style scoped>
.desktop-messages-workspace {
  display: flex;
  width: 100%;
  height: calc(100vh - var(--desktop-header-height, 64px));
  max-height: calc(100vh - var(--desktop-header-height, 64px));
  background: var(--app-surface);
  border: none;
  box-sizing: border-box;
  overflow: hidden;
}

.desktop-chat-main-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
}

/* No Selection Centered Empty State */
.chat-no-selection-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: 40px;
  gap: 12px;
  box-sizing: border-box;
}

.no-selection-bubble {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-tertiary);
  margin-bottom: 4px;
}

.no-selection-title {
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  color: var(--app-text-primary);
  letter-spacing: -0.01em;
}

.no-selection-sub {
  margin: 0;
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 320px;
  line-height: 1.45;
}

.browse-reports-btn {
  margin-top: 8px;
  padding: 9px 20px;
  border-radius: 9999px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  font-size: 13.5px;
  font-weight: 650;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.browse-reports-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.browse-reports-btn:active {
  transform: scale(0.98);
}

/* Unauthenticated State */
.unauth-desktop-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  height: 100%;
  padding: 40px;
  gap: 12px;
}

.unauth-icon-bubble {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-tertiary);
  margin-bottom: 4px;
}

.unauth-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.unauth-sub {
  margin: 0;
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 300px;
  line-height: 1.45;
}

.unauth-action-btn {
  margin-top: 8px;
  padding: 8px 22px;
  border-radius: 12px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.unauth-action-btn:hover {
  opacity: 0.9;
}
</style>
