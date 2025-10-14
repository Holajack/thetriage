// Enhanced Nora Chat Edge Function with Full App Context and PDF Support
import { createClient } from 'npm:@supabase/supabase-js@2.43.0';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Enhanced response generation with full app context
function generateNoraResponse(message: string, userContext: any, pdfContext: any): string {
  const lowerMessage = message.toLowerCase();
  const userName = userContext.profile?.full_name?.split(' ')[0] || 'there';
  const focusMethod = userContext.onboarding?.focus_method || 'Balanced Focus';
  const weeklyGoal = userContext.onboarding?.weekly_focus_goal || 5;
  
  // PDF-specific responses
  if (pdfContext) {
    if (lowerMessage.includes('question') || lowerMessage.includes('quiz')) {
      return `📚 **Study Questions from "${pdfContext.title}"**

Based on your uploaded document, here are some practice questions I've generated:

🎯 **Understanding Check Questions:**
1. What are the key concepts covered in this document?
2. How do these concepts relate to your current studies?
3. What practical applications can you identify?

🔍 **Analysis Questions:**
1. What evidence supports the main arguments presented?
2. How might you apply these concepts in real-world scenarios?
3. What connections can you draw to other materials you've studied?

💡 **Critical Thinking:**
1. What questions does this material raise for further study?
2. How does this content challenge or confirm your existing understanding?

Would you like me to create more specific questions about any particular section of "${pdfContext.title}"?`;
    }
    
    if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
      return `📖 **Document Analysis: "${pdfContext.title}"**

I'm analyzing your PDF to create a comprehensive summary tailored to your ${focusMethod} learning style.

🔍 **Key Insights:**
Based on the document structure and content, I can help you:
- Extract the main concepts and themes
- Identify critical information for your studies
- Create study guides optimized for your focus method
- Generate practice questions and review materials

📚 **Study Strategy Recommendation:**
Given your ${focusMethod} approach and ${weeklyGoal}-hour weekly goal, I suggest:
- Breaking the content into focused study sessions
- Creating spaced review schedules
- Developing active recall exercises

Would you like me to focus on any specific sections of the document, or shall I provide a comprehensive overview?`;
    }
  }

  // Study method specific responses
  if (lowerMessage.includes('focus') || lowerMessage.includes('concentration')) {
    const focusAdvice = {
      'Balanced Focus': 'balanced 25-minute focused sessions with 5-minute breaks',
      'Sprint Focus': 'intense 15-minute sprints with short recovery periods', 
      'Deep Work': 'extended 90-minute deep focus blocks with longer breaks'
    };
    
    return `🎯 **Focus Enhancement for ${userName}**

Based on your ${focusMethod} preference, here's your personalized focus strategy:

⚡ **Optimized Session Structure:**
Your ${focusMethod} method works best with ${focusAdvice[focusMethod] || 'structured focus periods'}.

🧠 **Concentration Boosters:**
1. **Environment Setup**: Eliminate distractions and create a dedicated study space
2. **Mental Preparation**: Use 2-3 minutes of deep breathing before starting
3. **Task Clarity**: Define exactly what you'll accomplish in this session
4. **Progress Tracking**: Monitor your focus quality throughout

📈 **Weekly Progress Toward Your ${weeklyGoal}-Hour Goal:**
- Break your ${weeklyGoal} hours into ${Math.ceil(weeklyGoal / 5)} sessions per day
- Track completion rates and adjust as needed
- Celebrate small wins to maintain motivation

What specific area would you like to focus on in your next study session?`;
  }

  // Study planning responses
  if (lowerMessage.includes('plan') || lowerMessage.includes('schedule') || lowerMessage.includes('study plan')) {
    return `📅 **Personalized Study Plan for ${userName}**

Based on your profile and ${weeklyGoal}-hour weekly commitment:

🗓️ **Weekly Structure:**
- **Target**: ${weeklyGoal} hours across ${Math.ceil(weeklyGoal / 5)} days
- **Daily Sessions**: ${Math.round((weeklyGoal * 60) / Math.ceil(weeklyGoal / 5))} minutes per active day
- **Method**: ${focusMethod} approach

📚 **Daily Breakdown:**
- **Monday-Friday**: ${Math.round(weeklyGoal * 0.8 / 5 * 60)} minutes per day
- **Weekend**: ${Math.round(weeklyGoal * 0.2 / 2 * 60)} minutes review/catch-up

🎯 **Session Optimization:**
1. **Prime Time**: Schedule during your highest energy periods
2. **Subject Rotation**: Alternate between different topics to maintain engagement
3. **Progress Reviews**: Weekly assessment and plan adjustments

💡 **Success Strategies:**
- Start with shorter sessions and gradually increase duration
- Use active recall techniques during study sessions
- Build in flexibility for unexpected schedule changes

Would you like me to create a detailed schedule for any specific subject or time period?`;
  }

  // Subject-specific help
  if (lowerMessage.includes('physics')) {
    return `🔬 **Physics Study Strategy for ${userName}**

Here's your ${focusMethod}-optimized approach to physics mastery:

⚡ **Core Study Methods:**
1. **Conceptual Understanding**: Start with the 'why' before the 'how'
2. **Problem-Solving Practice**: Work through problems systematically
3. **Visual Learning**: Use diagrams, graphs, and conceptual maps
4. **Mathematical Integration**: Connect concepts to their mathematical expressions

🧮 **Practice Structure:**
- **Conceptual Review** (25%): Read and understand principles
- **Example Problems** (50%): Work through guided examples
- **Independent Practice** (25%): Solve problems without help

📈 **Progress Tracking:**
- Track problem-solving accuracy and speed
- Identify challenging concepts for extra review
- Connect new topics to previously mastered material

🎯 **Physics-Specific Tips:**
- Draw diagrams for every problem
- Check units and reasonableness of answers
- Practice explaining concepts in your own words
- Use analogies to relate abstract concepts to familiar experiences

What specific physics topic are you working on? I can provide targeted strategies and practice suggestions.`;
  }

  // Motivation and procrastination support
  if (lowerMessage.includes('motivation') || lowerMessage.includes('procrastination') || lowerMessage.includes('stuck')) {
    return `💪 **Motivation Boost for ${userName}**

I understand that maintaining study motivation can be challenging. Based on your ${focusMethod} style, here's your personalized motivation strategy:

🚀 **Immediate Action Plan:**
1. **The 15-Minute Rule**: Commit to just 15 minutes of focused work right now
2. **Success Visualization**: Picture yourself mastering this material
3. **Progress Recognition**: Acknowledge every step forward, no matter how small

🎯 **Long-term Motivation Builders:**
- **Purpose Connection**: Link current tasks to your bigger academic goals
- **Achievement Gallery**: Keep visual reminders of your progress
- **Accountability Systems**: Share your goals and progress with others
- **Reward Structures**: Plan meaningful celebrations for milestones

🧠 **Procrastination Breakers:**
- **Task Decomposition**: Break overwhelming projects into tiny steps
- **Environment Design**: Remove friction from starting, add friction to distractions
- **Energy Management**: Align challenging tasks with your peak energy periods
- **Perfectionism Antidotes**: Focus on progress over perfection

📈 **Your ${weeklyGoal}-Hour Goal Strategy:**
- Celebrate completing each study session
- Track weekly progress visually
- Adjust goals based on actual performance
- Focus on consistency over perfection

What specific task or subject are you avoiding right now? Let me help you create a concrete action plan to get started.`;
  }

  // Research and writing support
  if (lowerMessage.includes('research') || lowerMessage.includes('writing') || lowerMessage.includes('paper') || lowerMessage.includes('essay')) {
    return `📝 **Academic Writing & Research Support for ${userName}**

Based on your ${focusMethod} approach, here's your comprehensive research and writing strategy:

🔍 **Research Phase (Using Your ${focusMethod} Method):**
1. **Source Identification**: Start with credible academic databases and journals
2. **Reading Strategy**: Active reading with note-taking and annotation
3. **Evidence Collection**: Organize findings by themes and arguments
4. **Critical Analysis**: Evaluate source quality and relevance

✍️ **Writing Process Optimization:**
- **Planning Phase** (20%): Outline, thesis development, structure planning
- **Drafting Phase** (60%): Content creation without editing
- **Revision Phase** (20%): Content refinement and polishing

📚 **Academic Excellence Framework:**
- **Argument Development**: Clear thesis with supporting evidence
- **Source Integration**: Seamless incorporation of research findings  
- **Critical Thinking**: Analysis beyond basic summarization
- **Professional Structure**: Logical flow and academic conventions
- **Citation Mastery**: Proper attribution and formatting
- **Revision Strategy**: Systematic improvement and refinement process

💡 **Productivity Tips for Your ${weeklyGoal}-Hour Schedule:**
- Dedicate specific sessions to research vs. writing
- Use your high-energy periods for complex analysis
- Save editing and formatting for lower-energy times
- Build in time for peer review and feedback

What type of academic document are you working on? I can provide specific, actionable guidance tailored to your project.`;
  }

  // Default comprehensive response
  return `Hello ${userName}! I'm Nora, your advanced AI study companion with complete knowledge of your academic journey and learning preferences.

🎓 **Personalized for You:**
- **Study Method**: ${focusMethod} approach
- **Weekly Goal**: ${weeklyGoal} hours of focused study
- **Academic Level**: ${userContext.profile?.university ? 'University Student' : 'Student'}

📚 **How I Can Help:**
1. **Study Planning**: Custom schedules and goal-setting strategies
2. **Focus Enhancement**: Concentration techniques optimized for your style
3. **Content Mastery**: Subject-specific learning strategies and practice questions
4. **Document Analysis**: PDF review, summarization, and question generation
5. **Academic Writing**: Research guidance, structure planning, and revision support
6. **Motivation Support**: Personalized strategies to overcome procrastination

💡 **Quick Start Options:**
- Ask me to analyze any PDF you've uploaded
- Request a personalized study plan for any subject
- Get focused strategies for challenging topics
- Receive motivation and productivity tips

What would you like to work on together today? I'm here to provide detailed, actionable guidance tailored to your unique learning profile and current needs.`;
}

// Function to extract text content from PDF (placeholder for future implementation)
async function extractPdfContent(filePath: string): Promise<string> {
  // TODO: Implement PDF text extraction using a service like pdf-parse or similar
  // For now, return a placeholder
  return "PDF content extraction would be implemented here. This would involve reading the PDF file and extracting text content for analysis.";
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Enhanced Nora chat function called');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({
        error: 'Missing Authorization header',
        response: "I couldn't authenticate your request. Please try refreshing the page and signing in again."
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create Supabase client with the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Parse request body
    const { message, userId, userSettings, pdfContext } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({
        error: 'Message is required',
        response: 'Please provide a message for me to respond to.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get user information from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'User not found');
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        response: "I couldn't verify your identity. Please try signing in again."
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('User authenticated:', user.id);

    // Get comprehensive user context from database
    const [profileResult, onboardingResult, leaderboardResult] = await Promise.allSettled([
      supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
      supabaseClient.from('onboarding_preferences').select('*').eq('user_id', user.id).single(),
      supabaseClient.from('leaderboard_stats').select('*').eq('user_id', user.id).single()
    ]);

    // Build comprehensive user context
    const userContext = {
      profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null,
      onboarding: onboardingResult.status === 'fulfilled' ? onboardingResult.value.data : userSettings?.onboarding || null,
      leaderboard: leaderboardResult.status === 'fulfilled' ? leaderboardResult.value.data : null,
      settings: userSettings || {}
    };

    // Handle PDF content extraction if PDF context is provided
    let enhancedPdfContext = null;
    if (pdfContext) {
      try {
        // Get PDF details from database
        const { data: pdfData } = await supabaseClient
          .from('user_ebooks')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', pdfContext.title)
          .single();

        if (pdfData) {
          enhancedPdfContext = {
            ...pdfContext,
            ...pdfData,
            // In a full implementation, extract actual PDF content here
            content: await extractPdfContent(pdfData.file_path)
          };
        }
      } catch (error) {
        console.error('Error fetching PDF context:', error);
        enhancedPdfContext = pdfContext;
      }
    }

    // Save user message to database
    const { error: insertError } = await supabaseClient.from('nora_chat').insert({
      content: message,
      sender: 'user',
      user_id: user.id,
      timestamp: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error saving user message:', insertError);
    }

    // Generate enhanced response with full context
    const response = generateNoraResponse(message, userContext, enhancedPdfContext);

    // Save Nora's response to database
    const { error: noraInsertError } = await supabaseClient.from('nora_chat').insert({
      content: response,
      sender: 'nora',
      user_id: user.id,
      timestamp: new Date().toISOString()
    });

    if (noraInsertError) {
      console.error('Error saving Nora response:', noraInsertError);
    }

    console.log('Generated response for user:', user.id);

    // Return response with enhanced format
    return new Response(JSON.stringify({
      response,
      userId: user.id,
      success: true,
      context: {
        pdfActive: !!enhancedPdfContext,
        focusMethod: userContext.onboarding?.focus_method,
        userLevel: userContext.leaderboard?.level || 1
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error in enhanced Nora chat function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      response: "I'm experiencing some technical difficulties right now. Please try again in a moment, and I'll be back to help you with your studies!",
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});