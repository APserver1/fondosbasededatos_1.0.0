-- Migration: Add user_id to cuts and incomes tables and update RLS policies

BEGIN;

-- Add usuario_id column to cuts table, referencing auth.users
ALTER TABLE public.cuts
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Add usuario_id column to incomes table, referencing auth.users
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Update existing cuts with a default user_id (e.g., admin@example.com)
-- This assumes an admin user with this email exists. Ensure this user is created in a prior migration.
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1
)
UPDATE public.cuts
SET usuario_id = (SELECT id FROM admin_user)
WHERE usuario_id IS NULL AND EXISTS (SELECT 1 FROM admin_user);

-- Update existing incomes with a default user_id (e.g., admin@example.com)
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1
)
UPDATE public.incomes
SET usuario_id = (SELECT id FROM admin_user)
WHERE usuario_id IS NULL AND EXISTS (SELECT 1 FROM admin_user);

-- RLS Policies for 'cuts' table
-- Drop existing policies (ensure these are the correct names from your setup)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.cuts;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.cuts;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.cuts;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.cuts;

-- Create new RLS policies for 'cuts' table to associate records with users
CREATE POLICY "Cuts: Authenticated users can insert their own records" 
ON public.cuts FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cuts: Authenticated users can select their own records" 
ON public.cuts FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id);

CREATE POLICY "Cuts: Authenticated users can update their own records" 
ON public.cuts FOR UPDATE 
TO authenticated 
USING (auth.uid() = usuario_id) 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cuts: Authenticated users can delete their own records" 
ON public.cuts FOR DELETE 
TO authenticated 
USING (auth.uid() = usuario_id);

-- RLS Policies for 'incomes' table
-- Ensure RLS is enabled for the incomes table
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (replace with actual policy names if different or if they don't exist, these will be ignored)
DROP POLICY IF EXISTS "Enable insert for authenticated users only on incomes" ON public.incomes;
DROP POLICY IF EXISTS "Enable select for authenticated users only on incomes" ON public.incomes;
DROP POLICY IF EXISTS "Enable update for authenticated users only on incomes" ON public.incomes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only on incomes" ON public.incomes;
-- If there are generic policies like the ones for 'cuts' initially, drop them too.
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.incomes; 


-- Create new RLS policies for 'incomes' table
CREATE POLICY "Incomes: Authenticated users can insert their own records" 
ON public.incomes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Incomes: Authenticated users can select their own records" 
ON public.incomes FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id);

CREATE POLICY "Incomes: Authenticated users can update their own records" 
ON public.incomes FOR UPDATE 
TO authenticated 
USING (auth.uid() = usuario_id) 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Incomes: Authenticated users can delete their own records" 
ON public.incomes FOR DELETE 
TO authenticated 
USING (auth.uid() = usuario_id);

-- Optional: Add NOT NULL constraint if all records are expected to have a user and existing ones are updated.
-- Make sure to run the UPDATE statements before applying NOT NULL.
-- ALTER TABLE public.cuts ALTER COLUMN usuario_id SET NOT NULL;
-- ALTER TABLE public.incomes ALTER COLUMN usuario_id SET NOT NULL;

COMMIT;