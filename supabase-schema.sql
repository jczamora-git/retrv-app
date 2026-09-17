-- Supabase Schema for Retrv (Community Lost & Found)
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  avatar_key TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  custom_category TEXT,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'claimed')),
  photos JSONB DEFAULT '[]'::jsonb,
  coordinates JSONB,
  resolved_to TEXT,
  resolved_at TIMESTAMPTZ,
  client_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  client_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  participant_ids JSONB DEFAULT '[]'::jsonb,
  participants JSONB DEFAULT '{}'::jsonb,
  post_id TEXT,
  post_title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  unread_counts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  text TEXT,
  image_url TEXT,
  thread_id TEXT DEFAULT 'general',
  post_id TEXT,
  read BOOLEAN DEFAULT false,
  client_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_username TEXT,
  actor_avatar_url TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  body TEXT,
  post_id TEXT,
  post_title TEXT,
  conversation_id TEXT,
  comment_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Push Tokens Table (for mobile push delivery via FCM / APNs)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id TEXT PRIMARY KEY DEFAULT ('tok_' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Notification Preferences Table
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

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  post_id TEXT,
  awarded_by TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Subcategories Table (dynamic custom user subcategories)
CREATE TABLE IF NOT EXISTS public.subcategories (
  id TEXT PRIMARY KEY,
  category_key TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Lost & Found Activity Log Table (legacy/activity log)
CREATE TABLE IF NOT EXISTS public.lost_found (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  date TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for app functionality (or tailor per auth role)
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read on posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on posts" ON public.posts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on posts" ON public.posts FOR DELETE USING (true);

CREATE POLICY "Allow public read on comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on comments" ON public.comments FOR DELETE USING (true);

CREATE POLICY "Allow public read on conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on conversations" ON public.conversations FOR UPDATE USING (true);

CREATE POLICY "Allow public read on messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on messages" ON public.messages FOR UPDATE USING (true);

CREATE POLICY "Allow user read own notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow app insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow user update own notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Allow user delete own notifications" ON public.notifications FOR DELETE USING (true);

CREATE POLICY "Allow user read own push tokens" ON public.push_tokens FOR SELECT USING (true);
CREATE POLICY "Allow user insert/upsert push tokens" ON public.push_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow user update push tokens" ON public.push_tokens FOR UPDATE USING (true);
CREATE POLICY "Allow user delete push tokens" ON public.push_tokens FOR DELETE USING (true);

CREATE POLICY "Allow user read notification preferences" ON public.notification_preferences FOR SELECT USING (true);
CREATE POLICY "Allow user upsert notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow user update notification preferences" ON public.notification_preferences FOR UPDATE USING (true);

CREATE POLICY "Allow public read on achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Allow public insert on achievements" ON public.achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on subcategories" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Allow public insert on subcategories" ON public.subcategories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on lost_found" ON public.lost_found FOR SELECT USING (true);
CREATE POLICY "Allow public insert on lost_found" ON public.lost_found FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on lost_found" ON public.lost_found FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on lost_found" ON public.lost_found FOR DELETE USING (true);

-- ============================================================================
-- EXISTING MIGRATIONS (Run if not already applied in previous versions)
-- ============================================================================

-- Migration: Idempotency & Request Deduplication
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS client_request_id UUID;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_request_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_client_req ON public.posts(author_id, client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_client_req ON public.messages(sender_id, client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_client_req ON public.comments(author_id, client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_post_badge ON public.achievements(post_id, badge_id) WHERE post_id IS NOT NULL;

-- General Performance Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Enable Realtime publication for real-time live sync
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.posts,
    public.comments,
    public.conversations,
    public.messages,
    public.notifications,
    public.achievements,
    public.subcategories,
    public.lost_found;
COMMIT;

-- ============================================================================
-- NEW MIGRATION: Chat Post Threads Support
-- Run this block in Supabase SQL Editor if your database is already up to date
-- with prior migrations.
-- ============================================================================

-- 1. Add thread_id and post_id columns to public.messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_id TEXT DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS post_id TEXT;

-- 2. Index for fast thread-based querying and real-time filtering
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(conversation_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_post_id ON public.messages(post_id) WHERE post_id IS NOT NULL;

-- 3. Backfill existing legacy messages with post_id if missing thread_id
UPDATE public.messages
SET thread_id = 'post_' || post_id
WHERE post_id IS NOT NULL AND (thread_id IS NULL OR thread_id = 'general');


