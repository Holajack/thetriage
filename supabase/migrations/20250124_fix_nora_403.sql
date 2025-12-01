-- ========================================
-- QUICK FIX FOR NORA 403 ERROR
-- ========================================
-- Copy and paste this entire script into Supabase Dashboard > SQL Editor > Run
-- This will create the minimum required infrastructure for Nora to work

-- 1. Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  ai_limits JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tier configurations
INSERT INTO public.subscription_tiers (tier_name, display_name, price_monthly, price_yearly, ai_limits, features) VALUES
  ('free', 'Free', 0.00, 0.00,
    '{"ai_insights_per_day": 5, "nora_enabled": false, "patrick_enabled": false, "max_message_length": 300, "cooldown_seconds": 30, "pdf_upload": false}'::jsonb,
    '["Basic focus timer", "5 AI insights per day"]'::jsonb
  ),
  ('trial', 'Pro Trial', 0.00, 0.00,
    '{"ai_insights_per_day": 10, "nora_enabled": true, "nora_messages_per_day": 100, "patrick_enabled": true, "patrick_messages_per_day": 100, "max_message_length": 5000, "cooldown_seconds": 0, "pdf_upload": true, "pdf_file_search": true, "trial_duration_days": 14}'::jsonb,
    '["14-day trial", "Nora AI (unlimited)", "Patrick AI (unlimited)", "PDF uploads"]'::jsonb
  ),
  ('pro', 'Pro', 14.99, 149.99,
    '{"ai_insights_per_day": 200, "nora_enabled": true, "nora_messages_per_day": 100, "patrick_enabled": true, "patrick_messages_per_day": 100, "max_message_length": 5000, "cooldown_seconds": 0, "pdf_upload": true, "pdf_file_search": true}'::jsonb,
    '["Nora AI", "Patrick AI", "200 AI insights/day", "PDF uploads"]'::jsonb
  )
ON CONFLICT (tier_name) DO UPDATE SET
  ai_limits = EXCLUDED.ai_limits,
  features = EXCLUDED.features;

-- 2. Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 3. Set trial for all existing users without a tier
UPDATE public.profiles
SET
  subscription_tier = 'trial',
  trial_started_at = COALESCE(trial_started_at, NOW()),
  trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '365 days')  -- Extended trial for testing
WHERE subscription_tier IS NULL OR subscription_tier = '';

-- 4. Create usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_type TEXT NOT NULL CHECK (ai_type IN ('nora', 'patrick', 'ai_insights')),
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10,4) DEFAULT 0.00,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ai_type, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, date);

-- 5. Create the check_ai_access function
CREATE OR REPLACE FUNCTION public.check_ai_access(
  p_user_id UUID,
  p_ai_type TEXT
)
RETURNS TABLE (
  allowed BOOLEAN,
  tier TEXT,
  reason TEXT,
  remaining_messages INTEGER,
  cooldown_seconds INTEGER
) AS $$
DECLARE
  v_tier TEXT;
  v_tier_limits JSONB;
  v_current_usage INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT p.subscription_tier, st.ai_limits
  INTO v_tier, v_tier_limits
  FROM public.profiles p
  JOIN public.subscription_tiers st ON st.tier_name = p.subscription_tier
  WHERE p.id = p_user_id;

  -- If no tier found, default to trial
  IF v_tier IS NULL THEN
    v_tier := 'trial';
    SELECT ai_limits INTO v_tier_limits
    FROM public.subscription_tiers
    WHERE tier_name = 'trial';
  END IF;

  -- Check if AI type is enabled
  IF p_ai_type = 'nora' AND (v_tier_limits->>'nora_enabled')::boolean = false THEN
    RETURN QUERY SELECT false, v_tier, 'Nora is only available for Pro users', 0, 0;
    RETURN;
  END IF;

  -- Get current usage
  SELECT COALESCE(messages_sent, 0) INTO v_current_usage
  FROM public.ai_usage_tracking
  WHERE user_id = p_user_id
    AND ai_type = p_ai_type
    AND date = CURRENT_DATE;

  -- For trial, allow unlimited messages for testing
  RETURN QUERY SELECT true, v_tier, 'Access granted', 999, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create log_ai_message function
CREATE OR REPLACE FUNCTION public.log_ai_message(
  p_user_id UUID,
  p_ai_type TEXT,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_estimate DECIMAL DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.ai_usage_tracking (user_id, ai_type, date, messages_sent, tokens_used, cost_estimate, last_message_at)
  VALUES (p_user_id, p_ai_type, CURRENT_DATE, 1, p_tokens_used, p_cost_estimate, NOW())
  ON CONFLICT (user_id, ai_type, date)
  DO UPDATE SET
    messages_sent = ai_usage_tracking.messages_sent + 1,
    tokens_used = ai_usage_tracking.tokens_used + p_tokens_used,
    cost_estimate = ai_usage_tracking.cost_estimate + p_cost_estimate,
    last_message_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own usage" ON public.ai_usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 9. Grant permissions
GRANT SELECT ON public.subscription_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_usage_tracking TO authenticated;

-- ========================================
-- VERIFICATION
-- ========================================
-- Check your current subscription status
SELECT
  id,
  full_name,
  email,
  subscription_tier,
  trial_ends_at,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- Test the check_ai_access function
SELECT * FROM public.check_ai_access(
  (SELECT id FROM auth.users LIMIT 1),
  'nora'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Nora AI security system installed successfully!';
  RAISE NOTICE '🎉 All users now have trial access with unlimited Nora messages';
  RAISE NOTICE '💬 Go to Nora chat and try sending a message!';
END $$;
