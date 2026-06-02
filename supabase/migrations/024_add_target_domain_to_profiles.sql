-- Migration: Add target_domain to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_domain text;
