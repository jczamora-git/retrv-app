-- ============================================================================
-- MIGRATION: Push Notification Tables, RLS, Indexes & Realtime Setup
-- ============================================================================

-- 1. Push Tokens Table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id TEXT PRIMARY KEY DEFAULT ('tok_' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id TEXT PRIMARY KEY DEFAULT ('pref_' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true NOT NULL,
  messages BOOLEAN DEFAULT true NOT NULL,
  comments BOOLEAN DEFAULT true NOT NULL,
  replies BOOLEAN DEFAULT true NOT NULL,
  new_posts BOOLEAN DEFAULT true NOT NULL,
  merits BOOLEAN DEFAULT true NOT NULL,
  resolved_posts BOOLEAN DEFAULT true NOT NULL,
  post_updates BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Notifications Table Columns (if table pre-exists)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_username TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_avatar_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS comment_id TEXT;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- 5. Row Level Security (RLS)
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated & user RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Allow user manage own push tokens') THEN
    CREATE POLICY "Allow user manage own push tokens" ON public.push_tokens FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Allow user manage own preferences') THEN
    CREATE POLICY "Allow user manage own preferences" ON public.notification_preferences FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow user manage notifications') THEN
    CREATE POLICY "Allow user manage notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Add to Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;
