import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '../utils/supabase';

let isInitialized = false;
let currentRouter: any = null;

export const isNativePushSupported = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check device push notification permission status.
 */
export const checkPushPermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'default'> => {
  if (!isNativePushSupported()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'granted' | 'denied' | 'default';
    }
    return 'default';
  }

  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === 'granted') return 'granted';
    if (status.receive === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('[pushNotificationService] Check permission error:', err);
    return 'default';
  }
};

/**
 * Prompt user for push notification permission (Android 13+ / iOS) and register.
 */
export const requestPushPermission = async (userId: string): Promise<boolean> => {
  if (!isNativePushSupported()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        return result === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[pushNotificationService] Request permission error:', err);
    return false;
  }
};

/**
 * Save / upsert device registration token into Supabase push_tokens table.
 */
export const savePushToken = async (userId: string, tokenString: string): Promise<void> => {
  if (!userId || !tokenString) return;

  try {
    const platform = Capacitor.getPlatform();
    const now = new Date().toISOString();

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: tokenString,
        platform,
        updated_at: now
      },
      { onConflict: 'token' }
    );
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[pushNotificationService] Token save note:', err);
    }
  }
};

/**
 * Remove token on sign-out for the given user.
 */
export const removePushToken = async (userId: string): Promise<void> => {
  if (!userId) return;

  try {
    // Unassociate tokens for this user
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('[pushNotificationService] Token remove note:', err);
  }
};

/**
 * Handle user tapping a push notification and route accurately.
 */
export const handleNotificationAction = (action: ActionPerformed) => {
  const data = action.notification?.data || {};
  const type = data.type;
  const conversationId = data.conversation_id || data.conversationId;
  const postId = data.post_id || data.postId;

  if (!currentRouter) return;

  if ((type === 'message' || conversationId) && conversationId) {
    currentRouter.push(`/chat/${conversationId}`);
  } else if (type === 'merit' || type === 'merit_awarded') {
    currentRouter.push('/tabs/profile');
  } else if (postId) {
    currentRouter.push(`/post/${postId}`);
  } else {
    currentRouter.push('/tabs/home');
  }
};

/**
 * Initialize Capacitor Push Notifications listeners on app startup for the signed-in user.
 */
export const initPushNotifications = async (userId: string, router?: any) => {
  if (router) {
    currentRouter = router;
  }

  if (!isNativePushSupported() || !userId) return;

  if (isInitialized) return;
  isInitialized = true;

  try {
    // 1. Listen for registration success
    await PushNotifications.addListener('registration', async (token: Token) => {
      if (token?.value) {
        await savePushToken(userId, token.value);
      }
    });

    // 2. Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.warn('[pushNotificationService] Registration error:', error);
    });

    // 3. Listen for foreground notification arrival (Supabase Realtime updates UI; avoid duplicate noisy banners)
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      if (import.meta.env.DEV) {
        console.log('[pushNotificationService] Push received in foreground:', notification);
      }
    });

    // 4. Listen for user tapping a push notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      handleNotificationAction(action);
    });

    // 5. If permission already granted, register immediately
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn('[pushNotificationService] Init push error:', err);
  }
};
