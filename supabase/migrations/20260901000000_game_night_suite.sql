-- ==============================================================================
-- Game Night Suite - Multi-Tenant & Multi-Game PostgreSQL Database Schema
-- Supports: Truf, Remi (7-card), Omben (Cangkulan), Chess Clock, Generic Scoreboard
-- Features: Multi-Tenancy with RLS, Public Room Spectating, Seat Claiming, Admin Role
-- ==============================================================================

-- 1. Profiles Table (with Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- 2. Unified Game Sessions Table (2-8 Players, Room Code, Claimed Slots)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_code TEXT UNIQUE,
  game_type TEXT NOT NULL DEFAULT 'truf' CHECK (game_type IN ('truf', 'remi', 'omben', 'generic', 'chess')),
  title TEXT NOT NULL DEFAULT 'Game Night Session',
  player_names JSONB NOT NULL DEFAULT '["Pemain 1", "Pemain 2", "Pemain 3", "Pemain 4"]'::jsonb,
  player_user_ids JSONB DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{
    "multiplier": 1,
    "bid0Bonus": 0,
    "prevent13": false,
    "bid13Decision": true,
    "atasLackMult": -2,
    "atasExcessMult": -1,
    "bawahLackMult": -1,
    "bawahExcessMult": -2,
    "remiTargetPenalty": 500,
    "remiTutupMurniDouble": true,
    "ombenTargetLoss": 5
  }'::jsonb,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all new columns exist on game_sessions if created in an older migration
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'truf' CHECK (game_type IN ('truf', 'remi', 'omben', 'generic', 'chess'));
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS player_user_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{
  "multiplier": 1,
  "bid0Bonus": 0,
  "prevent13": false,
  "bid13Decision": true,
  "atasLackMult": -2,
  "atasExcessMult": -1,
  "bawahLackMult": -1,
  "bawahExcessMult": -2,
  "remiTargetPenalty": 500,
  "remiTutupMurniDouble": true,
  "ombenTargetLoss": 5
}'::jsonb;

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Game Sessions Policies
DROP POLICY IF EXISTS "Anyone can view sessions with room code" ON public.game_sessions;
CREATE POLICY "Anyone can view sessions with room code" ON public.game_sessions 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts manage own sessions" ON public.game_sessions;
CREATE POLICY "Hosts manage own sessions" ON public.game_sessions 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Claimed players can update claimed slot" ON public.game_sessions;
CREATE POLICY "Claimed players can update claimed slot" ON public.game_sessions 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

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

-- Game Rounds Policies
DROP POLICY IF EXISTS "Anyone can view rounds of public room" ON public.game_rounds;
CREATE POLICY "Anyone can view rounds of public room" ON public.game_rounds 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts manage rounds" ON public.game_rounds;
CREATE POLICY "Hosts manage rounds" ON public.game_rounds 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.game_sessions WHERE id = game_rounds.session_id AND user_id = auth.uid())
  );

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

-- Player Scores Policies
DROP POLICY IF EXISTS "Anyone can view player scores of public room" ON public.player_scores;
CREATE POLICY "Anyone can view player scores of public room" ON public.player_scores 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts manage player scores" ON public.player_scores;
CREATE POLICY "Hosts manage player scores" ON public.player_scores 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_rounds 
      JOIN public.game_sessions ON game_sessions.id = game_rounds.session_id
      WHERE game_rounds.id = player_scores.round_id AND game_sessions.user_id = auth.uid()
    )
  );

-- 5. Saved Players (Host Address Book)
CREATE TABLE IF NOT EXISTS public.saved_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  avatar TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved players" ON public.saved_players 
  FOR ALL USING (auth.uid() = user_id);

-- 6. Trigger to automatically sync Auth Users to Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Realtime Enablement (Safely add to publication)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player_scores;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
