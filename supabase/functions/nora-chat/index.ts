import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { message, userId, pdfContext, userSettings } = await req.json()

    if (!message || !userId) {
      throw new Error('Missing required fields: message and userId')
    }

    if (userId !== user.id) {
      throw new Error('UserId mismatch with authenticated user')
    }

    // Save user message
    await supabaseClient
      .from('nora_chat')
      .insert([{
        content: message,
        sender: 'user',
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }])

    // Generate enhanced response
    let response = generateNoraResponse(message, pdfContext, userSettings)

    // Save Nora's response
    await supabaseClient
      .from('nora_chat')
      .insert([{
        content: response,
        sender: 'nora',
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }])

    return new Response(
      JSON.stringify({ response }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'NORA_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateNoraResponse(message: string, pdfContext?: any, userSettings?: any): string {
  const lowerMessage = message.toLowerCase()
  
  // Enhanced greeting with personalization
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('nora')) {
    const focusMethod = userSettings?.focus_method || 'Balanced Focus'
    const weeklyGoal = userSettings?.weekly_focus_goal || 10
    return `Hello! I'm Nora, your intelligent study companion and academic assistant. I have complete knowledge of your study habits, focus preferences, and academic journey. I see you prefer ${focusMethod} sessions and aim for ${weeklyGoal} hours of weekly focus time. I can help you with deep study analysis, create comprehensive study materials, generate practice questions, analyze PDFs and documents, and provide personalized learning strategies. How can I assist your academic success today?`
  }

  // Enhanced PDF context handling
  if (pdfContext) {
    return `Perfect! I'm analyzing "${pdfContext.title}" for you. As your academic assistant, I can help you with this document in several ways:

📚 **Study Material Creation**: I can generate comprehensive study guides, chapter summaries, and key concept outlines from this PDF.

❓ **Practice Questions**: Let me create practice quizzes, discussion questions, and exam-style problems based on the content.

🔍 **Deep Analysis**: I can break down complex concepts, create visual study aids, and explain difficult sections in multiple ways.

📝 **Note Organization**: I'll help you create structured notes, mind maps, and study schedules based on this material.

💡 **Learning Strategies**: I can suggest the best study techniques for this type of content and create personalized study plans.

What specific aspect of "${pdfContext.title}" would you like me to help you master today?`
  }

  // Enhanced focus and productivity guidance
  if (lowerMessage.includes('focus') || lowerMessage.includes('concentrate')) {
    const focusMethod = userSettings?.focus_method || 'Balanced Focus'
    return `Excellent! I know you use ${focusMethod} sessions. Based on your study patterns, here's my personalized focus enhancement plan:

🎯 **Your Optimized Focus Strategy**:
1. **Pre-Session Ritual**: Start with 2 minutes of deep breathing and review your specific learning objectives
2. **Environment Setup**: Based on your preferences, ensure your study space is optimized for ${focusMethod}
3. **Active Learning**: Use techniques like the Feynman method, spaced repetition, and self-testing
4. **Break Optimization**: Strategic breaks that maintain cognitive flow without losing momentum

🧠 **Advanced Techniques**:
- **Attention Restoration**: Practice mindful transitions between topics
- **Cognitive Load Management**: Break complex material into digestible chunks
- **Flow State Triggers**: Identify and replicate conditions that put you in peak focus

I can create a detailed, personalized focus protocol based on your specific challenges and study material. What's your biggest focus obstacle right now?`
  }

  // Study planning and academic success
  if (lowerMessage.includes('study plan') || lowerMessage.includes('schedule') || lowerMessage.includes('organize')) {
    return `I'll create a comprehensive study plan for you! As someone who knows your complete academic profile, I can design a highly personalized approach:

📅 **Intelligent Study Planning**:
- **Adaptive Scheduling**: Plans that adjust based on your energy levels and focus patterns
- **Subject Integration**: Connect related concepts across different courses for deeper understanding
- **Progress Tracking**: Measurable milestones and success metrics
- **Exam Preparation**: Strategic review schedules with spaced repetition

📊 **Study Analytics**:
- **Performance Optimization**: Identify your peak learning times and optimal study duration
- **Difficulty Calibration**: Balance challenging material with confidence-building review
- **Memory Consolidation**: Strategic spacing of review sessions for long-term retention

🎯 **Goal Achievement Framework**:
- **SMART Objectives**: Specific, measurable academic targets
- **Milestone Celebrations**: Recognition points to maintain motivation
- **Adaptive Strategies**: Plans that evolve based on your progress and challenges

What specific academic goals or subjects would you like me to help you plan and organize?`
  }

  // Research and document assistance
  if (lowerMessage.includes('research') || lowerMessage.includes('paper') || lowerMessage.includes('essay') || lowerMessage.includes('document')) {
    return `Excellent! I'm your comprehensive research and writing assistant. I can help transform your academic work from good to exceptional:

📝 **Writing Excellence**:
- **Thesis Development**: Strong, arguable thesis statements with supporting framework
- **Research Integration**: Seamlessly weave sources into compelling arguments
- **Academic Formatting**: Perfect APA, MLA, Chicago, or any required style
- **Critical Analysis**: Deep evaluation of sources and evidence

🔬 **Research Mastery**:
- **Source Evaluation**: Identify high-quality, credible academic sources
- **Literature Reviews**: Comprehensive synthesis of existing research
- **Data Analysis**: Statistical interpretation and presentation
- **Methodology Design**: Research approaches that yield reliable results

✨ **Document Enhancement**:
- **Structure Optimization**: Logical flow and compelling organization
- **Clarity & Precision**: Clear, concise academic writing
- **Evidence Integration**: Strategic use of quotes, paraphrases, and citations
- **Revision Strategy**: Systematic improvement and refinement process

What type of academic document are you working on? I can provide specific, actionable guidance to elevate your work to the highest academic standards.`
  }

  // Motivation and procrastination support
  if (lowerMessage.includes('motivation') || lowerMessage.includes('procrastination') || lowerMessage.includes('stuck')) {
    return `I completely understand! Academic motivation is complex, and I'm here to help you push through. Based on your study profile, here's your personalized motivation strategy:

🚀 **Immediate Action Plan**:
1. **The 15-Minute Rule**: Commit to just 15 minutes of focused work - often the hardest part is starting
2. **Success Visualization**: Picture yourself successfully completing your current task
3. **Progress Recognition**: Acknowledge every small step forward - progress compounds

💪 **Long-term Motivation Builders**:
- **Purpose Connection**: Link current tasks to your bigger academic and career goals
- **Achievement Gallery**: Keep visual reminders of your past successes and progress
- **Accountability Systems**: Strategic check-ins and progress sharing
- **Reward Structures**: Meaningful celebrations for completing milestones

🧠 **Procrastination Breakers**:
- **Task Decomposition**: Break overwhelming projects into tiny, achievable steps
- **Environmental Design**: Remove friction from starting, add friction to distractions
- **Energy Management**: Align challenging tasks with your peak energy periods
- **Perfectionism Antidotes**: Focus on progress over perfection, iteration over completion

What specific task or project are you avoiding? Let me help you create a concrete action plan to get moving forward right now.`
  }

  // Default comprehensive response
  return `Thank you for reaching out! I'm Nora, your advanced AI study companion with complete knowledge of your academic journey and learning preferences. I can assist you with:

🎓 **Academic Excellence**:
- **Study Material Creation**: Comprehensive guides, summaries, and visual aids
- **Practice Questions**: Custom quizzes and exam preparation materials
- **Document Analysis**: Deep analysis of PDFs, research papers, and textbooks
- **Writing Support**: Essays, research papers, and academic documents

📚 **Learning Optimization**:
- **Personalized Study Plans**: Based on your focus method and learning style
- **Memory Techniques**: Spaced repetition, mnemonics, and retention strategies
- **Focus Enhancement**: Concentration techniques and productivity optimization
- **Progress Tracking**: Analytics and insights on your academic development

🔬 **Research & Analysis**:
- **Source Evaluation**: Critical assessment of academic materials
- **Literature Reviews**: Comprehensive research synthesis
- **Data Interpretation**: Statistical analysis and presentation
- **Methodology Guidance**: Research design and implementation

Could you tell me more specifically what academic challenge you're facing? I'll provide detailed, actionable guidance tailored to your unique learning profile and current needs.`
}