-- Migration: Add Pro subscription fields to public.profiles
-- Supports ad-free experience & premium features

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('guest', 'free', 'pro', 'venue'));

-- Index for fast status checking
CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON public.profiles(id, is_pro);

COMMENT ON COLUMN public.profiles.is_pro IS 'Indicates if the user has an active Kanca Pro ad-free subscription';
COMMENT ON COLUMN public.profiles.pro_expires_at IS 'Expiration timestamp for time-limited Pro subscriptions';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'User subscription tier: guest, free, pro, or venue';
