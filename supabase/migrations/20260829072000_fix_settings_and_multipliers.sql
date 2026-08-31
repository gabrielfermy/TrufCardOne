ALTER TABLE public.game_sessions ALTER COLUMN settings SET DEFAULT '{
  "multiplier": 1,
  "bid0Bonus": 0,
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
    jsonb_set(
      jsonb_set(settings, '{atasExcessMult}', '-1'::jsonb),
      '{multiplier}', '1'::jsonb
    ),
    '{prevent13}', 'false'::jsonb
  ),
  '{bid0Bonus}', '0'::jsonb
);
