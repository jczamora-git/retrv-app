import { ref, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { supabase } from '../utils/supabase';
import { sessionUid, getSessionUser } from './useAuth';

export interface NotificationPreferences {
  enabled: boolean;
  messages: boolean;
  comments: boolean;
  replies: boolean;
  newPosts: boolean;
  merits: boolean;
  resolvedPosts: boolean;
  postUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messages: true,
  comments: true,
  replies: true,
  newPosts: false,
  merits: true,
  resolvedPosts: true,
  postUpdates: true
};

import { checkPushPermission, requestPushPermission as requestPushPermissionService } from '../services/pushNotificationService';

const preferences = ref<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
const loading = ref(false);
const saving = ref(false);
const devicePermission = ref<'granted' | 'denied' | 'prompt' | 'default'>('default');

const getStorageKey = (uid: string) => `retrv_notif_prefs_${uid}`;

export function useNotificationPreferences() {
  const isMasterEnabled = computed(() => preferences.value.enabled);

  const checkDevicePermission = async () => {
    devicePermission.value = await checkPushPermission();
  };

  const requestDevicePermission = async (): Promise<boolean> => {
    const session = await getSessionUser();
    const uid = session?.uid || sessionUid.value;
    if (!uid) return false;

    const granted = await requestPushPermissionService(uid);
    await checkDevicePermission();
    return granted;
  };

  const loadPreferences = async (userId?: string) => {
    const session = await getSessionUser();
    const uid = userId || session?.uid || sessionUid.value;
    if (!uid) return;

    loading.value = true;

    // 1. Instant load from localStorage cache
    try {
      const cached = localStorage.getItem(getStorageKey(uid));
      if (cached) {
        preferences.value = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(cached) };
      }
    } catch {}

    // 2. Fetch from Supabase notification_preferences table
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (!error && data) {
        preferences.value = {
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
          messages: data.messages !== undefined ? Boolean(data.messages) : true,
          comments: data.comments !== undefined ? Boolean(data.comments) : true,
          replies: data.replies !== undefined ? Boolean(data.replies) : true,
          newPosts: data.new_posts !== undefined ? Boolean(data.new_posts) : false,
          merits: data.merits !== undefined ? Boolean(data.merits) : true,
          resolvedPosts: data.resolved_posts !== undefined ? Boolean(data.resolved_posts) : true,
          postUpdates: data.post_updates !== undefined ? Boolean(data.post_updates) : true
        };

        // Cache latest fetched
        localStorage.setItem(getStorageKey(uid), JSON.stringify(preferences.value));
      }
    } catch (err) {
      console.warn('[useNotificationPreferences] Supabase fetch fallback to local cache:', err);
    } finally {
      loading.value = false;
      await checkDevicePermission();
    }
  };

  const savePreferences = async () => {
    const session = await getSessionUser();
    const uid = session?.uid || sessionUid.value;
    if (!uid) return;

    saving.value = true;

    // 1. Immediately persist to localStorage
    try {
      localStorage.setItem(getStorageKey(uid), JSON.stringify(preferences.value));
    } catch {}

    // 2. Persist to Supabase notification_preferences
    try {
      const payload = {
        user_id: uid,
        enabled: preferences.value.enabled,
        messages: preferences.value.messages,
        comments: preferences.value.comments,
        replies: preferences.value.replies,
        new_posts: preferences.value.newPosts,
        merits: preferences.value.merits,
        resolved_posts: preferences.value.resolvedPosts,
        post_updates: preferences.value.postUpdates,
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('notification_preferences')
        .upsert(payload, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('[useNotificationPreferences] Supabase save warning (cached locally):', err);
    } finally {
      saving.value = false;
    }
  };

  const updatePreference = async <K extends keyof NotificationPreferences>(
    key: K,
    val: NotificationPreferences[K]
  ) => {
    preferences.value[key] = val;
    await savePreferences();
  };

  const setMasterEnabled = async (enabled: boolean) => {
    preferences.value.enabled = enabled;
    await savePreferences();
  };

  return {
    preferences,
    loading,
    saving,
    isMasterEnabled,
    devicePermission,
    checkDevicePermission,
    requestDevicePermission,
    loadPreferences,
    savePreferences,
    updatePreference,
    setMasterEnabled
  };
}

/**
 * Helper to inspect recipient's preferences before inserting notification records
 */
export async function shouldSendNotification(
  userId: string,
  category: keyof Omit<NotificationPreferences, 'enabled'>
): Promise<boolean> {
  if (!userId) return false;

  // Check local cache first
  try {
    const cached = localStorage.getItem(getStorageKey(userId));
    if (cached) {
      const parsed: NotificationPreferences = JSON.parse(cached);
      if (parsed.enabled === false) return false;
      if (parsed[category] === false) return false;
      return true;
    }
  } catch {}

  // Check Supabase
  try {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      if (data.enabled === false) return false;
      const columnMap: Record<string, string> = {
        messages: 'messages',
        comments: 'comments',
        replies: 'replies',
        newPosts: 'new_posts',
        merits: 'merits',
        resolvedPosts: 'resolved_posts',
        postUpdates: 'post_updates'
      };
      const col = columnMap[category];
      if (col && data[col] === false) return false;
    }
  } catch {}

  // Default true for standard categories (except newPosts which defaults to false)
  return category !== 'newPosts';
}
