-- Fix game_sessions settings default constraints and change atasExcessMult to negative 1
ALTER TABLE public.game_sessions ALTER COLUMN settings SET DEFAULT '{
  "multiplier": 10,
  "bid0Bonus": 10,
  "prevent13": false,
  "atasLackMult": -2,
  "atasExcessMult": -1,
  "bawahLackMult": -1,
  "bawahExcessMult": -2
}'::jsonb;

-- Update existing game sessions to use the correct multipliers and default settings
UPDATE public.game_sessions 
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(settings, '{atasExcessMult}', '-1'::jsonb),
    '{multiplier}', '10'::jsonb
  ),
  '{prevent13}', 'false'::jsonb
);
