/*
  # Fix: Remove duplicate user_stats trigger
  
  Problem: Es gibt 2 Trigger die user_stats erstellen:
  1. create_user_stats auf auth.users
  2. on_profile_created auf profiles
  
  Das führt zu Konflikten. Wir behalten nur den auf profiles.
*/

-- Lösche den doppelten Trigger auf auth.users
DROP TRIGGER IF EXISTS create_user_stats ON auth.users;

-- Lösche die Funktion
DROP FUNCTION IF EXISTS update_user_stats();
