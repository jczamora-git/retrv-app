<template>
  <div class="desktop-profile-page">
    <div class="desktop-profile-container">
      <!-- Loading Skeleton State -->
      <div v-if="loading && !profile" class="desktop-profile-loading">
        <div class="skeleton-header-card">
          <div class="skeleton-accent"></div>
          <div class="skeleton-body">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line line-lg"></div>
              <div class="skeleton-line line-md"></div>
              <div class="skeleton-line line-sm"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <template v-else>
        <!-- LEFT COLUMN: Profile Header, Tabs & Activity Feed -->
        <div class="profile-main-column">
          <!-- 1. Profile Header Card (X + Reddit Inspired Compact Identity) -->
          <section class="profile-header-card" aria-label="Profile Header">
            <!-- Subtle Top Accent Strip (No giant cover image) -->
            <div class="profile-accent-strip"></div>

            <!-- Identity & Action Row -->
            <div class="profile-identity-section">
              <div class="profile-top-row">
                <!-- Avatar with subtle elevation -->
                <div class="profile-avatar-wrap">
                  <UserAvatar
                    :name="profileDisplayName"
                    :username="profileUsername"
                    :avatar-url="profile?.avatarUrl"
                    size="xl"
                  />
                </div>

                <!-- Action Buttons: Right-Aligned -->
                <div class="profile-actions-wrap">
                  <template v-if="isOwnProfile">
                    <button
                      type="button"
                      class="btn-edit-profile"
                      @click="router.push({ name: 'EditProfile' })"
                    >
                      <Pencil :size="15" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      class="btn-settings-icon"
                      aria-label="Settings"
                      title="Settings"
                      @click="router.push({ name: 'Settings' })"
                    >
                      <Settings :size="18" />
                    </button>
                  </template>

                  <template v-else>
                    <button
                      type="button"
                      class="btn-message-user"
                      :disabled="creatingChat"
                      @click="handleMessageUser"
                    >
                      <MessageCircle :size="16" />
                      <span>{{ creatingChat ? "Opening Chat..." : "Message" }}</span>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Names & Username -->
              <div class="profile-info-block">
                <div class="profile-name-row">
                  <h1 class="profile-display-name">{{ profileDisplayName }}</h1>
                  <AchievementBadge :user-id="resolvedUserId" :size="20" />
                </div>
                <span class="profile-username">@{{ profileUsername }}</span>
              </div>

              <!-- Inline Stats Row -->
              <div class="profile-stats-row">
                <div class="stat-item" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
                  <span class="stat-value">{{ userPosts.length }}</span>
                  <span class="stat-label">Reports</span>
                </div>
                <div class="stat-sep" aria-hidden="true"></div>

                <div class="stat-item stat-lost" :class="{ active: activeTab === 'lost' }" @click="activeTab = 'lost'">
                  <span class="stat-value">{{ lostCount }}</span>
                  <span class="stat-label">Lost</span>
                </div>
                <div class="stat-sep" aria-hidden="true"></div>

                <div class="stat-item stat-found" :class="{ active: activeTab === 'found' }" @click="activeTab = 'found'">
                  <span class="stat-value">{{ foundCount }}</span>
                  <span class="stat-label">Found</span>
                </div>
                <div class="stat-sep" aria-hidden="true"></div>

                <div class="stat-item stat-resolved" :class="{ active: activeTab === 'resolved' }" @click="activeTab = 'resolved'">
                  <span class="stat-value">{{ resolvedCount }}</span>
                  <span class="stat-label">Resolved</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. Main Profile Navigation Tabs (Understated Desktop Tabs) -->
          <div class="profile-tabs-bar" role="tablist" aria-label="Profile Activity Filters">
            <button
              type="button"
              role="tab"
              class="profile-tab-btn"
              :class="{ active: activeTab === 'all' }"
              :aria-selected="activeTab === 'all'"
              @click="activeTab = 'all'"
            >
              <LayoutGrid :size="15" class="tab-icon" />
              <span class="tab-text">All Posts</span>
              <span class="tab-count">{{ userPosts.length }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="profile-tab-btn"
              :class="{ active: activeTab === 'lost' }"
              :aria-selected="activeTab === 'lost'"
              @click="activeTab = 'lost'"
            >
              <CircleHelp :size="15" class="tab-icon" />
              <span class="tab-text">Lost</span>
              <span class="tab-count">{{ lostCount }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="profile-tab-btn"
              :class="{ active: activeTab === 'found' }"
              :aria-selected="activeTab === 'found'"
              @click="activeTab = 'found'"
            >
              <SearchCheck :size="15" class="tab-icon" />
              <span class="tab-text">Found</span>
              <span class="tab-count">{{ foundCount }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="profile-tab-btn"
              :class="{ active: activeTab === 'resolved' }"
              :aria-selected="activeTab === 'resolved'"
              @click="activeTab = 'resolved'"
            >
              <Award :size="15" class="tab-icon" />
              <span class="tab-text">Resolved</span>
              <span class="tab-count">{{ resolvedCount }}</span>
            </button>
          </div>

          <!-- 3. Profile Activity Feed -->
          <div class="profile-activity-feed">
            <!-- Empty State -->
            <div v-if="filteredPosts.length === 0" class="profile-empty-state">
              <div class="empty-icon-box">
                <FileText :size="32" class="empty-icon" />
              </div>
              <h3 class="empty-heading">
                {{ isOwnProfile ? "No reports in this category" : "No reports yet" }}
              </h3>
              <p class="empty-subtext">
                {{
                  isOwnProfile
                    ? "Your Lost & Found posts in this category will appear here."
                    : "This community member currently has no active listings in this category."
                }}
              </p>
              <button
                v-if="isOwnProfile"
                type="button"
                class="empty-create-btn"
                @click="showComposer = true"
              >
                Create Report
              </button>
            </div>

            <!-- Feed Post Cards -->
            <div v-else class="profile-posts-list">
              <PostCard
                v-for="post in filteredPosts"
                :key="post.id"
                :post="post"
                :is-helpful="isHelpfulByMe(post.id)"
                @toggle-helpful="toggleHelpful"
              />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Community Reputation & Summary Rail (Sticky ~310px) -->
        <aside class="profile-summary-rail" aria-label="Community Profile Summary">
          <!-- Card 1: Community Profile Reputation -->
          <section class="rail-card community-reputation-card">
            <h2 class="rail-card-title">Community Profile</h2>

            <!-- Factual Merit & Resolution Grid -->
            <div class="reputation-metrics-grid">
              <div class="rep-metric-cell">
                <span class="rep-metric-value text-primary">{{ meritCount }}</span>
                <span class="rep-metric-label">Merits</span>
              </div>
              <div class="rep-metric-cell">
                <span class="rep-metric-value text-resolved">{{ resolvedCount }}</span>
                <span class="rep-metric-label">Resolved</span>
              </div>
              <div class="rep-metric-cell">
                <span class="rep-metric-value">{{ userPosts.length }}</span>
                <span class="rep-metric-label">Total Posts</span>
              </div>
            </div>

            <!-- Verified Rank Status -->
            <div class="reputation-rank-box">
              <div v-if="highestMeritBadge" class="rank-highlight">
                <div class="rank-icon-wrap">
                  <component :is="getTierIcon(highestMeritBadge.iconName)" :size="20" />
                </div>
                <div class="rank-details">
                  <div class="rank-name-row">
                    <span class="rank-name">{{ highestMeritBadge.name }}</span>
                    <span class="rank-verified-badge">Verified</span>
                  </div>
                  <span class="rank-subtext">
                    {{ meritCount }} verified community {{ meritCount === 1 ? 'recovery' : 'recoveries' }}
                  </span>
                </div>
              </div>

              <div v-else class="rank-empty-state">
                <Medal :size="18" class="empty-medal-icon" />
                <div class="empty-medal-text">
                  <span class="empty-medal-title">No verified merits yet</span>
                  <span class="empty-medal-sub">Help return or recover items to earn community merits.</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Card 2: Community Achievements List -->
          <section class="rail-card achievements-card">
            <div class="rail-header-row">
              <h2 class="rail-card-title">Achievements</h2>
              <span v-if="meritCount > 0" class="achievements-pill">{{ meritCount }} Merits</span>
            </div>

            <div class="achievements-tiers-list">
              <div
                v-for="badge in userBadges"
                :key="badge.tier.id"
                class="achievement-tier-item"
                :class="{ unlocked: badge.unlocked }"
              >
                <div class="tier-icon-wrap" :class="{ 'is-unlocked': badge.unlocked }">
                  <component :is="getTierIcon(badge.tier.iconName)" :size="16" />
                </div>
                <div class="tier-info">
                  <div class="tier-title-row">
                    <span class="tier-name">{{ badge.tier.name }}</span>
                    <span v-if="badge.unlocked" class="tier-check">✓</span>
                  </div>
                  <span class="tier-req">
                    {{ badge.unlocked ? badge.tier.description : `Requires ${badge.tier.minMerits} merits` }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Card 3: Member Details & Quick Actions -->
          <section class="rail-card member-info-card">
            <h2 class="rail-card-title">Member Info</h2>

            <div class="member-meta-rows">
              <div class="member-meta-row">
                <Calendar :size="15" class="meta-icon" />
                <span class="meta-label">{{ joinDateFormatted }}</span>
              </div>
            </div>

            <!-- Quick Settings Links for Own Profile -->
            <div v-if="isOwnProfile" class="profile-quick-links">
              <div class="rail-divider"></div>
              <router-link to="/settings" class="quick-link-item">
                <Settings :size="15" />
                <span>Account Settings</span>
              </router-link>
              <router-link to="/settings/notifications" class="quick-link-item">
                <Bell :size="15" />
                <span>Notification Preferences</span>
              </router-link>
              <router-link to="/settings/help" class="quick-link-item">
                <HelpCircle :size="15" />
                <span>Help &amp; Support</span>
              </router-link>
            </div>
          </section>
        </aside>
      </template>
    </div>

    <!-- Post Composer Modal for Own Profile -->
    <PostComposerModal
      :is-open="showComposer"
      initial-type="lost"
      @close="showComposer = false"
      @submit="handlePostSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Pencil,
  Settings,
  MessageCircle,
  FileText,
  LayoutGrid,
  CircleHelp,
  SearchCheck,
  Award,
  Medal,
  BadgeCheck,
  Trophy,
  Calendar,
  Bell,
  HelpCircle
} from "lucide-vue-next";
import UserAvatar from "../../components/UserAvatar.vue";
import PostCard from "../../components/PostCard.vue";
import AchievementBadge from "../../components/AchievementBadge.vue";
import PostComposerModal from "../../components/PostComposerModal.vue";
import { useAuth, getSessionUser, currentAppUserId } from "../../composables/useAuth";
import { useProfiles, loadProfile } from "../../composables/useProfiles";
import { usePosts } from "../../composables/usePosts";
import { useAchievements } from "../../composables/useAchievements";
import { createOrGetConversation } from "../../composables/useConversations";
import { MERIT_TIERS, type UserBadgeInfo } from "../../types/achievement";
import type { Profile } from "../../types/profile";

const props = defineProps<{
  userId?: string;
}>();

const route = useRoute();
const router = useRouter();
const { currentProfile } = useAuth();
const { posts, toggleHelpful, isHelpfulByMe, fetchPosts, createPost } = usePosts();
const { loadAchievementsForUser, getMeritCount, getHighestTier, getUserBadges } = useAchievements();

// Resolve Target User ID from Props, Route params, or authenticated user
const resolvedUserId = computed(() => {
  if (props.userId) return props.userId.trim();
  const routeParam = ((route.params as any)?.userId || (route.params as any)?.uid) as string | undefined;
  if (routeParam) return routeParam.trim();
  return (currentAppUserId.value || currentProfile.value?.id || "").trim();
});

const isOwnProfile = computed(() => {
  const currentId = currentAppUserId.value || currentProfile.value?.id;
  if (!currentId || !resolvedUserId.value) return false;
  return currentId === resolvedUserId.value;
});

const profile = ref<Profile | null>(null);
const loading = ref(true);
const creatingChat = ref(false);
const showComposer = ref(false);
const activeTab = ref<"all" | "lost" | "found" | "resolved">("all");

// Fetch profile info safely
const fetchProfileData = async () => {
  const uid = resolvedUserId.value;
  if (!uid) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    if (isOwnProfile.value && currentProfile.value) {
      profile.value = currentProfile.value;
    } else {
      const fetched = await loadProfile(uid);
      profile.value = fetched;
    }
    await loadAchievementsForUser(uid, true);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchProfileData();
});

watch(
  () => resolvedUserId.value,
  () => {
    fetchProfileData();
  }
);

watch(
  () => currentProfile.value,
  (newVal) => {
    if (isOwnProfile.value && newVal) {
      profile.value = newVal;
    }
  }
);

// Fallbacks for profile name & username
const userPosts = computed(() => {
  if (!resolvedUserId.value) return [];
  return posts.value.filter((p) => p.authorId === resolvedUserId.value);
});

const profileDisplayName = computed(() => {
  if (profile.value?.name) return profile.value.name;
  if (userPosts.value.length > 0 && userPosts.value[0].authorName) {
    return userPosts.value[0].authorName;
  }
  return isOwnProfile.value ? "My Profile" : "Community Member";
});

const profileUsername = computed(() => {
  if (profile.value?.username) return profile.value.username;
  if (userPosts.value.length > 0 && userPosts.value[0].authorUsername) {
    return userPosts.value[0].authorUsername;
  }
  return "user";
});

// Category counts
const lostCount = computed(() => userPosts.value.filter((p) => p.type === "lost").length);
const foundCount = computed(() => userPosts.value.filter((p) => p.type === "found").length);
const resolvedCount = computed(
  () => userPosts.value.filter((p) => p.status === "resolved" || p.status === "returned").length
);

// Filtered posts based on active desktop tab
const filteredPosts = computed(() => {
  if (activeTab.value === "lost") {
    return userPosts.value.filter((p) => p.type === "lost");
  }
  if (activeTab.value === "found") {
    return userPosts.value.filter((p) => p.type === "found");
  }
  if (activeTab.value === "resolved") {
    return userPosts.value.filter((p) => p.status === "resolved" || p.status === "returned");
  }
  return userPosts.value;
});

// Achievement metrics
const meritCount = computed(() => getMeritCount(resolvedUserId.value));
const highestMeritBadge = computed(() => getHighestTier(resolvedUserId.value));
const userBadges = computed(() => getUserBadges(resolvedUserId.value));

// Format Join Date
const joinDateFormatted = computed(() => {
  const ts = profile.value?.createdAt;
  if (!ts) return "Member of Retrv";
  try {
    const d = new Date(ts);
    const month = d.toLocaleString("default", { month: "long" });
    const year = d.getFullYear();
    return `Joined ${month} ${year}`;
  } catch {
    return "Member of Retrv";
  }
});

// Helper for Tier Icons
const getTierIcon = (iconName: string) => {
  switch (iconName) {
    case "Medal":
      return Medal;
    case "Award":
      return Award;
    case "BadgeCheck":
      return BadgeCheck;
    case "Trophy":
      return Trophy;
    default:
      return Medal;
  }
};

// Message User handler for Other Profiles
const handleMessageUser = async () => {
  if (isOwnProfile.value || !resolvedUserId.value) return;
  const me = getSessionUser();
  if (!me) {
    router.push("/auth");
    return;
  }

  try {
    creatingChat.value = true;
    const conversation = await createOrGetConversation(resolvedUserId.value);
    if (conversation && conversation.id) {
      router.push(`/chat/${conversation.id}`);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[DesktopProfilePage] Error creating conversation:", err);
    }
  } finally {
    creatingChat.value = false;
  }
};

const handlePostSubmit = async (payload: any) => {
  try {
    await createPost(payload);
    showComposer.value = false;
    await fetchPosts({ isRefresh: true });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[DesktopProfilePage] Failed to create post:", err);
    }
  }
};
</script>

<style scoped>
.desktop-profile-page {
  width: 100%;
  min-height: calc(100vh - var(--desktop-header-height, 64px));
  background: var(--app-bg);
  box-sizing: border-box;
}

.desktop-profile-container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 28px;
  align-items: flex-start;
}

/* ----------------------------------------------------
   LEFT COLUMN: Profile Main Area
   ---------------------------------------------------- */
.profile-main-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* Profile Header Card */
.profile-header-card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.profile-accent-strip {
  height: 56px;
  width: 100%;
  background: linear-gradient(135deg, rgba(38, 64, 219, 0.14) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-bottom: 1px solid var(--app-border);
}

.profile-identity-section {
  padding: 0 28px 20px;
}

.profile-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: -36px;
  margin-bottom: 14px;
}

.profile-avatar-wrap {
  border: 3px solid var(--app-surface);
  border-radius: 50%;
  background: var(--app-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.profile-actions-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-edit-profile {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 9999px;
  background: var(--app-surface);
  border: 1px solid var(--app-border-strong, rgba(20, 25, 30, 0.18));
  color: var(--app-text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-edit-profile:hover {
  background: var(--app-surface-secondary);
  border-color: var(--retrv-primary);
  color: var(--retrv-primary);
}

.btn-settings-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-settings-icon:hover {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
  border-color: var(--app-border-strong);
}

.btn-message-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 22px;
  border-radius: 9999px;
  background: var(--retrv-primary);
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(38, 64, 219, 0.25);
}

.btn-message-user:hover:not(:disabled) {
  background: var(--retrv-primary-deep);
  transform: translateY(-1px);
}

.btn-message-user:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Profile Names */
.profile-info-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 20px;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-display-name {
  font-size: 26px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
  letter-spacing: -0.015em;
  line-height: 1.25;
}

.profile-username {
  font-size: 14px;
  color: var(--app-text-muted, #64748b);
  font-weight: 400;
}

/* Inline Stats Bar */
.profile-stats-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.stat-item:hover {
  opacity: 0.8;
}

.stat-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.stat-lost .stat-value {
  color: var(--status-lost-text, #ef4444);
}

.stat-found .stat-value {
  color: var(--status-found-text, #10b981);
}

.stat-resolved .stat-value {
  color: var(--status-resolved-text, #3b82f6);
}

.stat-label {
  font-size: 13px;
  color: var(--app-text-secondary);
  font-weight: 500;
}

.stat-sep {
  width: 1px;
  height: 16px;
  background: var(--app-border);
}

/* ----------------------------------------------------
   PROFILE TABS BAR
   ---------------------------------------------------- */
.profile-tabs-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 6px;
}

.profile-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.profile-tab-btn:hover {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.profile-tab-btn.active {
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  color: var(--retrv-primary);
  font-weight: 600;
}

.tab-count {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 9999px;
  background: var(--app-border);
  color: var(--app-text-secondary);
  font-weight: 600;
}

.profile-tab-btn.active .tab-count {
  background: rgba(38, 64, 219, 0.16);
  color: var(--retrv-primary);
}

/* ----------------------------------------------------
   ACTIVITY FEED & EMPTY STATE
   ---------------------------------------------------- */
.profile-activity-feed {
  width: 100%;
}

.profile-posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  background: var(--app-surface);
  border: 1px dashed var(--app-border-strong, rgba(20, 25, 30, 0.16));
  border-radius: 18px;
  text-align: center;
}

.empty-icon-box {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted, #94a3b8);
  margin-bottom: 14px;
}

.empty-heading {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0 0 6px;
}

.empty-subtext {
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 360px;
  margin: 0 0 20px;
  line-height: 1.5;
}

.empty-create-btn {
  padding: 9px 24px;
  border-radius: 9999px;
  background: var(--retrv-primary);
  color: #ffffff;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(38, 64, 219, 0.2);
}

.empty-create-btn:hover {
  background: var(--retrv-primary-deep);
  transform: translateY(-1px);
}

/* ----------------------------------------------------
   RIGHT COLUMN: Summary & Reputation Rail
   ---------------------------------------------------- */
.profile-summary-rail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: calc(var(--desktop-header-height, 64px) + 24px);
}

.rail-card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.rail-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rail-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0 0 14px;
  letter-spacing: -0.01em;
}

.rail-header-row .rail-card-title {
  margin-bottom: 0;
}

.achievements-pill {
  font-size: 12px;
  font-weight: 600;
  color: var(--retrv-primary);
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  padding: 3px 9px;
  border-radius: 9999px;
}

/* Reputation Metrics Grid */
.reputation-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: var(--app-surface-secondary);
  padding: 12px 8px;
  border-radius: 12px;
  margin-bottom: 14px;
  text-align: center;
}

.rep-metric-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rep-metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.rep-metric-value.text-primary {
  color: var(--retrv-primary);
}

.rep-metric-value.text-resolved {
  color: var(--status-resolved-text, #3b82f6);
}

.rep-metric-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--app-text-secondary);
}

/* Rank Highlight Box */
.reputation-rank-box {
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}

.rank-highlight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(38, 64, 219, 0.15) 0%, rgba(59, 130, 246, 0.10) 100%);
  color: var(--retrv-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rank-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.rank-verified-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
}

.rank-subtext {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.rank-empty-state {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
}

.empty-medal-icon {
  color: var(--app-text-muted, #94a3b8);
  flex-shrink: 0;
  margin-top: 2px;
}

.empty-medal-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty-medal-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.empty-medal-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.4;
}

/* Achievements Tiers List */
.achievements-tiers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-tier-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--app-surface-secondary);
  opacity: 0.65;
  transition: opacity 0.15s ease;
}

.achievement-tier-item.unlocked {
  opacity: 1;
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.06));
  border: 1px solid rgba(38, 64, 219, 0.15);
}

.tier-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--app-border);
  color: var(--app-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tier-icon-wrap.is-unlocked {
  background: var(--retrv-primary);
  color: #ffffff;
}

.tier-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.tier-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tier-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.tier-check {
  font-size: 12px;
  font-weight: 700;
  color: #10b981;
}

.tier-req {
  font-size: 11px;
  color: var(--app-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Member Details & Quick Links */
.member-meta-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.meta-icon {
  color: var(--app-text-muted, #94a3b8);
}

.rail-divider {
  height: 1px;
  background: var(--app-border);
  margin: 14px 0 10px;
}

.profile-quick-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-link-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
  text-decoration: none;
  transition: all 0.15s ease;
}

.quick-link-item:hover {
  background: var(--app-surface-secondary);
  color: var(--retrv-primary);
}

/* Skeleton Loading State */
.skeleton-header-card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  overflow: hidden;
  width: 100%;
}

.skeleton-accent {
  height: 56px;
  background: var(--app-surface-secondary);
}

.skeleton-body {
  padding: 0 28px 24px;
}

.skeleton-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  margin-top: -36px;
  margin-bottom: 16px;
}

.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  background: var(--app-surface-secondary);
  border-radius: 4px;
}

.line-lg {
  width: 200px;
  height: 24px;
}

.line-md {
  width: 120px;
}

.line-sm {
  width: 280px;
}
</style>
