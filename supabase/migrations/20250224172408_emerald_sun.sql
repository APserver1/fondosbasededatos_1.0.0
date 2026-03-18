/*
  # Set up initial user account

  1. Changes
    - Create initial admin user account
    - Set up authentication settings
    - Configure email authentication

  2. Security
    - Creates a secure password hash
    - Sets up proper authentication configuration
*/

-- Create the initial admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Configure auth settings
UPDATE auth.config SET (
  site_url,
  enable_signup,
  enable_confirmations
) = (
  'http://localhost:5173',
  true,
  false
);