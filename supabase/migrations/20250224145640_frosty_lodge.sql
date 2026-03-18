/*
  # Initial Schema Setup for Cuts Management System

  1. New Tables
    - `establishments`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `active` (boolean)
      - `created_at` (timestamp)
    
    - `income_codes`
      - `code` (text, primary key)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `cuts`
      - `id` (uuid, primary key)
      - `cut_number` (integer)
      - `date` (date)
      - `establishment_id` (uuid, foreign key)
      - `code` (text, foreign key)
      - `amount` (numeric)
      - `month` (integer)
      - `week` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create establishments table
CREATE TABLE establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create income codes table
CREATE TABLE income_codes (
  code text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create cuts table
CREATE TABLE cuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_number integer NOT NULL,
  date date NOT NULL,
  establishment_id uuid REFERENCES establishments(id) NOT NULL,
  code text REFERENCES income_codes(code) NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  week integer NOT NULL CHECK (week BETWEEN 1 AND 53),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users" ON establishments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON income_codes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON cuts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX cuts_establishment_id_idx ON cuts(establishment_id);
CREATE INDEX cuts_code_idx ON cuts(code);
CREATE INDEX cuts_date_idx ON cuts(date);
CREATE INDEX cuts_month_idx ON cuts(month);
CREATE INDEX cuts_week_idx ON cuts(week);