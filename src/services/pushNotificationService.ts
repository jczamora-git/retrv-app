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
    if (status.receive === 'granted') {
      if (import.meta.env.DEV) console.log('[Push] permission: granted');
      return 'granted';
    }
    if (status.receive === 'denied') {
      if (import.meta.env.DEV) console.log('[Push] permission: denied');
      return 'denied';
    }
    return 'prompt';
  } catch (err) {
    console.warn('[pushNotificationService] Check permission error:', err);
    return 'default';
  }
};

/**
 * Prompt user for push notification permission (Android 13+ / iOS) and register.
 * Triggered explicitly from Settings > Notifications > Enable Notifications.
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
      if (import.meta.env.DEV) console.log('[Push] permission: granted');
      await initPushNotifications(userId, currentRouter);
      await PushNotifications.register();
      return true;
    } else {
      if (import.meta.env.DEV) console.log('[Push] permission: denied');
      return false;
    }
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

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: tokenString,
        platform,
        updated_at: now
      },
      { onConflict: 'token' }
    );

    if (!error && import.meta.env.DEV) {
      console.log('[Push] token stored');
    }
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
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[pushNotificationService] Token remove note:', err);
    }
  }
};

/**
 * Clean up active listeners on user sign-out.
 */
export const cleanupPushListeners = async () => {
  if (!isNativePushSupported()) return;
  try {
    await PushNotifications.removeAllListeners();
    isInitialized = false;
  } catch (err) {
    console.warn('[pushNotificationService] Cleanup error:', err);
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

  if (import.meta.env.DEV) {
    console.log('[Push] notification tapped', { type, conversationId, postId });
  }

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
 * Initialize Capacitor Push Notifications listeners for the signed-in user.
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
      if (import.meta.env.DEV) {
        console.log('[Push] registration success');
      }
      if (token?.value) {
        await savePushToken(userId, token.value);
      }
    });

    // 2. Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.warn('[pushNotificationService] Registration error:', error);
    });

    // 3. Listen for foreground notification arrival
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      if (import.meta.env.DEV) {
        console.log('[Push] notification received', notification.title);
      }
    });

    // 4. Listen for user tapping a push notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      handleNotificationAction(action);
    });

    // 5. If permission already granted, register to ensure token is fresh
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn('[pushNotificationService] Init push error:', err);
  }
};
