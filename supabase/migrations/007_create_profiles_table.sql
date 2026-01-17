/*
  # Create Profiles Table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user's display name)
      - `email` (text, user's email)
      - `birth_year` (integer, birth year)
      - `postcode` (text, postal code)
      - `city` (text, city name)
      - `avatar_url` (text, optional profile picture URL)
      - `interests` (text[], array of interest categories)
      - `is_guest` (boolean, default false)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

  2. Security
    - Enable RLS on `profiles` table
    - Add policy for users to read their own profile
    - Add policy for users to update their own profile
    - Add policy for authenticated users to read public profile data

  3. Functions & Triggers
    - Create function to handle new user profile creation
    - Create trigger to automatically create profile on user signup
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  birth_year integer NOT NULL,
  postcode text NOT NULL,
  city text NOT NULL,
  avatar_url text,
  interests text[] DEFAULT '{}',
  is_guest boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, birth_year, postcode, city, interests)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'birth_year')::integer, 2000),
    COALESCE(new.raw_user_meta_data->>'postcode', '00000'),
    COALESCE(new.raw_user_meta_data->>'city', 'Unknown'),
    COALESCE(
      CASE
        WHEN new.raw_user_meta_data->>'interests' IS NOT NULL
        THEN ARRAY(SELECT jsonb_array_elements_text((new.raw_user_meta_data->>'interests')::jsonb))
        ELSE '{}'::text[]
      END,
      '{}'::text[]
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON profiles(city);
