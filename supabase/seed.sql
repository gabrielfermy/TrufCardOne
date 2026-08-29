-- Seed test user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'authenticated',
  'authenticated',
  'gabriel@test.com',
  extensions.crypt('123456', extensions.gen_salt('bf')),
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Gabriel Aswinta"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Add identity entry for the test user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  'd0d8be02-4ee0-496a-9366-508b53298c4d',
  '{"sub": "d0d8be02-4ee0-496a-9366-508b53298c4d", "email": "gabriel@test.com"}',
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, id) DO NOTHING;
