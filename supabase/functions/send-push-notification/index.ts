import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

interface WebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: Record<string, any>;
  old_record?: Record<string, any>;
  notification_id?: string;
}

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FIREBASE_SERVICE_ACCOUNT_STR = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '';
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') || '';

// Create admin supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate OAuth2 Access Token for FCM HTTP v1 using Web Crypto
 */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encode = (obj: Record<string, any>) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedJwt = `${encode(header)}.${encode(claimSet)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Failed to obtain Google OAuth access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

/**
 * Send push notification to a single device token via FCM HTTP v1 or legacy API
 */
async function sendFcmMessage(
  token: string,
  payload: {
    title: string;
    body: string;
    type: string;
    postId?: string | null;
    conversationId?: string | null;
    notificationId?: string | null;
  }
): Promise<{ success: boolean; shouldRemoveToken?: boolean; error?: string }> {
  const dataPayload: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    type: payload.type,
    click_action: 'FCM_PLUGIN_ACTIVITY'
  };

  if (payload.postId) dataPayload.post_id = payload.postId;
  if (payload.conversationId) dataPayload.conversation_id = payload.conversationId;
  if (payload.notificationId) dataPayload.notification_id = payload.notificationId;

  // 1. Try FCM HTTP v1 if service account is configured
  if (FIREBASE_SERVICE_ACCOUNT_STR) {
    try {
      const serviceAccount: ServiceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_STR);
      const accessToken = await getAccessToken(serviceAccount);

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
      const messageBody = {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: dataPayload,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FCM_PLUGIN_ACTIVITY',
              channel_id: 'retrv_notifications'
            }
          }
        }
      };

      const res = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(messageBody)
      });

      const resData = await res.json();
      if (!res.ok) {
        const errCode = resData?.error?.details?.[0]?.errorCode || resData?.error?.message || '';
        const isUnregistered =
          res.status === 404 ||
          errCode.includes('UNREGISTERED') ||
          errCode.includes('NOT_FOUND') ||
          errCode.includes('INVALID_ARGUMENT');

        return {
          success: false,
          shouldRemoveToken: isUnregistered,
          error: JSON.stringify(resData)
        };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[FCM v1] Error sending message:', err);
      // Fallback to legacy key if available
    }
  }

  // 2. Fallback to FCM Legacy Server Key if present
  if (FCM_SERVER_KEY) {
    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${FCM_SERVER_KEY}`
        },
        body: JSON.stringify({
          to: token,
          priority: 'high',
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default'
          },
          data: dataPayload
        })
      });

      const resData = await res.json();
      const firstResult = resData?.results?.[0];
      if (firstResult?.error) {
        const isDeadToken =
          firstResult.error === 'NotRegistered' ||
          firstResult.error === 'InvalidRegistration';
        return {
          success: false,
          shouldRemoveToken: isDeadToken,
          error: firstResult.error
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: String(err) };
    }
  }

  return {
    success: false,
    error: 'No FCM credentials configured. Please set FIREBASE_SERVICE_ACCOUNT or FCM_SERVER_KEY in Supabase Edge Function Secrets.'
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // 1. Resolve notification record
    let record = payload.record;
    if (!record && payload.notification_id) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', payload.notification_id)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Notification not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      record = data;
    }

    if (!record || !record.user_id) {
      return new Response(
        JSON.stringify({ message: 'No valid notification record found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const recipientUserId = record.user_id;
    const notificationType = record.type || 'comment';
    const title = record.title || 'Retrv Notification';
    const body = record.message || record.body || 'You have a new update';

    // 2. Check recipient notification preferences
    const { data: prefRow } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', recipientUserId)
      .maybeSingle();

    if (prefRow) {
      if (prefRow.enabled === false) {
        return new Response(
          JSON.stringify({ message: 'Push notifications globally disabled by recipient' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check specific preference toggles
      if (notificationType === 'message' && prefRow.messages === false) {
        return new Response(
          JSON.stringify({ message: 'Message push notifications disabled by user' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (notificationType === 'comment' && prefRow.comments === false) {
        return new Response(
          JSON.stringify({ message: 'Comment push notifications disabled by user' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (notificationType === 'reply' && prefRow.replies === false) {
        return new Response(
          JSON.stringify({ message: 'Reply push notifications disabled by user' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if ((notificationType === 'merit' || notificationType === 'merit_awarded') && prefRow.merits === false) {
        return new Response(
          JSON.stringify({ message: 'Merit push notifications disabled by user' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (notificationType === 'resolved_post' && prefRow.resolved_posts === false) {
        return new Response(
          JSON.stringify({ message: 'Resolved post push notifications disabled by user' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Load active push tokens for recipient
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', recipientUserId);

    if (tokenError) {
      console.warn('[send-push-notification] Error loading push tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: tokenError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No registered push tokens for user', user_id: recipientUserId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Send FCM Push to all registered device tokens
    const deadTokenIds: string[] = [];
    const results = await Promise.all(
      tokens.map(async (row) => {
        const result = await sendFcmMessage(row.token, {
          title,
          body,
          type: notificationType,
          postId: record.post_id,
          conversationId: record.conversation_id,
          notificationId: record.id
        });

        if (result.shouldRemoveToken) {
          deadTokenIds.push(row.id);
        }

        return result;
      })
    );

    // 5. Clean up expired / unregistered tokens
    if (deadTokenIds.length > 0) {
      await supabase.from('push_tokens').delete().in('id', deadTokenIds);
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: tokens.length,
        cleaned: deadTokenIds.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-push-notification] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
