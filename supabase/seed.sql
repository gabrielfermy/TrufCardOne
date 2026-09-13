-- ==============================================================================
-- KancaSela - Local Development Seed Data
-- Creates Test Users (Admin, Pro, Free) and Sample Game Sessions for Local Testing
-- ==============================================================================

-- 1. Seed Test Users into auth.users

-- User 1: Gabriel (Admin + Pro)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'authenticated',
  'authenticated',
  'gabriel@test.com',
  extensions.crypt('123456', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Gabriel Aswinta (Admin)"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  '{"sub": "d0d8be02-4ee0-496a-9366-508b53298c4d", "email": "gabriel@test.com"}',
  'email',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  now(), now(), now()
) ON CONFLICT DO NOTHING;

-- User 2: Pro User (Ad-Free)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0d8be02-4ee0-496a-9366-508b53298c4e',
  'authenticated',
  'authenticated',
  'pro@kancasela.local',
  extensions.crypt('123456', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Kanca Pro Member"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'd0d8be02-4ee0-496a-9366-508b53298c4e',
  'd0d8be02-4ee0-496a-9366-508b53298c4e',
  '{"sub": "d0d8be02-4ee0-496a-9366-508b53298c4e", "email": "pro@kancasela.local"}',
  'email',
  'd0d8be02-4ee0-496a-9366-508b53298c4e',
  now(), now(), now()
) ON CONFLICT DO NOTHING;

-- User 3: Free User (With Ads)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0d8be02-4ee0-496a-9366-508b53298c4f',
  'authenticated',
  'authenticated',
  'free@kancasela.local',
  extensions.crypt('123456', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Free Player (With Ads)"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'd0d8be02-4ee0-496a-9366-508b53298c4f',
  'd0d8be02-4ee0-496a-9366-508b53298c4f',
  '{"sub": "d0d8be02-4ee0-496a-9366-508b53298c4f", "email": "free@kancasela.local"}',
  'email',
  'd0d8be02-4ee0-496a-9366-508b53298c4f',
  now(), now(), now()
) ON CONFLICT DO NOTHING;

-- 2. Upsert Profiles Table
INSERT INTO public.profiles (id, display_name, email, role, is_pro, subscription_tier, created_at)
VALUES
  ('d0d8be02-4ee0-496a-9366-508b53298c4d', 'Gabriel Aswinta (Admin)', 'gabriel@test.com', 'admin', true, 'pro', now()),
  ('d0d8be02-4ee0-496a-9366-508b53298c4e', 'Kanca Pro Member', 'pro@kancasela.local', 'user', true, 'pro', now()),
  ('d0d8be02-4ee0-496a-9366-508b53298c4f', 'Free Player (With Ads)', 'free@kancasela.local', 'user', false, 'free', now())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_pro = EXCLUDED.is_pro,
  subscription_tier = EXCLUDED.subscription_tier;

-- 3. Sample Game Sessions

-- Session 1: Completed Truf Game
INSERT INTO public.game_sessions (
  id, user_id, room_code, game_type, title, player_names, player_user_ids, settings, is_completed, created_at, updated_at
) VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'TRUF88',
  'truf',
  'Truf Malam Minggu (Test)',
  '["Gabriel", "Budi", "Siti", "Eko"]'::jsonb,
  '["d0d8be02-4ee0-496a-9366-508b53298c4d", null, null, null]'::jsonb,
  '{"multiplier": 1, "bid0Bonus": 0, "prevent13": false, "atasLackMult": -2, "atasExcessMult": -1, "bawahLackMult": -1, "bawahExcessMult": -2}'::jsonb,
  true,
  now() - interval '2 hours',
  now() - interval '1 hour'
) ON CONFLICT DO NOTHING;

-- Rounds & Scores for Session 1 (Valid Hex UUIDs)
INSERT INTO public.game_rounds (id, session_id, round_number, round_data, created_at)
VALUES
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c01', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 1, '{"dealerIndex": 0, "trufSuit": 0, "playMode": "atas"}'::jsonb, now() - interval '100 minutes'),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c02', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 2, '{"dealerIndex": 1, "trufSuit": 1, "playMode": "bawah"}'::jsonb, now() - interval '80 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO public.player_scores (round_id, player_index, stats, score_change, score_cumulative)
VALUES
  -- Round 1
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c01', 0, '{"bid": 4, "won": 4}'::jsonb, 4, 4),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c01', 1, '{"bid": 3, "won": 2}'::jsonb, -2, -2),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c01', 2, '{"bid": 3, "won": 4}'::jsonb, -1, -1),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c01', 3, '{"bid": 4, "won": 3}'::jsonb, -2, -2),
  -- Round 2
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c02', 0, '{"bid": 3, "won": 3}'::jsonb, 3, 7),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c02', 1, '{"bid": 2, "won": 3}'::jsonb, -2, -4),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c02', 2, '{"bid": 4, "won": 4}'::jsonb, 4, 3),
  ('b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c02', 3, '{"bid": 3, "won": 3}'::jsonb, 3, 1)
ON CONFLICT DO NOTHING;

-- Session 2: Active Room (Joinable by code 'TEST88')
INSERT INTO public.game_sessions (
  id, user_id, room_code, game_type, title, player_names, player_user_ids, settings, is_completed, created_at, updated_at
) VALUES (
  'a2b3c4d5-e6f7-4a5b-8c9d-0e1f2a3b4c5e',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'TEST88',
  'remi',
  'Live Test Remi Match',
  '["Gabriel", "Andi", "Dewi", "Fajar"]'::jsonb,
  '["d0d8be02-4ee0-496a-9366-508b53298c4d", null, null, null]'::jsonb,
  '{"remiTargetPenalty": 500, "remiTutupMurniDouble": true}'::jsonb,
  false,
  now() - interval '15 minutes',
  now() - interval '5 minutes'
) ON CONFLICT DO NOTHING;
