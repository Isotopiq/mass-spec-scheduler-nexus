-- Fix critical security vulnerability: Remove overly permissive profile access policy
-- This policy allows ANY authenticated user to view ALL profiles, which exposes
-- sensitive personal data including emails, names, and departments.

-- Drop the problematic policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Verify that proper policies remain:
-- 1. "Admins can view all profiles" - allows admins to manage users
-- 2. "Users can view their own profile" - allows users to see only their own data

-- These existing policies provide the correct access control:
-- - Users can only view their own profile data
-- - Admins can view all profiles for management purposes