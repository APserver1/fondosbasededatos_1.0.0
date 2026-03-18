/*
  # Fix RLS policies for cuts table

  1. Changes
    - Drop existing RLS policy for cuts table
    - Create new RLS policy that properly handles authenticated users
    - Add explicit policies for INSERT, SELECT, UPDATE, and DELETE operations

  2. Security
    - Ensures authenticated users can perform all operations on their cuts
    - Maintains data security while allowing proper access
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cuts;

-- Create specific policies for each operation
CREATE POLICY "Enable insert for authenticated users only" 
ON cuts FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable select for authenticated users only" 
ON cuts FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users only" 
ON cuts FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users only" 
ON cuts FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);