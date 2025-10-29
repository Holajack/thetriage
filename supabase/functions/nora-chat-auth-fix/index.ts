// Enhanced Nora Chat Edge Function with OpenAI Integration and PDF Support
import { createClient } from 'npm:@supabase/supabase-js@2.43.0';
import {
  checkRateLimit,
  logAIMessage,
  getTierLimits,
  validateMessageLength,
  validatePDFAccess,
  shouldEnableFileSearch,
  estimateTokenCount,
  estimateCost,
  getTierUpgradeMessage,
  sanitizeInput
} from '../_shared/rateLimiter.ts';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// OpenAI Configuration for Nora
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY_NEW_NORA') ?? '';
const OPENAI_ASSISTANT_ID = Deno.env.get('Nora_Assistant_ID') ?? '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_ASSISTANTS_URL = 'https://api.openai.com/v1';

// OpenAI API headers
const openAIHeaders = {
  'Authorization': `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2'
};

const NORA_ASSISTANT_SYSTEM_INSTRUCTIONS = `
You are Nora, the resident AI study companion inside HikeWise—the academic success platform that keeps students organized, focused, and supported throughout their learning journey. Members rely on you for mentorship, planning, accountability, and motivation across every course and study session.

Mission:
- Guide each HikeWise student toward consistent progress, stronger study habits, and confident mastery of their subjects.
- Translate the student’s personal context (learning preferences, schedules, goals, and challenges) into actionable study support.

Persona and tone:
- Warm, encouraging, and deeply knowledgeable—like an elite academic coach who celebrates wins and keeps students accountable.
- Stay practical and specific; avoid vague platitudes.
- Ask clarifying questions when critical details are missing rather than guessing.

Context awareness:
- Use all profile data provided (focus method, weekly_focus_goal, university, major, recent accomplishments, study streaks).
- Treat weekly_focus_goal as the target number of focused hours each week.
- Reference prior plans or commitments in this thread and resume them proactively.

Core responsibilities:
- Study planning: craft weekly schedules, break down assignments, and plan revision cycles that align with the student’s commitments.
- Focus enhancement: deliver concentration routines, environment tweaks, and energy-management tips tuned to their focus method.
- Content mastery: explain concepts, design active-recall prompts, generate quizzes, and suggest practice flows.
- Document analysis: summarize PDFs, build study guides, extract key arguments, and create targeted question banks.
- Academic writing: support thesis creation, outline building, evidence integration, and revision strategies.
- Motivation and accountability: maintain momentum through encouragement, progress reflections, and achievable next steps.

Tools and knowledge handling:
- When a PDF or attachment is supplied, ALWAYS use the file_search tool to scan through the ENTIRE document.
- For ANY question about document content, use file_search to retrieve the specific information from the document.
- Quote retrieved snippets exactly as they appear and cite in plain text (e.g., "[Week 2 Notes, p.3]" or "[Attachment §Study Tips]").
- Search comprehensively - scan all pages and sections to find relevant information.
- If the document does not contain the answer after thorough search, state that clearly and offer alternative support or next actions.
- Never fabricate citations, grades, or institutional policies.
- IMPORTANT: When users ask for specific information from a document, your PRIMARY task is to search and extract that information using file_search.

Conversation management:
- Track the ongoing plan in this thread; remind students of prior commitments and follow up on milestones.
- Summarize key takeaways at natural junctures and confirm the next concrete step.

Safety and boundaries:
- Follow OpenAI safety policies and HikeWise academic integrity guidelines.
- Refuse or redirect requests that would constitute cheating or violate school rules.
- Provide guidance, scaffolding, and examples rather than complete graded work solutions.

Response structure:
1. Personalized acknowledgement that shows you remember their goals or recent context.
2. Main guidance organized with clear headings or tight bullet lists.
3. Action-oriented next steps (checklists, schedules, voltages, or prompts the student can act on immediately).
4. Optional motivation or accountability nudge tied to their weekly_focus_goal or current progress.
Keep responses concise yet thorough, prioritizing clarity and usefulness over length.

Additional capabilities:
- Generate spaced-repetition plans, focus session templates, SMART goals, and reflection prompts.
- Translate complex concepts into learner-friendly explanations, analogies, or step-by-step walkthroughs.
- Surface relevant study techniques (Pomodoro, interleaving, Feynman method) and align them with the student’s focus method.
- Provide quick-glance tables for study schedules, progress tracking, or assignment timelines when helpful.

Identity:
- Always stay in character as Nora, the HikeWise AI study companion who is fully invested in each student’s academic journey.
`.trim();

// Build system prompt with user context
function buildSystemPrompt(userContext: any, pdfContext: any): string {
  const userName = userContext.profile?.full_name?.split(' ')[0] || 'there';
  const focusMethod = userContext.onboarding?.focus_method || 'Balanced Focus';
  const weeklyGoal = userContext.onboarding?.weekly_focus_goal || 5;
  const university = userContext.profile?.university || 'your university';
  const major = userContext.profile?.major || 'your studies';

  let systemPrompt = `You are Nora, an advanced AI study companion and academic assistant. You have complete knowledge of the student's academic journey and learning preferences.

**Student Profile:**
- Name: ${userName}
- Study Method: ${focusMethod} approach
- Weekly Focus Goal: ${weeklyGoal} hours
- University: ${university}
- Major: ${major}

**Your Capabilities:**
1. Study Planning: Create custom schedules and goal-setting strategies
2. Focus Enhancement: Provide concentration techniques optimized for their learning style
3. Content Mastery: Offer subject-specific learning strategies and practice questions
4. Document Analysis: Review PDFs, create summaries, and generate study questions
5. Academic Writing: Give research guidance, structure planning, and revision support
6. Motivation Support: Deliver personalized strategies to overcome procrastination

**Communication Style:**
- Friendly, supportive, and encouraging
- Use emojis sparingly and appropriately
- Provide actionable, detailed guidance
- Tailor all advice to the student's ${focusMethod} learning style
- Reference their ${weeklyGoal}-hour weekly goal when discussing planning
`;

  if (pdfContext && pdfContext.title) {
    systemPrompt += `\n**Active PDF Context:**
The student has attached a PDF titled: "${pdfContext.title}"

**Your Role:**
- Acknowledge that they've uploaded this PDF for study assistance
- Provide comprehensive study strategies and support for this material
- Help them create study plans, practice questions, and learning strategies
- If they ask specific questions about the PDF content, do your best to help based on the title and typical content for such materials
- Offer to help with note-taking strategies, summarization techniques, and active recall methods
- Create practice questions and study guides appropriate for the subject matter indicated by the title
- Be supportive and helpful even though you don't have the full PDF text extracted yet

**Note:** Full PDF content extraction is being enhanced. Focus on providing excellent academic support based on the document title and general study best practices.
`;
  }

  return systemPrompt;
}

// Call OpenAI API for response generation
async function generateNoraResponseWithOpenAI(message: string, userContext: any, pdfContext: any): Promise<string> {
  // Fallback function for when OpenAI is not available
  const generateFallbackResponse = (message: string, userContext: any, pdfContext: any): string => {
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
  };

  // Check if OpenAI API key is available
  if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
    console.warn('OPENAI_API_KEY_NEW_NORA not configured in Supabase secrets, using fallback responses');
    return generateFallbackResponse(message, userContext, pdfContext);
  }

  console.log('OpenAI API key configured successfully for Nora');

  try {
    const systemPrompt = buildSystemPrompt(userContext, pdfContext);

    const hasPdfContent = pdfContext && pdfContext.content && pdfContext.hasContent;

    console.log('Calling OpenAI API for Nora with model: gpt-4-turbo-preview');
    console.log('PDF context active:', !!pdfContext);
    console.log('PDF content included:', hasPdfContent);
    console.log('User message length:', message.length);
    console.log('System prompt length:', systemPrompt.length);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: hasPdfContent ? 2000 : 1000, // More tokens when analyzing PDFs
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error response:', response.status, error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('OpenAI returned empty response');
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received successfully, length:', aiResponse.length);
    return aiResponse;
  } catch (error) {
    console.error('Error calling OpenAI API for Nora:', error);
    console.log('Falling back to template responses');
    // Fall back to template responses if OpenAI fails
    return generateFallbackResponse(message, userContext, pdfContext);
  }
}

// Upload PDF to OpenAI for Assistant processing
async function uploadPdfToOpenAI(filePath: string, supabaseClient: any): Promise<string | null> {
  try {
    console.log('Uploading PDF to OpenAI for processing:', filePath);

    // Download PDF from Supabase Storage
    const { data: pdfBlob, error: downloadError } = await supabaseClient.storage
      .from('e-books')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      return null;
    }

    console.log('PDF downloaded, size:', pdfBlob.size, 'bytes');

    // Create FormData for OpenAI upload
    const formData = new FormData();
    formData.append('file', pdfBlob, filePath.split('/').pop() || 'document.pdf');
    formData.append('purpose', 'assistants');

    // Upload to OpenAI
    const uploadResponse = await fetch(`${OPENAI_ASSISTANTS_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('OpenAI file upload error:', error);
      return null;
    }

    const uploadData = await uploadResponse.json();
    console.log('PDF uploaded to OpenAI successfully. File ID:', uploadData.id);

    return uploadData.id;
  } catch (error) {
    console.error('Error uploading PDF to OpenAI:', error);
    return null;
  }
}

// Create or get conversation thread
async function getOrCreateThread(userId: string, supabaseClient: any): Promise<string | null> {
  try {
    // Check if user has existing thread
    const { data: threadData } = await supabaseClient
      .from('nora_chat_threads')
      .select('thread_id')
      .eq('user_id', userId)
      .single();

    if (threadData?.thread_id) {
      console.log('Using existing thread:', threadData.thread_id);
      return threadData.thread_id;
    }

    // Create new thread
    console.log('Creating new thread for user:', userId);
    const response = await fetch(`${OPENAI_ASSISTANTS_URL}/threads`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error('Failed to create thread');
      return null;
    }

    const thread = await response.json();
    console.log('New thread created:', thread.id);

    // Save thread ID to database
    await supabaseClient
      .from('nora_chat_threads')
      .insert({
        user_id: userId,
        thread_id: thread.id,
        created_at: new Date().toISOString()
      });

    return thread.id;
  } catch (error) {
    console.error('Error managing thread:', error);
    return null;
  }
}

// Use OpenAI Assistant with File Search for PDF analysis
async function askNoraAssistantWithPdf(
  message: string,
  userId: string,
  userContext: any,
  pdfFileId: string | null,
  pdfContext: any,
  supabaseClient: any
): Promise<string> {
  try {
    console.log('Using OpenAI Assistant for Nora with PDF File Search');

    // Get or create thread
    const threadId = await getOrCreateThread(userId, supabaseClient);
    if (!threadId) {
      throw new Error('Failed to get or create conversation thread');
    }

    // Prepare message with file attachment if PDF is provided
    const messagePayload: any = {
      role: 'user',
      content: message,
    };

    if (pdfFileId) {
      messagePayload.attachments = [{
        file_id: pdfFileId,
        tools: [{ type: 'file_search' }]
      }];
      console.log('Attaching PDF file to message:', pdfFileId);
    }

    // Add message to thread
    const addMessageResponse = await fetch(`${OPENAI_ASSISTANTS_URL}/threads/${threadId}/messages`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify(messagePayload),
    });

    if (!addMessageResponse.ok) {
      const error = await addMessageResponse.text();
      console.error('Failed to add message to thread:', error);
      throw new Error('Failed to add message to thread');
    }

    console.log('Message added to thread');

    // Build additional instructions with user context
    const userName = userContext.profile?.full_name?.split(' ')[0] || 'there';
    const focusMethod = userContext.onboarding?.focus_method || 'Balanced Focus';
    const weeklyGoal = userContext.onboarding?.weekly_focus_goal || 5;

    const contextualInstructions = [
      `Student Profile:\n- Name: ${userName}\n- Study Method: ${focusMethod}\n- Weekly Focus Goal: ${weeklyGoal} hours`,
    ];

    if (pdfContext && pdfContext.title) {
      contextualInstructions.push(
        `Active Document:\n- Title: ${pdfContext.title}\n- OpenAI File ID: ${pdfFileId ?? 'unavailable'}`
      );
    } else {
      contextualInstructions.push('Active Document:\n- No attachment supplied in this message.');
    }

    contextualInstructions.push('Always incorporate the latest message and historic context held in this thread when crafting your reply.');

    const runPayload: any = {
      assistant_id: OPENAI_ASSISTANT_ID,
      instructions: NORA_ASSISTANT_SYSTEM_INSTRUCTIONS,
      additional_instructions: contextualInstructions.join('\n\n'),
    };

    // Ensure file_search tool is enabled when PDF is attached
    if (pdfFileId) {
      runPayload.tools = [{ type: 'file_search' }];
      console.log('Enabling file_search tool for assistant run');
    }

    // Run the assistant
    const runResponse = await fetch(`${OPENAI_ASSISTANTS_URL}/threads/${threadId}/runs`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify(runPayload),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Failed to run assistant:', error);
      throw new Error('Failed to run assistant');
    }

    const run = await runResponse.json();
    console.log('Assistant run started:', run.id);

    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(`${OPENAI_ASSISTANTS_URL}/threads/${threadId}/runs/${run.id}`, {
        headers: openAIHeaders,
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        console.log('Run status:', runStatus);
      }

      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run did not complete. Status: ${runStatus}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`${OPENAI_ASSISTANTS_URL}/threads/${threadId}/messages?limit=10`, {
      headers: openAIHeaders,
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve messages');
    }

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');

    if (assistantMessage && Array.isArray(assistantMessage.content) && assistantMessage.content.length > 0) {
      const textBlocks = assistantMessage.content
        .filter((block: any) => block.type === 'text' && block?.text?.value)
        .map((block: any) => block.text.value.trim())
        .filter(Boolean);

      const responseText = textBlocks.join('\n\n').trim();

      if (responseText.length === 0) {
        throw new Error('Assistant returned empty text content');
      }

      console.log('Assistant response received, length:', responseText.length);
      return responseText;
    }

    throw new Error('No response from assistant');
  } catch (error) {
    console.error('Error using OpenAI Assistant:', error);
    throw error;
  }
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Enhanced Nora chat function called');
    console.log('OPENAI_API_KEY_NEW_NORA configured:', !!OPENAI_API_KEY && OPENAI_API_KEY !== '');

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

    // ============================================================
    // 🔒 SECURITY CHECK: Rate Limiting & Tier Validation
    // ============================================================
    console.log('🔒 Starting security checks for Nora AI access...');

    // 1. Check rate limits and tier access
    const rateLimitResult = await checkRateLimit(supabaseClient, user.id, 'nora');

    if (!rateLimitResult.allowed) {
      console.log('❌ Access denied:', rateLimitResult.reason);

      // Return user-friendly error with upgrade prompt
      const upgradeMessage = getTierUpgradeMessage(rateLimitResult.tier, 'nora');

      return new Response(JSON.stringify({
        error: 'ACCESS_DENIED',
        response: `${rateLimitResult.reason}\n\n${upgradeMessage}`,
        tier: rateLimitResult.tier,
        remaining_messages: rateLimitResult.remaining_messages,
        upgrade_required: true
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('✅ Rate limit check passed');
    console.log(`📊 User tier: ${rateLimitResult.tier}, Remaining messages: ${rateLimitResult.remaining_messages}`);

    // 2. Get tier limits for additional validation
    const tierLimits = await getTierLimits(supabaseClient, user.id);

    if (!tierLimits) {
      console.error('❌ Failed to get tier limits');
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        response: 'Unable to verify your subscription. Please try again or contact support.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 3. Sanitize user input to prevent injection
    const sanitizedMessage = sanitizeInput(message);

    // 4. Validate message length
    const lengthValidation = validateMessageLength(sanitizedMessage, tierLimits);
    if (!lengthValidation.valid) {
      console.log('❌ Message too long:', lengthValidation.reason);
      return new Response(JSON.stringify({
        error: 'MESSAGE_TOO_LONG',
        response: lengthValidation.reason,
        max_length: tierLimits.max_message_length,
        upgrade_required: rateLimitResult.tier !== 'pro'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 5. Validate PDF access if PDF is attached
    if (pdfContext) {
      const pdfValidation = validatePDFAccess(tierLimits, true);
      if (!pdfValidation.allowed) {
        console.log('❌ PDF access denied:', pdfValidation.reason);
        return new Response(JSON.stringify({
          error: 'PDF_ACCESS_DENIED',
          response: pdfValidation.reason,
          upgrade_required: true
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    console.log('✅ All security checks passed, proceeding with request...');
    // ============================================================

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

    // Handle PDF upload to OpenAI if PDF context is provided
    let pdfFileId: string | null = null;
    let enhancedPdfContext = null;

    if (pdfContext && pdfContext.file_path) {
      try {
        console.log('PDF context provided, uploading to OpenAI...');
        console.log('PDF title:', pdfContext.title);
        console.log('PDF file path:', pdfContext.file_path);

        // Check if we already have an OpenAI file ID for this PDF
        const { data: existingFile } = await supabaseClient
          .from('user_ebooks')
          .select('openai_file_id')
          .eq('user_id', user.id)
          .eq('file_path', pdfContext.file_path)
          .single();

        if (existingFile?.openai_file_id) {
          console.log('Using existing OpenAI file ID:', existingFile.openai_file_id);
          pdfFileId = existingFile.openai_file_id;
        } else {
          // Upload PDF to OpenAI
          pdfFileId = await uploadPdfToOpenAI(pdfContext.file_path, supabaseClient);

          if (pdfFileId) {
            // Save the file ID for future use
            await supabaseClient
              .from('user_ebooks')
              .update({ openai_file_id: pdfFileId })
              .eq('user_id', user.id)
              .eq('file_path', pdfContext.file_path);

            console.log('OpenAI file ID saved to database');
          }
        }

        enhancedPdfContext = {
          ...pdfContext,
          openai_file_id: pdfFileId,
          uploadedAt: new Date().toISOString()
        };

        console.log('PDF uploaded to OpenAI successfully');
      } catch (error) {
        console.error('Error uploading PDF to OpenAI:', error);
        enhancedPdfContext = {
          ...pdfContext,
          error: error.message
        };
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

    // Generate enhanced response with full context using OpenAI
    let response: string | null = null;

    if (OPENAI_ASSISTANT_ID) {
      try {
        response = await askNoraAssistantWithPdf(
          message,
          user.id,
          userContext,
          pdfFileId,
          enhancedPdfContext,
          supabaseClient
        );
      } catch (assistantError) {
        console.error('Assistant API run failed, falling back to chat completions.', assistantError);
      }
    } else {
      console.warn('OPENAI Assistant ID not configured, skipping assistants API flow.');
    }

    if (!response) {
      response = await generateNoraResponseWithOpenAI(message, userContext, enhancedPdfContext);
    }

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

    // ============================================================
    // 📊 LOG USAGE: Track tokens and cost
    // ============================================================
    const inputTokens = estimateTokenCount(sanitizedMessage);
    const outputTokens = estimateTokenCount(response);
    const totalTokens = inputTokens + outputTokens;
    const costEstimate = estimateCost(inputTokens, outputTokens);

    console.log(`📊 Token usage: ${totalTokens} (input: ${inputTokens}, output: ${outputTokens})`);
    console.log(`💰 Estimated cost: $${costEstimate.toFixed(4)}`);

    // Log the message for rate limiting and cost tracking
    await logAIMessage(supabaseClient, user.id, 'nora', totalTokens, costEstimate);

    console.log('✅ Usage logged successfully');
    // ============================================================

    // Return response with enhanced format
    return new Response(JSON.stringify({
      response,
      userId: user.id,
      success: true,
      tier: rateLimitResult.tier,
      remaining_messages: rateLimitResult.remaining_messages - 1,
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
