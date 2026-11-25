-- ==============================================================================
-- CRDITEACH SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- PostgreSQL Schema with complete tables, indexes, constraints, RLS policies,
-- and atomic stored procedures for secure peer-to-peer credit transactions.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  email_verified BOOLEAN DEFAULT TRUE,
  phone_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. USER DATA & WALLET (Credits, Tier, Stats, Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'learner')),
  credits INTEGER DEFAULT 0 CHECK (credits >= 0),
  cash NUMERIC(12, 2) DEFAULT 0.0 CHECK (cash >= 0.0),
  tier TEXT DEFAULT 'Apprentice Teacher',
  tier_progress INTEGER DEFAULT 0 CHECK (tier_progress >= 0 AND tier_progress <= 100),
  students_taught INTEGER DEFAULT 0 CHECK (students_taught >= 0),
  total_credits_earned INTEGER DEFAULT 0 CHECK (total_credits_earned >= 0),
  total_cash_earned NUMERIC(12, 2) DEFAULT 0.0 CHECK (total_cash_earned >= 0.0),
  avatar TEXT,
  enrolled_course_ids JSONB DEFAULT '[]'::jsonb,
  active_course_id TEXT,
  claimed_sponsor_ids JSONB DEFAULT '[]'::jsonb,
  ledger JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. COURSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  category_name TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  format TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructor_json JSONB NOT NULL,
  pricing_model TEXT NOT NULL,
  credit_price INTEGER DEFAULT 0 CHECK (credit_price >= 0),
  cash_fee NUMERIC(12, 2) CHECK (cash_fee IS NULL OR cash_fee >= 0.0),
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  video_url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  syllabus_json JSONB NOT NULL,
  notes TEXT,
  tags TEXT DEFAULT '',
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  support_count INTEGER DEFAULT 0 CHECK (support_count >= 0),
  is_live BOOLEAN DEFAULT FALSE,
  stream_id TEXT DEFAULT '',
  live_status TEXT DEFAULT 'ENDED' CHECK (live_status IN ('LIVE', 'PAUSED', 'ENDED')),
  stream_started_at TIMESTAMPTZ,
  stream_paused_at TIMESTAMPTZ,
  stream_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. COURSE COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_comments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. ATOMIC CREDIT TRANSACTIONS LOG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('spend', 'gain', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  title TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. USER FOLLOWS (Peer-to-Peer Following)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- ------------------------------------------------------------------------------
-- 7. USER SAVED ITEMS (Bookmarks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_saved_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, item_id)
);

-- ------------------------------------------------------------------------------
-- 8. USER DOWNLOADS HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_downloads (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'video',
  downloaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 9. USER PLAYLISTS & ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_playlists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(playlist_id, course_id)
);

-- ------------------------------------------------------------------------------
-- 10. USER PREFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT TRUE,
  course_alerts BOOLEAN DEFAULT TRUE,
  activity_privacy BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT NOT NULL,
  reporter_email TEXT DEFAULT '',
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  destination_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_user ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_comments_course ON public.course_comments(course_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_saved_user ON public.user_saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON public.user_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_pl ON public.playlist_items(playlist_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. User Data (Wallet & Progress)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own user data"
  ON public.user_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can fully manage user data"
  ON public.user_data FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are viewable by all users"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Course Comments
ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course comments are viewable by all"
  ON public.course_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON public.course_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.course_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Credit Transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 6. User Follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON public.user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow creators"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow creators"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 7. User Saved Items
ALTER TABLE public.user_saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved items"
  ON public.user_saved_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved items"
  ON public.user_saved_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own saved items"
  ON public.user_saved_items FOR DELETE
  USING (auth.uid() = user_id);

-- 8. User Downloads
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads"
  ON public.user_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own downloads"
  ON public.user_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9. User Playlists
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlists"
  ON public.user_playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists"
  ON public.user_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.user_playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.user_playlists FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Playlist Items
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their own playlists"
  ON public.playlist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_playlists
    WHERE user_playlists.id = playlist_items.playlist_id
    AND user_playlists.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items into their own playlists"
  ON public.playlist_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_playlists
    WHERE user_playlists.id = playlist_items.playlist_id
    AND user_playlists.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own playlists"
  ON public.playlist_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.user_playlists
    WHERE user_playlists.id = playlist_items.playlist_id
    AND user_playlists.user_id = auth.uid()
  ));

-- 11. User Preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- 12. Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- ==============================================================================
-- ATOMIC STORED PROCEDURE: DEDUCT CREDITS FOR COURSE ENROLLMENT
-- Guarantees atomicity, checks sufficient balance, prevents double-enrollment
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.execute_enrollment_with_credits(
  p_user_id UUID,
  p_course_id TEXT,
  p_tx_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit_price INTEGER;
  v_current_credits INTEGER;
  v_enrolled_courses JSONB;
  v_course_title TEXT;
  v_new_credits INTEGER;
  v_ledger_entry JSONB;
BEGIN
  -- 1. Fetch course details
  SELECT title, credit_price INTO v_course_title, v_credit_price
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course not found.');
  END IF;

  -- 2. Lock user_data row for update to guarantee atomicity
  SELECT credits, enrolled_course_ids INTO v_current_credits, v_enrolled_courses
  FROM public.user_data
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User wallet record not found.');
  END IF;

  -- 3. Check if already enrolled
  IF v_enrolled_courses ? p_course_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already enrolled in this course.');
  END IF;

  -- 4. Check sufficient balance
  IF v_current_credits < v_credit_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient credits: balance is %s, required is %s.', v_current_credits, v_credit_price)
    );
  END IF;

  -- 5. Calculate new balance
  v_new_credits := v_current_credits - v_credit_price;
  v_enrolled_courses := v_enrolled_courses || to_jsonb(p_course_id);

  v_ledger_entry := jsonb_build_object(
    'id', p_tx_id,
    'type', 'spend',
    'title', format('Enrolled in "%s"', v_course_title),
    'amount', format('-%s ₢', v_credit_price),
    'date', 'Just now'
  );

  -- 6. Update user_data atomically
  UPDATE public.user_data
  SET credits = v_new_credits,
      enrolled_course_ids = v_enrolled_courses,
      active_course_id = p_course_id,
      ledger = jsonb_insert(ledger, '{0}', v_ledger_entry),
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- 7. Record transaction audit entry
  INSERT INTO public.credit_transactions (
    id, user_id, course_id, type, amount, balance_after, title, idempotency_key, created_at
  ) VALUES (
    p_tx_id, p_user_id, p_course_id, 'spend', v_credit_price, v_new_credits,
    format('Enrolled in "%s"', v_course_title), format('enroll_%s_%s', p_user_id, p_course_id),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully enrolled in "%s" using %s Credits!', v_course_title, v_credit_price),
    'credits', v_new_credits
  );
END;
$$;

-- ==============================================================================
-- REALTIME PUBLICATION & LIVE STREAM INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_stream_id ON public.courses(stream_id);
CREATE INDEX IF NOT EXISTS idx_courses_live_status ON public.courses(live_status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_comments;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

