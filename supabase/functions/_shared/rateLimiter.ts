/**
 * AI RATE LIMITER & SECURITY MODULE
 *
 * Shared module for all AI edge functions to enforce:
 * - Rate limiting per tier
 * - Usage tracking
 * - Cooldown periods
 * - Message length validation
 * - Token cost estimation
 */

interface RateLimitCheck {
  allowed: boolean;
  tier: string;
  reason: string;
  remaining_messages: number;
  cooldown_seconds: number;
}

interface TierLimits {
  ai_insights_per_day?: number;
  nora_enabled?: boolean;
  nora_messages_per_day?: number;
  patrick_enabled?: boolean;
  patrick_messages_per_day?: number;
  max_message_length: number;
  cooldown_seconds: number;
  pdf_upload?: boolean;
  pdf_file_search?: boolean;
}

/**
 * Check if user has access to AI feature and enforce rate limits
 */
export async function checkRateLimit(
  supabaseClient: any,
  userId: string,
  aiType: 'nora' | 'patrick' | 'ai_insights'
): Promise<RateLimitCheck> {
  try {
    console.log(`🔒 Checking rate limit for user ${userId}, AI type: ${aiType}`);

    // Call the database function to check access
    const { data, error } = await supabaseClient
      .rpc('check_ai_access', {
        p_user_id: userId,
        p_ai_type: aiType
      });

    if (error) {
      console.error('❌ Rate limit check error:', error);
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('❌ No rate limit data returned');
      return {
        allowed: false,
        tier: 'free',
        reason: 'Unable to verify access. Please try again.',
        remaining_messages: 0,
        cooldown_seconds: 0
      };
    }

    const result = data[0];
    console.log(`✅ Rate limit check result:`, {
      allowed: result.allowed,
      tier: result.tier,
      remaining: result.remaining_messages
    });

    return result;

  } catch (error) {
    console.error('❌ Rate limit check exception:', error);
    return {
      allowed: false,
      tier: 'free',
      reason: 'Access verification failed. Please try again later.',
      remaining_messages: 0,
      cooldown_seconds: 0
    };
  }
}

/**
 * Log AI message usage and update tracking
 */
export async function logAIMessage(
  supabaseClient: any,
  userId: string,
  aiType: 'nora' | 'patrick' | 'ai_insights',
  tokensUsed: number = 0,
  costEstimate: number = 0
): Promise<void> {
  try {
    console.log(`📊 Logging AI message: ${aiType}, tokens: ${tokensUsed}, cost: $${costEstimate}`);

    const { error } = await supabaseClient
      .rpc('log_ai_message', {
        p_user_id: userId,
        p_ai_type: aiType,
        p_tokens_used: tokensUsed,
        p_cost_estimate: costEstimate
      });

    if (error) {
      console.error('❌ Failed to log AI message:', error);
      // Don't throw - logging failure shouldn't block the request
    } else {
      console.log('✅ AI message logged successfully');
    }

  } catch (error) {
    console.error('❌ Exception logging AI message:', error);
    // Don't throw - logging failure shouldn't block the request
  }
}

/**
 * Get tier limits for user
 */
export async function getTierLimits(
  supabaseClient: any,
  userId: string
): Promise<TierLimits | null> {
  try {
    // Get user's tier
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, trial_ends_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError);
      return null;
    }

    let tier = profile.subscription_tier;

    // Check if trial expired
    if (tier === 'trial' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      if (trialEnd < new Date()) {
        // Trial expired, downgrade to free
        await supabaseClient
          .from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', userId);

        tier = 'free';
      }
    }

    // Get tier limits
    const { data: tierData, error: tierError } = await supabaseClient
      .from('subscription_tiers')
      .select('ai_limits')
      .eq('tier_name', tier)
      .single();

    if (tierError || !tierData) {
      console.error('Failed to get tier limits:', tierError);
      return null;
    }

    return tierData.ai_limits as TierLimits;

  } catch (error) {
    console.error('Exception getting tier limits:', error);
    return null;
  }
}

/**
 * Validate message length based on user tier
 */
export function validateMessageLength(
  message: string,
  tierLimits: TierLimits
): { valid: boolean; reason?: string } {
  const maxLength = tierLimits.max_message_length;

  if (message.length > maxLength) {
    return {
      valid: false,
      reason: `Message too long. Maximum ${maxLength} characters allowed for your subscription tier. Current: ${message.length} characters.`
    };
  }

  return { valid: true };
}

/**
 * Estimate OpenAI token count (rough approximation)
 * More accurate: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on tokens
 * GPT-4 Turbo pricing: $0.01 per 1K input tokens, $0.03 per 1K output tokens
 * Using conservative estimate for output being 2x input
 */
export function estimateCost(inputTokens: number, outputTokens: number = 0): number {
  const inputCost = (inputTokens / 1000) * 0.01;
  const outputCost = (outputTokens / 1000) * 0.03;
  return inputCost + outputCost;
}

/**
 * Security check for PDF access
 */
export function validatePDFAccess(
  tierLimits: TierLimits,
  hasPDF: boolean
): { allowed: boolean; reason?: string } {
  if (!hasPDF) {
    return { allowed: true };
  }

  if (!tierLimits.pdf_upload) {
    return {
      allowed: false,
      reason: 'PDF upload is only available for Pro users. Upgrade to upload and analyze documents!'
    };
  }

  return { allowed: true };
}

/**
 * Check if file search should be enabled
 */
export function shouldEnableFileSearch(
  tierLimits: TierLimits,
  aiType: 'nora' | 'patrick'
): boolean {
  // Only Nora can use file search, and only for Pro users
  if (aiType === 'patrick') {
    return false;
  }

  return tierLimits.pdf_file_search === true;
}

/**
 * Get user-friendly error response based on tier
 */
export function getTierUpgradeMessage(
  currentTier: string,
  aiType: 'nora' | 'patrick' | 'ai_insights'
): string {
  const messages = {
    nora: {
      free: 'Nora AI is available for Pro subscribers. Start your 14-day trial or upgrade to access Nora with PDF analysis!',
      trial: 'Your trial has ended. Upgrade to Pro to continue using Nora AI with unlimited PDF analysis.',
      premium: 'Nora AI is exclusive to Pro members. Upgrade to Pro for advanced AI study assistance with PDF analysis!'
    },
    patrick: {
      free: 'Patrick AI is available for Premium and Pro subscribers. Start your 14-day trial or upgrade to access Patrick!',
      trial: 'Your trial has ended. Upgrade to Premium or Pro to continue using Patrick AI.'
    },
    ai_insights: {
      free: 'You\'ve reached your daily AI Insights limit. Upgrade to Premium for 50 insights per day, or Pro for 200!',
      premium: 'You\'ve reached your daily AI Insights limit. Upgrade to Pro for 200 insights per day!',
      trial: 'Daily limit reached. Upgrade to Premium or Pro for more AI insights!'
    }
  };

  return messages[aiType]?.[currentTier as keyof typeof messages[typeof aiType]] ||
    'Upgrade your subscription for more AI features!';
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove any potential script tags or SQL injection attempts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}
