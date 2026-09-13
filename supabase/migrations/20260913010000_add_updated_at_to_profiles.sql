-- Migration: Add updated_at column to public.profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
