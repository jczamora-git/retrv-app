import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { supabase } from '../utils/supabase';
import { useAuth, currentAppUserId, sessionUid } from './useAuth';
import { resolveAppUserId, getProfileById } from './useProfiles';
import { useNotifications } from './useNotifications';
import {
  MERIT_TIERS,
  type Achievement,
  type MeritTier,
  type UserBadgeInfo
} from '../types/achievement';
import type { PostType } from '../types/post';

// Shared reactive cache keyed by user/profile ID
const achievementsByUserId = ref<Record<string, Achievement[]>>({});
const loadingByUserId = ref<Record<string, boolean>>({});
const inFlightRequests = new Map<string, Promise<Achievement[]>>();
const postAchievementsMap = new Map<string, Achievement>();

let hasLoadedGlobalAchievements = false;
let globalAchievementsPromise: Promise<void> | null = null;

export function isSameAppUser(idA?: string | null, idB?: string | null): boolean {
  if (!idA || !idB) return false;
  const a = idA.trim();
  const b = idB.trim();
  if (a === b) return true;
  if (a.replace(/^dev_/, '') === b.replace(/^dev_/, '')) return true;
  return false;
}

export const loadAllAchievements = async (forceRefresh = false): Promise<void> => {
  if (hasLoadedGlobalAchievements && !forceRefresh) return;
  if (globalAchievementsPromise && !forceRefresh) return globalAchievementsPromise;

  globalAchievementsPromise = (async () => {
    try {
      const { data, error } = await supabase.from('achievements').select('*');
      const grouped: Record<string, Achievement[]> = {};

      if (!error && data && Array.isArray(data)) {
        for (const item of data) {
          const ach: Achievement = {
            id: item.id,
            type: 'community_merit',
            postId: item.post_id || item.postId || '',
            recipientId: item.user_id || item.recipientId || '',
            awardedBy: item.awarded_by || item.awardedBy || '',
            createdAt: item.unlocked_at ? new Date(item.unlocked_at).getTime() : Date.now()
          };
          if (ach.postId) {
            postAchievementsMap.set(ach.postId, ach);
          }
          if (ach.recipientId) {
            const rId = ach.recipientId.trim();
            if (!grouped[rId]) grouped[rId] = [];
            grouped[rId].push(ach);
          }
        }
      }

      const finalGrouped: Record<string, Achievement[]> = {};
      for (const [rId, list] of Object.entries(grouped)) {
        const seenPosts = new Set<string>();
        const unique: Achievement[] = [];
        for (const ach of list) {
          if (ach.postId) {
            if (seenPosts.has(ach.postId)) continue;
            seenPosts.add(ach.postId);
          }
          unique.push(ach);
        }
        unique.sort((a, b) => b.createdAt - a.createdAt);
        finalGrouped[rId] = unique;
      }

      achievementsByUserId.value = {
        ...achievementsByUserId.value,
        ...finalGrouped
      };
      hasLoadedGlobalAchievements = true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[useAchievements] Failed loading all achievements:', err);
      }
    } finally {
      globalAchievementsPromise = null;
    }
  })();

  return globalAchievementsPromise;
};

export const loadAchievementsForUser = async (
  rawUserId: string | null | undefined,
  forceRefresh = false
): Promise<Achievement[]> => {
  if (!rawUserId) return [];
  const targetId = rawUserId.trim();

  if (!forceRefresh && achievementsByUserId.value[targetId]) {
    return achievementsByUserId.value[targetId];
  }

  if (inFlightRequests.has(targetId)) {
    return inFlightRequests.get(targetId)!;
  }

  if (!achievementsByUserId.value[targetId]) {
    loadingByUserId.value = { ...loadingByUserId.value, [targetId]: true };
  }

  const fetchPromise = (async () => {
    try {
      const userMerits: Achievement[] = [];
      const existingPostIds = new Set<string>();

      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', targetId);

        if (!error && data && Array.isArray(data)) {
          for (const item of data) {
            const ach: Achievement = {
              id: item.id,
              type: 'community_merit',
              postId: item.post_id || item.postId || '',
              recipientId: item.user_id || item.recipientId || '',
              awardedBy: item.awarded_by || item.awardedBy || '',
              createdAt: item.unlocked_at ? new Date(item.unlocked_at).getTime() : Date.now()
            };
            if (ach.postId) {
              postAchievementsMap.set(ach.postId, ach);
              existingPostIds.add(ach.postId);
            }
            userMerits.push(ach);
          }
        }
      } catch {}

      // Check resolved posts fallback
      try {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('resolved_to', targetId);

        if (postsData && Array.isArray(postsData)) {
          for (const postItem of postsData) {
            if (postItem && !existingPostIds.has(postItem.id)) {
              const reconciledAch: Achievement = {
                id: `ach_reconciled_${postItem.id}`,
                type: 'community_merit',
                postId: postItem.id,
                recipientId: targetId,
                awardedBy: postItem.author_id,
                createdAt: postItem.resolved_at ? new Date(postItem.resolved_at).getTime() : Date.now()
              };
              userMerits.push(reconciledAch);
              existingPostIds.add(postItem.id);
              postAchievementsMap.set(postItem.id, reconciledAch);
            }
          }
        }
      } catch {}

      const uniqueList: Achievement[] = [];
      const seenPostIds = new Set<string>();
      for (const ach of userMerits) {
        if (ach.postId) {
          if (seenPostIds.has(ach.postId)) continue;
          seenPostIds.add(ach.postId);
        }
        uniqueList.push(ach);
      }

      uniqueList.sort((a, b) => b.createdAt - a.createdAt);

      achievementsByUserId.value = {
        ...achievementsByUserId.value,
        [targetId]: uniqueList
      };

      return uniqueList;
    } catch (err) {
      return achievementsByUserId.value[targetId] || [];
    } finally {
      inFlightRequests.delete(targetId);
      loadingByUserId.value = {
        ...loadingByUserId.value,
        [targetId]: false
      };
    }
  })();

  inFlightRequests.set(targetId, fetchPromise);
  return fetchPromise;
};

export interface UserDisplayModel {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  meritCount: number;
  highestAchievement: MeritTier | null;
}

export const getUserDisplayModel = (uid: string | null | undefined): UserDisplayModel | null => {
  if (!uid) return null;
  const p = getProfileById(uid);
  return {
    id: uid,
    name: p?.name || 'Community Member',
    username: p?.username || 'user',
    avatarUrl: p?.avatarUrl || null,
    meritCount: getMeritCount(uid),
    highestAchievement: getHighestTier(uid)
  };
};

export const getMeritAchievements = (userId: string | null | undefined): Achievement[] => {
  if (!userId) return [];
  const targetId = userId.trim();

  if (!hasLoadedGlobalAchievements && !globalAchievementsPromise) {
    loadAllAchievements();
  }

  if (achievementsByUserId.value[targetId]) {
    return achievementsByUserId.value[targetId];
  }

  for (const [uid, list] of Object.entries(achievementsByUserId.value)) {
    if (isSameAppUser(uid, targetId)) {
      return list;
    }
  }

  if (!inFlightRequests.has(targetId) && !hasLoadedGlobalAchievements) {
    loadAchievementsForUser(targetId);
  }

  return [];
};

export const getMeritCount = (userId: string | null | undefined): number => {
  return getMeritAchievements(userId).length;
};

export const isUserAchievementsLoading = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  const targetId = userId.trim();
  if (loadingByUserId.value[targetId] !== undefined) {
    return loadingByUserId.value[targetId];
  }
  if (!achievementsByUserId.value[targetId]) {
    return true;
  }
  return false;
};

export const getHighestTier = (userId: string | null | undefined): MeritTier | null => {
  const count = getMeritCount(userId);
  for (let i = MERIT_TIERS.length - 1; i >= 0; i--) {
    if (count >= MERIT_TIERS[i].minMerits) {
      return MERIT_TIERS[i];
    }
  }
  return null;
};

export const getUserBadges = (userId: string | null | undefined): UserBadgeInfo[] => {
  const count = getMeritCount(userId);
  let highestUnlockedId: string | null = null;

  for (let i = MERIT_TIERS.length - 1; i >= 0; i--) {
    if (count >= MERIT_TIERS[i].minMerits) {
      highestUnlockedId = MERIT_TIERS[i].id;
      break;
    }
  }

  return MERIT_TIERS.map((tier) => ({
    tier,
    unlocked: count >= tier.minMerits,
    isHighest: tier.id === highestUnlockedId
  }));
};

export const getAchievementByPostId = (postId: string): Achievement | null => {
  if (!postId) return null;
  return postAchievementsMap.get(postId) || null;
};

export function useAchievements(
  targetUserIdInput?: Ref<string | null | undefined> | ComputedRef<string | null | undefined> | string | null
) {
  const { currentProfile } = useAuth();
  const { createMeritNotification } = useNotifications();

  const resolvedTargetId = computed(() => {
    if (!targetUserIdInput) return currentAppUserId.value || currentProfile.value?.id || '';
    if (typeof targetUserIdInput === 'string') return targetUserIdInput;
    return targetUserIdInput.value || '';
  });

  const meritAchievements = computed(() => getMeritAchievements(resolvedTargetId.value));
  const meritCount = computed(() => getMeritCount(resolvedTargetId.value));
  const highestMeritBadge = computed(() => getHighestTier(resolvedTargetId.value));
  const unlockedBadges = computed(() => getUserBadges(resolvedTargetId.value));
  const isAchievementsLoading = computed(() => isUserAchievementsLoading(resolvedTargetId.value));

  const awardMeritAndResolvePost = async (params: {
    postId: string;
    postTitle: string;
    postType: PostType;
    postAuthorId: string;
    recipientId?: string | null;
  }) => {
    const authorCanonicalId = currentAppUserId.value || currentProfile.value?.id || sessionUid.value;
    if (!authorCanonicalId) {
      throw new Error('You must be signed in to resolve posts.');
    }

    if (!isSameAppUser(params.postAuthorId, authorCanonicalId)) {
      throw new Error('Only the post author can mark this post as resolved.');
    }

    let helperCanonicalId = params.recipientId?.trim() || null;
    if (helperCanonicalId) {
      helperCanonicalId = await resolveAppUserId(helperCanonicalId);
    }

    if (helperCanonicalId && isSameAppUser(helperCanonicalId, authorCanonicalId)) {
      throw new Error('You cannot award a community merit to yourself.');
    }

    const nextStatus = params.postType === 'found' ? 'returned' : 'resolved';
    const now = new Date().toISOString();

    const postUpdates: Record<string, any> = {
      status: nextStatus,
      resolved_at: now,
      resolved_to: helperCanonicalId,
      updated_at: now
    };

    let newAchievementAwarded = false;
    if (helperCanonicalId) {
      // 1. Check in-memory and database to ensure this post hasn't already awarded a merit
      const existingInMemory = getAchievementByPostId(params.postId);
      if (!existingInMemory) {
        const { data: existingDbAch } = await supabase
          .from('achievements')
          .select('id')
          .eq('post_id', params.postId)
          .eq('badge_id', 'community_merit')
          .maybeSingle();

        if (!existingDbAch) {
          const newAchievementId = `ach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const { error: insertErr } = await supabase.from('achievements').insert({
            id: newAchievementId,
            user_id: helperCanonicalId,
            badge_id: 'community_merit',
            post_id: params.postId,
            awarded_by: authorCanonicalId,
            unlocked_at: now
          });

          if (!insertErr) {
            newAchievementAwarded = true;
          }
        }
      }
    }

    await supabase.from('posts').update(postUpdates).eq('id', params.postId);

    if (helperCanonicalId) {
      await loadAchievementsForUser(helperCanonicalId, true);
    }
    await loadAchievementsForUser(authorCanonicalId, true);

    if (helperCanonicalId && newAchievementAwarded) {
      const awarderName = currentProfile.value?.name || 'A community member';
      createMeritNotification({
        recipientId: helperCanonicalId,
        postId: params.postId,
        postTitle: params.postTitle,
        awardedByName: awarderName
      }).catch(() => {});
    }
  };

  return {
    achievements: achievementsByUserId,
    meritAchievements,
    meritCount,
    highestMeritBadge,
    unlockedBadges,
    isAchievementsLoading,
    isUserAchievementsLoading,
    loadAchievementsForUser,
    loadAchievements: (uid?: string, force = false) => loadAchievementsForUser(uid || resolvedTargetId.value, force),
    subscribeToAchievements: (uid?: string) => loadAchievementsForUser(uid || resolvedTargetId.value),
    getUserMerits: getMeritAchievements,
    getMeritCount,
    getUserBadges,
    getHighestTier,
    getAchievementByPostId,
    loadAllAchievements,
    getUserDisplayModel,
    awardMeritAndResolvePost
  };
}
