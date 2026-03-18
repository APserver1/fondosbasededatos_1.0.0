/*
  # Add Income Management Tables

  1. New Tables
    - `income_types`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `incomes`
      - `id` (uuid, primary key)
      - `cut_number` (integer)
      - `date` (date)
      - `establishment_id` (uuid, foreign key)
      - `income_type_id` (uuid, foreign key)
      - `amount` (numeric)
      - `month` (integer)
      - `week` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create income types table
CREATE TABLE income_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create incomes table
CREATE TABLE incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_number integer NOT NULL,
  date date NOT NULL,
  establishment_id uuid REFERENCES establishments(id) NOT NULL,
  income_type_id uuid REFERENCES income_types(id) NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  week integer NOT NULL CHECK (week BETWEEN 1 AND 53),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Create policies for income_types
CREATE POLICY "Enable select for authenticated users only" 
ON income_types FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Create policies for incomes
CREATE POLICY "Enable insert for authenticated users only" 
ON incomes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable select for authenticated users only" 
ON incomes FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users only" 
ON incomes FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users only" 
ON incomes FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Insert income types
INSERT INTO income_types (name) VALUES
  ('Consultas'),
  ('Odontologia'),
  ('Laboratorio'),
  ('Barcos'),
  ('Tarjetas de Salud'),
  ('Otros');