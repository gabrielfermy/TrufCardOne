-- Migration: Allow multiplayer session participants to claim/release seats and update session settings
-- Date: 2026-09-19

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions update access" ON public.game_sessions;
CREATE POLICY "Sessions update access" 
  ON public.game_sessions FOR UPDATE 
  USING (true)
  WITH CHECK (true);
