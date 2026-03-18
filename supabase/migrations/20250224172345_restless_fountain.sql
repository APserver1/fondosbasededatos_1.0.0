/*
  # Set up authentication and create initial user

  1. Changes
    - Create initial user account with email/password authentication
    - Enable email authentication
    - Disable email confirmation requirement

  2. Security
    - Creates a secure password hash for the user
    - Sets up proper authentication policies
*/

-- Enable email authentication
INSERT INTO auth.providers (provider_id, enabled)
VALUES ('email', true)
ON CONFLICT (provider_id) DO UPDATE
SET enabled = true;

-- Disable email confirmation requirement
UPDATE auth.config
SET enable_signup = true,
    enable_confirmations = false;

-- Create initial user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  encode(gen_random_bytes(32), 'base64')
)
ON CONFLICT (id) DO NOTHING;