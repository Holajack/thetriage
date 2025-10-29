-- =====================================================
-- AI SECURITY & TIER MANAGEMENT SYSTEM
-- =====================================================
-- This migration creates a comprehensive security system for AI features
-- with rate limiting, usage tracking, and subscription tiers

-- 1. CREATE SUBSCRIPTION TIERS TABLE
-- =====================================================
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

-- Insert default tier configurations
INSERT INTO public.subscription_tiers (tier_name, display_name, price_monthly, price_yearly, ai_limits, features) VALUES
  ('free', 'Free', 0.00, 0.00,
    '{
      "ai_insights_per_day": 5,
      "nora_enabled": false,
      "patrick_enabled": false,
      "max_message_length": 300,
      "cooldown_seconds": 30,
      "pdf_upload": false
    }'::jsonb,
    '["Basic focus timer", "Task management", "5 AI insights per day", "Community access"]'::jsonb
  ),
  ('premium', 'Premium', 4.99, 47.88,
    '{
      "ai_insights_per_day": 50,
      "nora_enabled": false,
      "patrick_enabled": true,
      "patrick_messages_per_day": 30,
      "max_message_length": 1000,
      "cooldown_seconds": 5,
      "pdf_upload": false
    }'::jsonb,
    '["Everything in Free", "Patrick AI assistant (30 msg/day)", "50 AI insights per day", "Advanced analytics", "Priority support"]'::jsonb
  ),
  ('pro', 'Pro', 14.99, 149.99,
    '{
      "ai_insights_per_day": 200,
      "nora_enabled": true,
      "nora_messages_per_day": 100,
      "patrick_enabled": true,
      "patrick_messages_per_day": 100,
      "max_message_length": 5000,
      "cooldown_seconds": 0,
      "pdf_upload": true,
      "pdf_file_search": true
    }'::jsonb,
    '["Everything in Premium", "Nora AI with PDF analysis (100 msg/day)", "Patrick AI (100 msg/day)", "200 AI insights per day", "Unlimited PDF uploads", "E-books library", "Brain mapping", "App blocking"]'::jsonb
  ),
  ('trial', 'Pro Trial', 0.00, 0.00,
    '{
      "ai_insights_per_day": 10,
      "nora_enabled": true,
      "nora_messages_per_day": 5,
      "patrick_enabled": true,
      "patrick_messages_per_day": 5,
      "max_message_length": 1000,
      "cooldown_seconds": 10,
      "pdf_upload": true,
      "pdf_file_search": true,
      "trial_duration_days": 14
    }'::jsonb,
    '["14-day trial of Pro features", "Nora AI (5 msg/day)", "Patrick AI (5 msg/day)", "10 AI insights per day", "Limited PDF uploads"]'::jsonb
  )
ON CONFLICT (tier_name) DO NOTHING;

-- 2. ADD SUBSCRIPTION COLUMNS TO PROFILES
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Set trial start date for new users
CREATE OR REPLACE FUNCTION set_trial_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := NOW();
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trial_dates_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_dates();

-- 3. CREATE AI USAGE TRACKING TABLE
-- =====================================================
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ai_type, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON public.ai_usage_tracking(ai_type);

-- 4. CREATE MESSAGE COOLDOWN TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_message_cooldowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_type TEXT NOT NULL CHECK (ai_type IN ('nora', 'patrick', 'ai_insights')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ai_type)
);

CREATE INDEX IF NOT EXISTS idx_cooldown_user ON public.ai_message_cooldowns(user_id);

-- 5. CREATE FUNCTION TO CHECK USER TIER AND LIMITS
-- =====================================================
CREATE OR REPLACE FUNCTION check_ai_access(
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
  v_trial_ends_at TIMESTAMPTZ;
  v_tier_limits JSONB;
  v_daily_limit INTEGER;
  v_current_usage INTEGER;
  v_cooldown INTEGER;
  v_last_message TIMESTAMPTZ;
  v_seconds_since_last INTEGER;
BEGIN
  -- Get user's subscription tier and trial info
  SELECT
    p.subscription_tier,
    p.trial_ends_at,
    st.ai_limits
  INTO v_tier, v_trial_ends_at, v_tier_limits
  FROM public.profiles p
  JOIN public.subscription_tiers st ON st.tier_name = p.subscription_tier
  WHERE p.id = p_user_id;

  -- Check if trial expired, downgrade to free
  IF v_tier = 'trial' AND v_trial_ends_at < NOW() THEN
    UPDATE public.profiles
    SET subscription_tier = 'free'
    WHERE id = p_user_id;

    v_tier := 'free';

    -- Reload limits for free tier
    SELECT ai_limits INTO v_tier_limits
    FROM public.subscription_tiers
    WHERE tier_name = 'free';
  END IF;

  -- Check if AI type is enabled for this tier
  IF p_ai_type = 'nora' AND (v_tier_limits->>'nora_enabled')::boolean = false THEN
    RETURN QUERY SELECT false, v_tier, 'Nora is only available for Pro users. Upgrade to access Nora AI!', 0, 0;
    RETURN;
  END IF;

  IF p_ai_type = 'patrick' AND (v_tier_limits->>'patrick_enabled')::boolean = false THEN
    RETURN QUERY SELECT false, v_tier, 'Patrick is available for Premium and Pro users. Upgrade to access Patrick AI!', 0, 0;
    RETURN;
  END IF;

  -- Get daily limit for this AI type
  IF p_ai_type = 'nora' THEN
    v_daily_limit := (v_tier_limits->>'nora_messages_per_day')::integer;
  ELSIF p_ai_type = 'patrick' THEN
    v_daily_limit := (v_tier_limits->>'patrick_messages_per_day')::integer;
  ELSIF p_ai_type = 'ai_insights' THEN
    v_daily_limit := (v_tier_limits->>'ai_insights_per_day')::integer;
  END IF;

  -- Get current usage for today
  SELECT COALESCE(messages_sent, 0)
  INTO v_current_usage
  FROM public.ai_usage_tracking
  WHERE user_id = p_user_id
    AND ai_type = p_ai_type
    AND date = CURRENT_DATE;

  -- Check if daily limit exceeded
  IF v_current_usage >= v_daily_limit THEN
    RETURN QUERY SELECT
      false,
      v_tier,
      format('Daily limit reached (%s/%s messages). Upgrade for more messages!', v_current_usage, v_daily_limit),
      0,
      0;
    RETURN;
  END IF;

  -- Check cooldown period
  v_cooldown := (v_tier_limits->>'cooldown_seconds')::integer;

  IF v_cooldown > 0 THEN
    SELECT last_message_at INTO v_last_message
    FROM public.ai_message_cooldowns
    WHERE user_id = p_user_id AND ai_type = p_ai_type;

    IF v_last_message IS NOT NULL THEN
      v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_message))::integer;

      IF v_seconds_since_last < v_cooldown THEN
        RETURN QUERY SELECT
          false,
          v_tier,
          format('Please wait %s seconds before sending another message', v_cooldown - v_seconds_since_last),
          v_daily_limit - v_current_usage,
          v_cooldown - v_seconds_since_last;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    true,
    v_tier,
    'Access granted',
    v_daily_limit - v_current_usage,
    0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE FUNCTION TO LOG AI MESSAGE
-- =====================================================
CREATE OR REPLACE FUNCTION log_ai_message(
  p_user_id UUID,
  p_ai_type TEXT,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_estimate DECIMAL DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
  -- Update usage tracking
  INSERT INTO public.ai_usage_tracking (user_id, ai_type, date, messages_sent, tokens_used, cost_estimate, last_message_at)
  VALUES (p_user_id, p_ai_type, CURRENT_DATE, 1, p_tokens_used, p_cost_estimate, NOW())
  ON CONFLICT (user_id, ai_type, date)
  DO UPDATE SET
    messages_sent = ai_usage_tracking.messages_sent + 1,
    tokens_used = ai_usage_tracking.tokens_used + p_tokens_used,
    cost_estimate = ai_usage_tracking.cost_estimate + p_cost_estimate,
    last_message_at = NOW(),
    updated_at = NOW();

  -- Update cooldown tracking
  INSERT INTO public.ai_message_cooldowns (user_id, ai_type, last_message_at)
  VALUES (p_user_id, p_ai_type, NOW())
  ON CONFLICT (user_id, ai_type)
  DO UPDATE SET last_message_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE ADMIN VIEW FOR MONITORING
-- =====================================================
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
  p.id as user_id,
  p.email,
  p.subscription_tier,
  p.trial_ends_at,
  aut.ai_type,
  aut.date,
  aut.messages_sent,
  aut.tokens_used,
  aut.cost_estimate,
  st.ai_limits->>(aut.ai_type || '_messages_per_day') as daily_limit
FROM public.ai_usage_tracking aut
JOIN auth.users u ON u.id = aut.user_id
JOIN public.profiles p ON p.id = aut.user_id
JOIN public.subscription_tiers st ON st.tier_name = p.subscription_tier
ORDER BY aut.date DESC, aut.messages_sent DESC;

-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_tracking
CREATE POLICY "Users can view own AI usage" ON public.ai_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI usage" ON public.ai_usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_message_cooldowns
CREATE POLICY "Users can view own cooldowns" ON public.ai_message_cooldowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage cooldowns" ON public.ai_message_cooldowns
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for subscription_tiers
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers
  FOR SELECT USING (true);

CREATE POLICY "Only service role can modify tiers" ON public.subscription_tiers
  FOR ALL USING (auth.role() = 'service_role');

-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.subscription_tiers TO authenticated;
GRANT SELECT ON public.ai_usage_tracking TO authenticated;
GRANT SELECT ON public.ai_message_cooldowns TO authenticated;
GRANT ALL ON public.subscription_tiers TO service_role;
GRANT ALL ON public.ai_usage_tracking TO service_role;
GRANT ALL ON public.ai_message_cooldowns TO service_role;

-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends ON public.profiles(trial_ends_at) WHERE subscription_tier = 'trial';

COMMENT ON TABLE public.subscription_tiers IS 'Defines available subscription tiers and their AI usage limits';
COMMENT ON TABLE public.ai_usage_tracking IS 'Tracks daily AI usage per user to enforce rate limits';
COMMENT ON TABLE public.ai_message_cooldowns IS 'Prevents message spam with cooldown periods';
COMMENT ON FUNCTION check_ai_access IS 'Validates user access to AI features and returns remaining quota';
COMMENT ON FUNCTION log_ai_message IS 'Records AI message usage and updates cooldown timers';
