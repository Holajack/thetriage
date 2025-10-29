import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  checkRateLimit,
  logAIMessage,
  getTierLimits,
  validateMessageLength,
  estimateTokenCount,
  estimateCost,
  getTierUpgradeMessage,
  sanitizeInput
} from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    const { message, userId, pdfContext } = await req.json()

    if (!message || !userId) {
      throw new Error('Missing required fields: message and userId')
    }

    if (userId !== user.id) {
      throw new Error('UserId mismatch with authenticated user')
    }

    // ============================================================
    // 🔒 SECURITY CHECK: Rate Limiting & Tier Validation
    // ============================================================
    console.log('🔒 Starting security checks for Patrick AI access...');

    // 1. Check rate limits and tier access
    const rateLimitResult = await checkRateLimit(supabaseClient, user.id, 'patrick');

    if (!rateLimitResult.allowed) {
      console.log('❌ Access denied:', rateLimitResult.reason);

      const upgradeMessage = getTierUpgradeMessage(rateLimitResult.tier, 'patrick');

      return new Response(JSON.stringify({
        error: 'ACCESS_DENIED',
        response: `${rateLimitResult.reason}\n\n${upgradeMessage}`,
        tier: rateLimitResult.tier,
        remaining_messages: rateLimitResult.remaining_messages,
        upgrade_required: true
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Rate limit check passed');
    console.log(`📊 User tier: ${rateLimitResult.tier}, Remaining messages: ${rateLimitResult.remaining_messages}`);

    // 2. Get tier limits
    const tierLimits = await getTierLimits(supabaseClient, user.id);

    if (!tierLimits) {
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        response: 'Unable to verify your subscription. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Sanitize input
    const sanitizedMessage = sanitizeInput(message);

    // 4. Validate message length
    const lengthValidation = validateMessageLength(sanitizedMessage, tierLimits);
    if (!lengthValidation.valid) {
      return new Response(JSON.stringify({
        error: 'MESSAGE_TOO_LONG',
        response: lengthValidation.reason,
        max_length: tierLimits.max_message_length,
        upgrade_required: rateLimitResult.tier === 'free'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Block PDF for Patrick (Premium users don't get PDF features)
    if (pdfContext) {
      console.log('❌ PDF feature blocked for Patrick');
      return new Response(JSON.stringify({
        error: 'PDF_NOT_SUPPORTED',
        response: 'Patrick doesn\'t support PDF analysis. For advanced PDF reading and analysis, upgrade to Pro and use Nora AI!',
        upgrade_required: true
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ All security checks passed');
    // ============================================================

    // Save user message
    await supabaseClient
      .from('patrick_chat')
      .insert([{
        content: sanitizedMessage,
        sender: 'user',
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }])

    // Generate response (NO PDF context for Patrick)
    let response = generatePatrickResponse(sanitizedMessage, null)

    // Save Patrick's response
    await supabaseClient
      .from('patrick_chat')
      .insert([{
        content: response,
        sender: 'patrick',
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }])

    // ============================================================
    // 📊 LOG USAGE: Track tokens and cost
    // ============================================================
    const inputTokens = estimateTokenCount(sanitizedMessage);
    const outputTokens = estimateTokenCount(response);
    const totalTokens = inputTokens + outputTokens;
    const costEstimate = estimateCost(inputTokens, outputTokens);

    console.log(`📊 Token usage: ${totalTokens} tokens`);
    console.log(`💰 Estimated cost: $${costEstimate.toFixed(4)}`);

    // Log usage
    await logAIMessage(supabaseClient, user.id, 'patrick', totalTokens, costEstimate);

    console.log('✅ Usage logged successfully');
    // ============================================================

    return new Response(
      JSON.stringify({
        response,
        tier: rateLimitResult.tier,
        remaining_messages: rateLimitResult.remaining_messages - 1,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'PATRICK_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generatePatrickResponse(message: string, pdfContext?: any): string {
  const lowerMessage = message.toLowerCase()
  
  if (pdfContext) {
    return `I see you're working with "${pdfContext.title}". How can I help you study this material? I can assist with creating study plans, generating practice questions, or explaining difficult concepts!`
  }

  if (lowerMessage.includes('focus') || lowerMessage.includes('concentrate')) {
    return "Excellent question about focus! Here are my top recommendations: 1) Use the Pomodoro Technique (25-minute focused sessions), 2) Eliminate distractions (phone, social media), 3) Create a dedicated study space, 4) Take regular breaks to recharge. What specific focus challenges are you facing?"
  }

  if (lowerMessage.includes('motivation') || lowerMessage.includes('procrastination')) {
    return "I totally understand the motivation struggle! Try the 2-minute rule: if something takes less than 2 minutes, do it immediately. For bigger tasks, break them into tiny, manageable pieces. Remember, progress beats perfection! What's one small step you could take right now toward your goal?"
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello there! I'm Patrick, your AI study companion. I'm here to help you with studying, productivity, focus, and achieving your academic goals. What can I help you with today?"
  }

  return `I received your message: "${message}". I'm here to help with studying, focus, productivity, time management, and academic success. Could you tell me more specifically what you'd like help with?`
}
