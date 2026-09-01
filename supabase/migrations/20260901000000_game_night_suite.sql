-- ==============================================================================
-- Game Night Suite - Multi-Tenant & Multi-Game PostgreSQL Database Schema
-- Supports: Truf, Remi (7-card), Omben (Cangkulan), Chess Clock, Generic Scoreboard
-- ==============================================================================

-- 1. Profiles Table (with Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on Google signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-provision existing auth.users into profiles
INSERT INTO public.profiles (id, display_name, email, avatar_url, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  raw_user_meta_data->>'avatar_url',
  'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Assign Admin role to developer email
UPDATE public.profiles SET role = 'admin' WHERE email = 'gabriel.fermy@gmail.com' OR email = 'gabriel.aswinta@gmail.com';

-- 2. Unified Game Sessions Table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_code TEXT UNIQUE,
  game_type TEXT NOT NULL DEFAULT 'truf' CHECK (game_type IN ('truf', 'remi', 'omben', 'generic', 'chess')),
  title TEXT NOT NULL DEFAULT 'Game Night Session',
  player_names JSONB NOT NULL DEFAULT '["Pemain 1", "Pemain 2", "Pemain 3", "Pemain 4"]'::jsonb,
  player_user_ids JSONB DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist
ALTER TABLE public.game_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'truf';
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS player_user_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public sessions access" ON public.game_sessions;
CREATE POLICY "Public sessions access" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);

-- 3. Game Rounds Table
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  round_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (session_id, round_number)
);

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public rounds access" ON public.game_rounds;
CREATE POLICY "Public rounds access" ON public.game_rounds FOR ALL USING (true) WITH CHECK (true);

-- 4. Player Scores Table
CREATE TABLE IF NOT EXISTS public.player_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.game_rounds(id) ON DELETE CASCADE NOT NULL,
  player_index INTEGER NOT NULL CHECK (player_index >= 0),
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_change INTEGER NOT NULL,
  score_cumulative INTEGER NOT NULL,
  UNIQUE (round_id, player_index)
);

ALTER TABLE public.player_scores ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public player scores access" ON public.player_scores;
CREATE POLICY "Public player scores access" ON public.player_scores FOR ALL USING (true) WITH CHECK (true);

-- 5. Saved Players (Address Book)
CREATE TABLE IF NOT EXISTS public.saved_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  avatar TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage saved players" ON public.saved_players;
CREATE POLICY "Users manage saved players" ON public.saved_players FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
