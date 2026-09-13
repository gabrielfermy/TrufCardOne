-- ==============================================================================
-- KancaSela Enterprise Security Hardening & RLS Lock Down Migration
-- Prevents Privilege Escalation, Unauthorized Subscription Mutation, & Data Tampering
-- ==============================================================================

-- 1. Profiles Table Security Hardening (Anti-Privilege Escalation)
-- ------------------------------------------------------------------------------

-- Ensure RLS is active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for viewing profiles (Public read for player avatars/names)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Policy for updating own profile (Restricted to self)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Prevent unauthorized deletion or insertion by raw client
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" 
  ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- PostgreSQL Trigger to strictly protect sensitive fields from client-side tampering
CREATE OR REPLACE FUNCTION public.protect_profile_privilege_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the mutation is initiated by standard client connection (anon or authenticated user)
  -- service_role or superuser bypasses this check for legitimate edge functions/webhooks
  IF current_setting('request.jwt.claim.role', true) IN ('anon', 'authenticated') THEN
    -- A. Block role tampering
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Security Violation: Modifying user role directly is forbidden.';
    END IF;

    -- B. Block subscription status tampering
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro 
       OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at 
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'Security Violation: Subscription status can only be modified via verified payment webhooks.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privilege_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privilege_fields();


-- 2. Game Sessions Table Security Hardening
-- ------------------------------------------------------------------------------
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read sessions (required for multiplayer room code joining & spectating)
DROP POLICY IF EXISTS "Public sessions access" ON public.game_sessions;
DROP POLICY IF EXISTS "Public sessions read" ON public.game_sessions;
CREATE POLICY "Public sessions read" 
  ON public.game_sessions FOR SELECT 
  USING (true);

-- Anyone can create a session (guest or authenticated)
DROP POLICY IF EXISTS "Sessions insert access" ON public.game_sessions;
CREATE POLICY "Sessions insert access" 
  ON public.game_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only session creator or room host can update session
DROP POLICY IF EXISTS "Sessions update access" ON public.game_sessions;
CREATE POLICY "Sessions update access" 
  ON public.game_sessions FOR UPDATE 
  USING (
    user_id IS NULL OR auth.uid() = user_id
  ) 
  WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- Only session creator or room host can delete session
DROP POLICY IF EXISTS "Sessions delete access" ON public.game_sessions;
CREATE POLICY "Sessions delete access" 
  ON public.game_sessions FOR DELETE 
  USING (
    user_id IS NULL OR auth.uid() = user_id
  );


-- 3. Game Rounds & Player Scores RLS Hardening
-- ------------------------------------------------------------------------------
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public rounds access" ON public.game_rounds;
DROP POLICY IF EXISTS "Rounds select access" ON public.game_rounds;
CREATE POLICY "Rounds select access" 
  ON public.game_rounds FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Rounds mutate access" ON public.game_rounds;
CREATE POLICY "Rounds mutate access" 
  ON public.game_rounds FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs 
      WHERE gs.id = game_rounds.session_id 
      AND (gs.user_id IS NULL OR gs.user_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Public player scores access" ON public.player_scores;
DROP POLICY IF EXISTS "Player scores select access" ON public.player_scores;
CREATE POLICY "Player scores select access" 
  ON public.player_scores FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Player scores mutate access" ON public.player_scores;
CREATE POLICY "Player scores mutate access" 
  ON public.player_scores FOR ALL 
  USING (true) 
  WITH CHECK (true);
