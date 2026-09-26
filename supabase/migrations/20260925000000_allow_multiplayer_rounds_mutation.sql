-- Migration: Allow multiplayer session participants and guest scorers to insert, update, and delete game rounds
-- Date: 2026-09-25

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rounds mutate access" ON public.game_rounds;
DROP POLICY IF EXISTS "Rounds insert access" ON public.game_rounds;
DROP POLICY IF EXISTS "Rounds update access" ON public.game_rounds;
DROP POLICY IF EXISTS "Rounds delete access" ON public.game_rounds;

CREATE POLICY "Rounds mutate access" 
  ON public.game_rounds FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Ensure player_scores allows mutation for all participants
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player scores mutate access" ON public.player_scores;
CREATE POLICY "Player scores mutate access" 
  ON public.player_scores FOR ALL 
  USING (true)
  WITH CHECK (true);
