-- Migration: Complete missing columns and alter constraints for game_sessions & game_rounds
-- Ensures unified game suite schema functions seamlessly

-- 1. game_sessions table
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Game Night Session';
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS player_names JSONB NOT NULL DEFAULT '["Pemain 1", "Pemain 2", "Pemain 3", "Pemain 4"]'::jsonb;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Allow legacy player columns to be nullable
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_sessions' AND column_name = 'player1_name') THEN
    ALTER TABLE public.game_sessions ALTER COLUMN player1_name DROP NOT NULL;
    ALTER TABLE public.game_sessions ALTER COLUMN player2_name DROP NOT NULL;
    ALTER TABLE public.game_sessions ALTER COLUMN player3_name DROP NOT NULL;
    ALTER TABLE public.game_sessions ALTER COLUMN player4_name DROP NOT NULL;
  END IF;
END $$;

-- Populate player_names from legacy columns if empty
UPDATE public.game_sessions
SET player_names = jsonb_build_array(
  COALESCE(player1_name, 'Pemain 1'),
  COALESCE(player2_name, 'Pemain 2'),
  COALESCE(player3_name, 'Pemain 3'),
  COALESCE(player4_name, 'Pemain 4')
)
WHERE (player_names IS NULL OR player_names = '[]'::jsonb)
  AND player1_name IS NOT NULL;

-- 2. game_rounds table
ALTER TABLE public.game_rounds ADD COLUMN IF NOT EXISTS round_data JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_rounds' AND column_name = 'dealer_index') THEN
    ALTER TABLE public.game_rounds ALTER COLUMN dealer_index DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_rounds' AND column_name = 'truf_suit_index') THEN
    ALTER TABLE public.game_rounds ALTER COLUMN truf_suit_index DROP NOT NULL;
  END IF;
END $$;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
