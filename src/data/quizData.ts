export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  category: string;
  weight: number; // For scoring algorithm
}

export interface QuizResult {
  quizId: string;
  score: number;
  category: string;
  description: string;
  recommendations: string[];
  completedAt: Date;
}

// Study Habits Quiz - 70 questions
export const STUDY_HABITS_QUESTIONS: QuizQuestion[] = [
  // Time Management Category
  {
    id: "sh_001",
    question: "How often do you create a study schedule before starting your study sessions?",
    options: ["Always", "Often", "Sometimes", "Rarely", "Never"],
    category: "time_management",
    weight: 3
  },
  {
    id: "sh_002", 
    question: "When do you typically feel most alert and focused for studying?",
    options: ["Early morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (12-4 PM)", "Evening (5-8 PM)", "Late night (9 PM+)"],
    category: "time_management",
    weight: 2
  },
  {
    id: "sh_003",
    question: "How do you handle study breaks during long study sessions?",
    options: ["Take scheduled 5-10 min breaks every hour", "Take breaks when I feel tired", "Study for 2-3 hours then take a long break", "Rarely take breaks", "Take breaks whenever I want"],
    category: "time_management", 
    weight: 3
  },
  {
    id: "sh_004",
    question: "How far in advance do you typically start studying for major exams?",
    options: ["2+ weeks before", "1-2 weeks before", "3-6 days before", "1-2 days before", "The night before or day of"],
    category: "time_management",
    weight: 4
  },
  {
    id: "sh_005",
    question: "How often do you procrastinate on important study tasks?",
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    category: "time_management",
    weight: 3
  },
  {
    id: "sh_006",
    question: "What is your typical study session duration?",
    options: ["Under 30 minutes", "30-60 minutes", "1-2 hours", "2-4 hours", "4+ hours"],
    category: "time_management",
    weight: 2
  },
  {
    id: "sh_007",
    question: "How do you prioritize different subjects or topics when studying?",
    options: ["By difficulty level", "By upcoming deadlines", "By personal interest", "By time available", "I don't prioritize"],
    category: "time_management",
    weight: 3
  },
  {
    id: "sh_008",
    question: "How often do you use time-blocking techniques for your study schedule?",
    options: ["Daily", "Several times a week", "Occasionally", "Rarely", "Never"],
    category: "time_management",
    weight: 2
  },
  {
    id: "sh_009",
    question: "How do you deal with unexpected interruptions during study time?",
    options: ["Reschedule and adjust my plan", "Try to continue where I left off", "Get frustrated and lose focus", "Use it as an excuse to stop", "Ignore interruptions completely"],
    category: "time_management",
    weight: 2
  },
  {
    id: "sh_010",
    question: "How often do you review and adjust your study schedule?",
    options: ["Daily", "Weekly", "Monthly", "Only when it's not working", "Never"],
    category: "time_management",
    weight: 2
  },

  // Study Environment Category
  {
    id: "sh_011",
    question: "Where do you prefer to study most often?",
    options: ["Quiet library", "My bedroom/private room", "Coffee shop/cafe", "Common areas with background noise", "Outdoors"],
    category: "environment",
    weight: 2
  },
  {
    id: "sh_012",
    question: "What background noise level helps you concentrate best?",
    options: ["Complete silence", "Very quiet with minimal sounds", "Soft background music", "Moderate ambient noise", "I can focus with any noise level"],
    category: "environment",
    weight: 3
  },
  {
    id: "sh_013",
    question: "How important is having a dedicated study space?",
    options: ["Essential - I always study in the same place", "Very important - I have 2-3 regular spots", "Somewhat important", "Not very important", "I can study anywhere"],
    category: "environment",
    weight: 2
  },
  {
    id: "sh_014",
    question: "How do you handle your phone and social media while studying?",
    options: ["Turn off and put in another room", "Use app blockers/focus modes", "Keep nearby but on silent", "Check occasionally during breaks", "Check frequently while studying"],
    category: "environment",
    weight: 4
  },
  {
    id: "sh_015",
    question: "What lighting conditions do you prefer for studying?",
    options: ["Bright natural light", "Soft natural light", "Bright artificial light", "Dim artificial light", "I don't notice lighting"],
    category: "environment",
    weight: 1
  },
  {
    id: "sh_016",
    question: "How clean and organized is your study space?",
    options: ["Always perfectly organized", "Usually clean and tidy", "Somewhat organized", "Often cluttered", "Very messy"],
    category: "environment",
    weight: 2
  },
  {
    id: "sh_017",
    question: "Do you prefer studying alone or with others?",
    options: ["Always alone", "Usually alone", "Mix of both", "Usually with others", "Always with study groups"],
    category: "environment",
    weight: 2
  },
  {
    id: "sh_018",
    question: "How do you feel about studying in public places?",
    options: ["Love it - helps me focus", "Like it sometimes", "Neutral about it", "Dislike it", "Hate it - too distracting"],
    category: "environment",
    weight: 2
  },
  {
    id: "sh_019",
    question: "What temperature do you prefer for studying?",
    options: ["Cool (65-68°F)", "Moderate (69-72°F)", "Warm (73-76°F)", "Hot (77°F+)", "I don't notice temperature"],
    category: "environment",
    weight: 1
  },
  {
    id: "sh_020",
    question: "How do you organize your study materials?",
    options: ["Digital-only with cloud storage", "Physical binders and folders", "Mix of digital and physical", "Basic organization", "No particular system"],
    category: "environment",
    weight: 2
  },

  // Note-taking and Information Processing
  {
    id: "sh_021",
    question: "What's your primary note-taking method?",
    options: ["Handwritten notes", "Typed notes on computer", "Voice recordings", "Mind maps/visual notes", "Mix of methods"],
    category: "information_processing",
    weight: 2
  },
  {
    id: "sh_022",
    question: "How do you typically review and revisit your notes?",
    options: ["Review within 24 hours", "Review weekly", "Review before exams only", "Rarely review notes", "Never review notes"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_023",
    question: "When reading textbooks, how do you approach the material?",
    options: ["Read everything thoroughly", "Skim first, then read important parts", "Focus on headings and summaries", "Read only assigned sections", "Avoid reading when possible"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_024",
    question: "How often do you use active reading techniques (highlighting, note-taking while reading)?",
    options: ["Always", "Often", "Sometimes", "Rarely", "Never"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_025",
    question: "How do you handle complex concepts that you don't understand immediately?",
    options: ["Research multiple sources", "Ask for help right away", "Keep re-reading until it clicks", "Move on and come back later", "Give up and hope it's not important"],
    category: "information_processing",
    weight: 4
  },
  {
    id: "sh_026",
    question: "How often do you create summaries or outlines of what you've studied?",
    options: ["After every study session", "Weekly", "Before exams", "Rarely", "Never"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_027",
    question: "How do you test your understanding of material?",
    options: ["Self-quizzing and practice tests", "Teaching/explaining to others", "Reviewing notes repeatedly", "Waiting for official tests", "I don't test myself"],
    category: "information_processing",
    weight: 4
  },
  {
    id: "sh_028",
    question: "How do you handle information overload when studying?",
    options: ["Break into smaller chunks", "Focus on main concepts first", "Take a break and return later", "Push through anyway", "Get overwhelmed and stop"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_029",
    question: "How often do you connect new information to what you already know?",
    options: ["Always", "Often", "Sometimes", "Rarely", "Never"],
    category: "information_processing",
    weight: 3
  },
  {
    id: "sh_030",
    question: "What's your approach to memorizing facts or formulas?",
    options: ["Spaced repetition/flashcards", "Writing them multiple times", "Verbal repetition", "Creating mnemonics", "Cramming before tests"],
    category: "information_processing",
    weight: 3
  },

  // Motivation and Focus
  {
    id: "sh_031",
    question: "What motivates you most to study?",
    options: ["Long-term career goals", "Good grades/GPA", "Learning for personal growth", "Avoiding failure", "External pressure"],
    category: "motivation",
    weight: 2
  },
  {
    id: "sh_032",
    question: "How do you maintain focus during long study sessions?",
    options: ["Set small goals and reward myself", "Use focus techniques (Pomodoro, etc.)", "Take regular breaks", "Change subjects/topics", "I struggle to maintain focus"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_033",
    question: "How do you handle subjects you find boring or difficult?",
    options: ["Find ways to make them interesting", "Study them first when energy is high", "Break them into smaller parts", "Study with others", "Avoid them until necessary"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_034",
    question: "What do you do when you lose motivation to study?",
    options: ["Remind myself of goals", "Take a break and return", "Find study partners", "Change study methods", "Force myself to continue"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_035",
    question: "How do you reward yourself for studying achievements?",
    options: ["Planned rewards after goals", "Small treats during study", "Social activities", "Relaxation time", "I don't reward myself"],
    category: "motivation",
    weight: 2
  },
  {
    id: "sh_036",
    question: "How easily are you distracted while studying?",
    options: ["Very focused, rarely distracted", "Somewhat focused", "Moderately distracted", "Easily distracted", "Constantly distracted"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_037",
    question: "How do you handle study stress and anxiety?",
    options: ["Relaxation/mindfulness techniques", "Exercise and physical activity", "Talk to friends/family", "Take breaks and rest", "Push through the stress"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_038",
    question: "What role do study goals play in your routine?",
    options: ["Set specific daily goals", "Set weekly goals", "Set monthly goals", "Set semester/term goals", "I don't set specific goals"],
    category: "motivation",
    weight: 3
  },
  {
    id: "sh_039",
    question: "How do you stay accountable for your study habits?",
    options: ["Track progress with apps/tools", "Study with accountability partners", "Regular self-reflection", "External deadlines only", "I don't monitor accountability"],
    category: "motivation",
    weight: 2
  },
  {
    id: "sh_040",
    question: "How do you deal with perfectionism in your studies?",
    options: ["I'm not perfectionist", "Set 'good enough' standards", "Focus on learning over perfection", "Struggle with perfectionism", "Perfectionism helps me excel"],
    category: "motivation",
    weight: 2
  },

  // Technology and Tools
  {
    id: "sh_041",
    question: "How often do you use digital tools for studying?",
    options: ["Daily", "Several times a week", "Occasionally", "Rarely", "Never"],
    category: "technology",
    weight: 2
  },
  {
    id: "sh_042",
    question: "What digital tools do you find most helpful for studying?",
    options: ["Note-taking apps", "Flashcard apps", "Calendar/scheduling apps", "Focus/productivity apps", "I prefer analog methods"],
    category: "technology",
    weight: 2
  },
  {
    id: "sh_043",
    question: "How do you use technology to organize your study materials?",
    options: ["Cloud storage with folders", "Local computer organization", "Note-taking app systems", "Physical materials only", "No particular system"],
    category: "technology",
    weight: 2
  },
  {
    id: "sh_044",
    question: "How often do you watch educational videos as part of studying?",
    options: ["Daily", "Several times a week", "Occasionally", "Rarely", "Never"],
    category: "technology",
    weight: 1
  },
  {
    id: "sh_045",
    question: "How do you handle online distractions while studying?",
    options: ["Website blockers", "Study in airplane mode", "Self-discipline", "Study away from devices", "I get distracted often"],
    category: "technology",
    weight: 3
  },
  {
    id: "sh_046",
    question: "Do you use any apps to track your study time?",
    options: ["Yes, daily tracking", "Yes, occasional tracking", "I've tried but don't stick with it", "I prefer manual tracking", "I don't track study time"],
    category: "technology",
    weight: 2
  },
  {
    id: "sh_047",
    question: "How comfortable are you with learning new study technologies?",
    options: ["Very comfortable, early adopter", "Somewhat comfortable", "Neutral", "Prefer familiar tools", "Prefer traditional methods"],
    category: "technology",
    weight: 1
  },
  {
    id: "sh_048",
    question: "How do you backup and protect your study materials?",
    options: ["Multiple cloud backups", "Single cloud backup", "Local backups", "Physical copies only", "No backup system"],
    category: "technology",
    weight: 2
  },
  {
    id: "sh_049",
    question: "How often do you collaborate digitally with study partners?",
    options: ["Daily", "Weekly", "Occasionally", "Rarely", "Never"],
    category: "technology",
    weight: 1
  },
  {
    id: "sh_050",
    question: "What's your preference for consuming study content?",
    options: ["Text-based materials", "Video content", "Audio content", "Interactive content", "Mix of all formats"],
    category: "technology",
    weight: 2
  },

  // Learning Strategies and Techniques
  {
    id: "sh_051",
    question: "How often do you use active recall techniques?",
    options: ["In every study session", "Frequently", "Occasionally", "Rarely", "Never/Don't know what it is"],
    category: "learning_strategies",
    weight: 4
  },
  {
    id: "sh_052",
    question: "How do you approach spaced repetition in your learning?",
    options: ["Systematic spaced repetition", "Review older material regularly", "Review before exams", "Rarely revisit material", "Don't use spaced repetition"],
    category: "learning_strategies",
    weight: 4
  },
  {
    id: "sh_053",
    question: "When learning new concepts, how do you approach understanding?",
    options: ["Start with examples then theory", "Learn theory first then examples", "Learn both simultaneously", "Focus on practical application", "Memorize first, understand later"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_054",
    question: "How often do you explain concepts to others as a study method?",
    options: ["Regularly", "Occasionally", "Rarely", "Never", "Only when asked"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_055",
    question: "How do you handle multiple subjects in one study session?",
    options: ["Focus on one subject per session", "Switch between 2-3 subjects", "Study all subjects daily", "Random based on mood", "Batch similar subjects together"],
    category: "learning_strategies",
    weight: 2
  },
  {
    id: "sh_056",
    question: "What's your approach to practice problems and exercises?",
    options: ["Do many practice problems", "Focus on understanding solutions", "Mix of practice and theory", "Minimal practice", "Avoid practice problems"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_057",
    question: "How do you connect different topics within a subject?",
    options: ["Always look for connections", "Often make connections", "Sometimes notice patterns", "Rarely connect topics", "Study topics in isolation"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_058",
    question: "How do you use mistakes and errors in your learning?",
    options: ["Analyze errors thoroughly", "Review mistakes before exams", "Note mistakes but move on", "Try to avoid making mistakes", "Don't focus on mistakes"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_059",
    question: "How often do you create your own study materials (summaries, flashcards, etc.)?",
    options: ["Always create my own", "Usually create my own", "Sometimes create materials", "Rarely create materials", "Use provided materials only"],
    category: "learning_strategies",
    weight: 3
  },
  {
    id: "sh_060",
    question: "How do you approach learning difficult or abstract concepts?",
    options: ["Use analogies and examples", "Break into smaller parts", "Seek multiple explanations", "Practice until automatic", "Accept that some things are hard"],
    category: "learning_strategies",
    weight: 3
  },

  // Self-Assessment and Reflection
  {
    id: "sh_061",
    question: "How often do you reflect on your study effectiveness?",
    options: ["After every session", "Weekly", "Monthly", "Only when struggling", "Rarely or never"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_062",
    question: "How well do you know your learning strengths and weaknesses?",
    options: ["Very well", "Somewhat well", "Moderately", "Not very well", "Not at all"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_063",
    question: "How often do you adjust your study methods based on results?",
    options: ["Regularly adjust methods", "Adjust when something isn't working", "Occasionally try new methods", "Rarely change methods", "Stick to the same methods"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_064",
    question: "How do you monitor your comprehension while studying?",
    options: ["Regular self-testing", "Pause and summarize", "Check understanding with others", "Go with the flow", "Don't actively monitor"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_065",
    question: "How honest are you about your study habits?",
    options: ["Very honest with myself", "Mostly honest", "Somewhat honest", "Often in denial", "Prefer not to think about it"],
    category: "self_assessment",
    weight: 2
  },
  {
    id: "sh_066",
    question: "How do you track your academic progress?",
    options: ["Detailed tracking system", "Basic grade monitoring", "Occasional check-ins", "Only official reports", "Don't track progress"],
    category: "self_assessment",
    weight: 2
  },
  {
    id: "sh_067",
    question: "How well do you identify when you need help?",
    options: ["Very good at recognizing", "Usually recognize", "Sometimes recognize", "Often too late", "Rarely ask for help"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_068",
    question: "How do you handle feedback on your academic work?",
    options: ["Actively seek and use feedback", "Accept feedback positively", "Mixed reaction to feedback", "Don't like criticism", "Avoid feedback when possible"],
    category: "self_assessment",
    weight: 2
  },
  {
    id: "sh_069",
    question: "How often do you set and evaluate personal learning goals?",
    options: ["Regularly set and review", "Set goals occasionally", "Informal goal setting", "Goals only for major milestones", "Don't set learning goals"],
    category: "self_assessment",
    weight: 3
  },
  {
    id: "sh_070",
    question: "How confident are you in your ability to improve your study habits?",
    options: ["Very confident", "Somewhat confident", "Moderately confident", "Not very confident", "I don't think I can change"],
    category: "self_assessment",
    weight: 2
  }
];

// Learning Style Quiz - 75 questions
export const LEARNING_STYLE_QUESTIONS: QuizQuestion[] = [
  // Visual Learning
  {
    id: "ls_001",
    question: "When someone gives you directions, what helps you remember them best?",
    options: ["A map or written directions", "Verbal step-by-step instructions", "Walking through the route once", "Landmarks and visual cues", "I struggle with directions"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_002",
    question: "How do you prefer to receive new information?",
    options: ["Charts, diagrams, and visuals", "Spoken explanations", "Hands-on demonstrations", "Written text", "Interactive discussions"],
    category: "visual",
    weight: 4
  },
  {
    id: "ls_003",
    question: "When reading, what helps you understand better?",
    options: ["Pictures and diagrams", "Reading aloud", "Taking notes while reading", "Highlighting key points", "Discussing with others"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_004",
    question: "How do you best remember people?",
    options: ["By their face", "By their voice", "By interactions with them", "By their name", "By where I met them"],
    category: "visual",
    weight: 2
  },
  {
    id: "ls_005",
    question: "What type of classroom presentation do you prefer?",
    options: ["Slides with visuals", "Lecture-style speaking", "Interactive workshops", "Handouts to read", "Group discussions"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_006",
    question: "When learning a new software or app, you prefer to:",
    options: ["Watch video tutorials", "Listen to audio instructions", "Try it yourself first", "Read written guides", "Have someone show you"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_007",
    question: "How do you organize your study materials?",
    options: ["Color-coding and visual systems", "By categories and lists", "In the order I'll use them", "By priority and importance", "I don't organize much"],
    category: "visual",
    weight: 2
  },
  {
    id: "ls_008",
    question: "What helps you focus during lectures?",
    options: ["Looking at slides/visuals", "Listening carefully", "Taking detailed notes", "Drawing or doodling", "Asking questions"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_009",
    question: "How do you prefer to solve math problems?",
    options: ["Using graphs and visual aids", "Working through verbally", "Using manipulatives", "Following written steps", "Working with others"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_010",
    question: "When you're trying to remember something, you:",
    options: ["Picture it in your mind", "Say it out loud", "Write it down", "Associate it with feelings", "Repeat it mentally"],
    category: "visual",
    weight: 4
  },
  {
    id: "ls_011",
    question: "What type of study environment do you prefer?",
    options: ["Well-lit with visual aids", "Quiet for listening/thinking", "Space to move around", "Comfortable seating", "Social environment"],
    category: "visual",
    weight: 2
  },
  {
    id: "ls_012",
    question: "How do you best understand complex concepts?",
    options: ["Through diagrams and models", "Through detailed explanations", "By working with examples", "By reading thoroughly", "Through discussion"],
    category: "visual",
    weight: 4
  },
  {
    id: "ls_013",
    question: "When taking notes, you tend to:",
    options: ["Use charts, diagrams, and visuals", "Write down what's said verbatim", "Focus on key actions/processes", "Summarize in your own words", "Write questions and thoughts"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_014",
    question: "What helps you remember a story or lesson?",
    options: ["Visualizing the scenes", "Hearing it told well", "Acting it out", "Reading it multiple times", "Discussing the meaning"],
    category: "visual",
    weight: 3
  },
  {
    id: "ls_015",
    question: "How do you prefer feedback on your work?",
    options: ["Written comments and visual marks", "Verbal discussion", "Demonstrated corrections", "Detailed written explanations", "Peer feedback sessions"],
    category: "visual",
    weight: 2
  },

  // Auditory Learning
  {
    id: "ls_016",
    question: "When learning a new song, how do you do it best?",
    options: ["Reading the lyrics", "Listening repeatedly", "Singing along", "Playing an instrument", "Watching performances"],
    category: "auditory",
    weight: 4
  },
  {
    id: "ls_017",
    question: "How do you prefer to review for exams?",
    options: ["Reading notes silently", "Reading notes aloud", "Practicing with materials", "Rewriting notes", "Group study sessions"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_018",
    question: "What helps you concentrate while studying?",
    options: ["Complete silence", "Background music", "Moving around", "Comfortable setting", "Talking through problems"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_019",
    question: "How do you best learn vocabulary or terms?",
    options: ["Flashcards with pictures", "Saying words out loud", "Using words in context", "Writing them repeatedly", "Discussing meanings"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_020",
    question: "When you have a question, you prefer to:",
    options: ["Look it up visually", "Ask someone verbally", "Experiment to find out", "Research thoroughly", "Discuss with peers"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_021",
    question: "How do you remember phone numbers best?",
    options: ["Writing them down", "Saying them out loud", "Dialing them repeatedly", "Creating a pattern", "Storing in contacts immediately"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_022",
    question: "What type of instructions do you follow best?",
    options: ["Written step-by-step", "Spoken explanations", "Demonstrations", "Detailed manuals", "Collaborative guidance"],
    category: "auditory",
    weight: 4
  },
  {
    id: "ls_023",
    question: "How do you prefer to give presentations?",
    options: ["With lots of visuals", "Speaking without notes", "Interactive demonstrations", "Reading from prepared text", "Panel discussions"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_024",
    question: "When you're thinking through a problem, you:",
    options: ["Draw it out", "Talk through it", "Try different approaches", "Write pros and cons", "Discuss with others"],
    category: "auditory",
    weight: 4
  },
  {
    id: "ls_025",
    question: "How do you best remember sequences or procedures?",
    options: ["Visual flowcharts", "Verbal rehearsal", "Physical practice", "Written checklists", "Teaching others"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_026",
    question: "What helps you understand a foreign language?",
    options: ["Visual word associations", "Listening and speaking", "Immersive practice", "Grammar rules", "Conversation groups"],
    category: "auditory",
    weight: 4
  },
  {
    id: "ls_027",
    question: "How do you prefer to receive criticism or feedback?",
    options: ["Written detailed comments", "Face-to-face discussion", "Demonstrated improvements", "Comprehensive reports", "Peer review sessions"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_028",
    question: "When reading silently, do you:",
    options: ["See the words", "Hear the words in your head", "Feel the story", "Analyze the text", "Have internal dialogue"],
    category: "auditory",
    weight: 4
  },
  {
    id: "ls_029",
    question: "How do you best learn about historical events?",
    options: ["Timeline visuals", "Stories and narratives", "Role-playing", "Reading accounts", "Class discussions"],
    category: "auditory",
    weight: 3
  },
  {
    id: "ls_030",
    question: "What helps you remember appointments or deadlines?",
    options: ["Written calendars", "Verbal reminders", "Alarm/notification systems", "Detailed planners", "Accountability partners"],
    category: "auditory",
    weight: 2
  },

  // Kinesthetic Learning
  {
    id: "ls_031",
    question: "When learning a new skill, you prefer to:",
    options: ["Watch demonstrations", "Listen to explanations", "Practice immediately", "Read instructions first", "Learn with others"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_032",
    question: "How do you prefer to take study breaks?",
    options: ["Looking at something different", "Listening to music", "Physical movement", "Reading something light", "Social interaction"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_033",
    question: "What helps you think through difficult problems?",
    options: ["Drawing diagrams", "Talking it through", "Walking around", "Writing it out", "Brainstorming with others"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_034",
    question: "How do you prefer to learn about science concepts?",
    options: ["Diagrams and models", "Lectures and explanations", "Laboratory experiments", "Textbook reading", "Group projects"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_035",
    question: "When you're restless during class, you:",
    options: ["Look around the room", "Listen more carefully", "Fidget or move", "Take more notes", "Engage in discussion"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_036",
    question: "How do you best understand spatial relationships?",
    options: ["Looking at maps/diagrams", "Having them described", "Building or manipulating", "Reading descriptions", "Discussing layouts"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_037",
    question: "What type of exercise helps you learn best?",
    options: ["Watching others demonstrate", "Following audio instructions", "Learning by doing", "Reading about techniques", "Group fitness classes"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_038",
    question: "How do you prefer to memorize information?",
    options: ["Visual association", "Rhythmic repetition", "Physical movement", "Written repetition", "Group recitation"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_039",
    question: "When you're bored in class, you tend to:",
    options: ["Doodle or draw", "Listen for interesting parts", "Fidget or move", "Take extra notes", "Think about other things"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_040",
    question: "How do you best learn to use tools or equipment?",
    options: ["Watching tutorials", "Following verbal instructions", "Trial and error practice", "Reading manuals", "Learning from peers"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_041",
    question: "What helps you focus during long study sessions?",
    options: ["Good lighting", "Quiet environment", "Ability to move around", "Comfortable seating", "Study partners"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_042",
    question: "How do you prefer to learn geography?",
    options: ["Maps and atlases", "Travel documentaries", "Field trips and exploration", "Reading about places", "Cultural discussions"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_043",
    question: "When assembling something, you:",
    options: ["Follow picture instructions", "Listen to verbal guidance", "Figure it out by trying", "Read all instructions first", "Work with someone else"],
    category: "kinesthetic",
    weight: 4
  },
  {
    id: "ls_044",
    question: "How do you best understand mathematical concepts?",
    options: ["Visual representations", "Verbal explanations", "Working with manipulatives", "Reading examples", "Peer tutoring"],
    category: "kinesthetic",
    weight: 3
  },
  {
    id: "ls_045",
    question: "What helps you remember physical movements or procedures?",
    options: ["Watching demonstrations", "Verbal cues", "Muscle memory practice", "Written steps", "Partner practice"],
    category: "kinesthetic",
    weight: 4
  },

  // Reading/Writing Learning
  {
    id: "ls_046",
    question: "How do you prefer to capture ideas during brainstorming?",
    options: ["Mind maps and diagrams", "Voice recordings", "Moving sticky notes", "Lists and outlines", "Group discussion notes"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_047",
    question: "What helps you understand literature best?",
    options: ["Character charts", "Audio books", "Acting out scenes", "Written analysis", "Book discussions"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_048",
    question: "How do you prefer to plan projects or assignments?",
    options: ["Visual project boards", "Talking through plans", "Creating prototypes", "Detailed written plans", "Collaborative planning"],
    category: "reading_writing",
    weight: 4
  },
  {
    id: "ls_049",
    question: "When you need to remember details, you:",
    options: ["Create visual aids", "Repeat them verbally", "Practice using them", "Write them down", "Discuss with others"],
    category: "reading_writing",
    weight: 4
  },
  {
    id: "ls_050",
    question: "How do you prefer to study for essay exams?",
    options: ["Outline visually", "Discuss topics aloud", "Practice writing", "Read extensively", "Form study groups"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_051",
    question: "What helps you understand complex texts?",
    options: ["Graphic organizers", "Reading aloud", "Taking notes while reading", "Multiple readings", "Discussion groups"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_052",
    question: "How do you prefer to solve word problems?",
    options: ["Drawing pictures", "Reading aloud", "Acting them out", "Breaking down in writing", "Working with partners"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_053",
    question: "When learning new terminology, you:",
    options: ["Create visual associations", "Practice pronunciation", "Use in context", "Write definitions", "Teach others"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_054",
    question: "How do you best organize your thoughts for presentations?",
    options: ["Storyboard or slides", "Outline talking points", "Practice with gestures", "Write full scripts", "Brainstorm with others"],
    category: "reading_writing",
    weight: 4
  },
  {
    id: "ls_055",
    question: "What helps you edit and revise your writing?",
    options: ["Visual editing marks", "Reading aloud", "Changing format/font", "Multiple written drafts", "Peer editing"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_056",
    question: "How do you prefer to receive assignment instructions?",
    options: ["Visual examples", "Verbal explanation", "Sample materials", "Written guidelines", "Q&A sessions"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_057",
    question: "When you research topics, you prefer:",
    options: ["Infographics and charts", "Podcasts and videos", "Primary sources", "Academic articles", "Discussion forums"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_058",
    question: "How do you best understand cause and effect relationships?",
    options: ["Flow charts", "Verbal explanations", "Simulation activities", "Written analysis", "Group discussions"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_059",
    question: "What helps you remember facts and data?",
    options: ["Charts and graphs", "Rhymes and songs", "Flashcard practice", "Written summaries", "Quiz games"],
    category: "reading_writing",
    weight: 3
  },
  {
    id: "ls_060",
    question: "How do you prefer to track your learning progress?",
    options: ["Visual progress charts", "Audio reflections", "Portfolio collections", "Written journals", "Discussion with mentors"],
    category: "reading_writing",
    weight: 2
  },

  // Social Learning
  {
    id: "ls_061",
    question: "How do you prefer to work on group projects?",
    options: ["Divide visual tasks", "Discuss and delegate", "Hands-on collaboration", "Written coordination", "Regular group meetings"],
    category: "social",
    weight: 4
  },
  {
    id: "ls_062",
    question: "What helps you understand different perspectives?",
    options: ["Visual comparisons", "Hearing others speak", "Role-playing exercises", "Reading various sources", "Group discussions"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_063",
    question: "How do you prefer to resolve conflicts?",
    options: ["Visual problem-solving", "Talking it through", "Taking action together", "Written communication", "Mediated discussions"],
    category: "social",
    weight: 2
  },
  {
    id: "ls_064",
    question: "When you're confused about something, you:",
    options: ["Look for visual aids", "Ask questions verbally", "Try different approaches", "Research independently", "Seek peer help"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_065",
    question: "How do you prefer to learn about cultures?",
    options: ["Visual media", "Stories and music", "Cultural activities", "Reading about them", "Cultural exchange"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_066",
    question: "What motivates you to learn new things?",
    options: ["Seeing results", "Hearing success stories", "Achieving goals", "Personal growth", "Social recognition"],
    category: "social",
    weight: 2
  },
  {
    id: "ls_067",
    question: "How do you prefer to share your knowledge?",
    options: ["Creating presentations", "Speaking to groups", "Demonstrating skills", "Writing guides", "Collaborative teaching"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_068",
    question: "When learning in groups, you tend to:",
    options: ["Focus on visual materials", "Contribute to discussions", "Engage in activities", "Take detailed notes", "Facilitate interactions"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_069",
    question: "How do you prefer to receive encouragement?",
    options: ["Visual recognition", "Verbal praise", "High-fives/gestures", "Written feedback", "Public acknowledgment"],
    category: "social",
    weight: 2
  },
  {
    id: "ls_070",
    question: "What helps you learn from mistakes?",
    options: ["Seeing corrections", "Discussing what happened", "Trying again immediately", "Analyzing in writing", "Learning from others' experiences"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_071",
    question: "How do you prefer to learn social skills?",
    options: ["Observing others", "Listening to advice", "Practicing interactions", "Reading about techniques", "Group skill-building"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_072",
    question: "When you're teaching others, you:",
    options: ["Use visual aids", "Explain verbally", "Show them how", "Provide written resources", "Facilitate group learning"],
    category: "social",
    weight: 3
  },
  {
    id: "ls_073",
    question: "How do you prefer to build relationships?",
    options: ["Shared visual experiences", "Deep conversations", "Doing activities together", "Written communication", "Group interactions"],
    category: "social",
    weight: 2
  },
  {
    id: "ls_074",
    question: "What helps you understand team dynamics?",
    options: ["Organizational charts", "Open communication", "Working together", "Reading about teams", "Facilitated discussions"],
    category: "social",
    weight: 2
  },
  {
    id: "ls_075",
    question: "How do you prefer to give feedback to others?",
    options: ["Visual demonstrations", "One-on-one conversations", "Modeling behavior", "Written suggestions", "Group feedback sessions"],
    category: "social",
    weight: 3
  }
];

// Quiz result configurations
export const STUDY_HABITS_RESULTS = {
  categories: {
    time_management: {
      name: "Time Management",
      description: "How effectively you plan and manage your study time"
    },
    environment: {
      name: "Study Environment", 
      description: "Your preferences and setup for optimal studying"
    },
    information_processing: {
      name: "Information Processing",
      description: "How you take in, organize, and retain information"
    },
    motivation: {
      name: "Motivation & Focus",
      description: "Your drive to study and ability to maintain concentration"
    },
    technology: {
      name: "Technology Use",
      description: "How you integrate digital tools into your learning"
    },
    learning_strategies: {
      name: "Learning Strategies",
      description: "The specific techniques and methods you use to learn"
    },
    self_assessment: {
      name: "Self-Assessment",
      description: "Your ability to reflect on and improve your learning"
    }
  }
};

export const LEARNING_STYLE_RESULTS = {
  categories: {
    visual: {
      name: "Visual Learning",
      description: "Learning through seeing and visual information"
    },
    auditory: {
      name: "Auditory Learning",
      description: "Learning through hearing and verbal information"
    },
    kinesthetic: {
      name: "Kinesthetic Learning",
      description: "Learning through movement and hands-on activities"
    },
    reading_writing: {
      name: "Reading/Writing Learning",
      description: "Learning through text-based input and output"
    },
    social: {
      name: "Social Learning",
      description: "Learning through interaction with others"
    }
  }
};

// Motivation Profile Quiz - 60 questions based on Self-Determination Theory
export const MOTIVATION_PROFILE_QUESTIONS: QuizQuestion[] = [
  // Intrinsic Motivation
  {
    id: "mp_001",
    question: "Why do you study most of the time?",
    options: ["Because I enjoy learning new things", "To get good grades", "Because I have to", "To please others", "To avoid feeling guilty"],
    category: "intrinsic",
    weight: 4
  },
  {
    id: "mp_002",
    question: "How do you feel when you master a difficult concept?",
    options: ["Deeply satisfied and proud", "Relieved it's over", "Happy for the grade", "Glad to meet expectations", "Just ready to move on"],
    category: "intrinsic",
    weight: 3
  },
  {
    id: "mp_003",
    question: "When do you study most effectively?",
    options: ["When the topic interests me", "Right before deadlines", "When I'm reminded", "When others are studying", "When I feel obligated"],
    category: "intrinsic",
    weight: 4
  },
  {
    id: "mp_004",
    question: "How often do you study topics beyond what's required?",
    options: ["Very often - I love exploring further", "Sometimes - if it's interesting", "Rarely - I stick to requirements", "Never - I do what's needed", "Only for my favorite subjects"],
    category: "intrinsic",
    weight: 4
  },
  {
    id: "mp_005",
    question: "What's your reaction when you discover something new while studying?",
    options: ["Excited and curious to learn more", "Interested if it's useful", "Neutral - just more to remember", "Stressed about extra material", "Hope it won't be on the test"],
    category: "intrinsic",
    weight: 3
  },
  {
    id: "mp_006",
    question: "How do you feel about optional learning opportunities?",
    options: ["Enthusiastic - I seek them out", "Interested if convenient", "Indifferent to them", "See them as extra work", "Avoid when possible"],
    category: "intrinsic",
    weight: 3
  },
  {
    id: "mp_007",
    question: "When reading for class, how engaged are you?",
    options: ["Fully absorbed in the content", "Engaged when interesting", "Going through the motions", "Forcing myself to focus", "Frequently distracted"],
    category: "intrinsic",
    weight: 3
  },
  {
    id: "mp_008",
    question: "How do you approach challenging problems?",
    options: ["See them as exciting puzzles", "Accept them as necessary", "Find them frustrating", "Avoid when possible", "Need external push to try"],
    category: "intrinsic",
    weight: 4
  },
  {
    id: "mp_009",
    question: "What drives you to improve your understanding?",
    options: ["Personal curiosity and growth", "Better performance", "Meeting standards", "Others' expectations", "Avoiding consequences"],
    category: "intrinsic",
    weight: 4
  },
  {
    id: "mp_010",
    question: "How do you feel during deep study sessions?",
    options: ["Energized and in flow", "Productive and focused", "It's work but manageable", "Drained and tired", "Counting down the time"],
    category: "intrinsic",
    weight: 3
  },

  // Extrinsic Motivation - Achievement
  {
    id: "mp_011",
    question: "How important are grades to your motivation?",
    options: ["Very important - they drive me", "Important but not everything", "Somewhat important", "Not very important", "I don't focus on grades"],
    category: "achievement",
    weight: 4
  },
  {
    id: "mp_012",
    question: "How do you feel when you receive a high grade?",
    options: ["Proud and validated", "Satisfied - it's expected", "Relieved", "Happy for a moment", "Grades don't affect me much"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_013",
    question: "What role do academic achievements play in your identity?",
    options: ["Central to who I am", "Important part of me", "One aspect among many", "Minor role", "Not part of my identity"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_014",
    question: "How do you respond to academic competition?",
    options: ["Thrive on it - it motivates me", "Use it as motivation", "Prefer collaboration", "Find it stressful", "Avoid competitive situations"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_015",
    question: "How important is being the best in class to you?",
    options: ["Extremely important", "Very important", "Somewhat important", "Not very important", "Not important at all"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_016",
    question: "How do you feel about public recognition for academic success?",
    options: ["Love it - very motivating", "Appreciate it", "It's nice but not necessary", "Indifferent to it", "Prefer private acknowledgment"],
    category: "achievement",
    weight: 2
  },
  {
    id: "mp_017",
    question: "What's your reaction to a lower-than-expected grade?",
    options: ["Devastated and immediately plan improvement", "Disappointed but move forward", "Analyze what went wrong", "Frustrated temporarily", "Doesn't bother me much"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_018",
    question: "How do you set academic goals?",
    options: ["Ambitious - aim for top performance", "Challenging but achievable", "Moderate - meet requirements", "Flexible goals", "I don't set specific goals"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_019",
    question: "How important is maintaining your GPA to you?",
    options: ["Critically important", "Very important", "Somewhat important", "Not very important", "I don't track my GPA closely"],
    category: "achievement",
    weight: 3
  },
  {
    id: "mp_020",
    question: "How do you measure your academic success?",
    options: ["By grades and rankings", "By personal growth and understanding", "By effort put in", "By completion of work", "I don't measure success"],
    category: "achievement",
    weight: 3
  },

  // Social Motivation
  {
    id: "mp_021",
    question: "How much does your family's opinion influence your study habits?",
    options: ["Greatly - it's a major factor", "Significantly", "Somewhat", "A little", "Not at all"],
    category: "social",
    weight: 3
  },
  {
    id: "mp_022",
    question: "How important is making your parents proud?",
    options: ["Extremely important - primary motivator", "Very important", "Somewhat important", "A minor factor", "Not a factor"],
    category: "social",
    weight: 4
  },
  {
    id: "mp_023",
    question: "How do peer expectations affect your studying?",
    options: ["Strongly motivate me", "Influence my effort", "Slightly affect me", "Don't really matter", "I ignore peer pressure"],
    category: "social",
    weight: 3
  },
  {
    id: "mp_024",
    question: "How much do you study to meet others' expectations?",
    options: ["Most of my motivation", "A significant part", "Some of it", "A small part", "I study for myself"],
    category: "social",
    weight: 4
  },
  {
    id: "mp_025",
    question: "How do you feel about studying with friends?",
    options: ["Essential - keeps me motivated", "Very helpful and motivating", "Sometimes helpful", "Prefer alone", "Find it distracting"],
    category: "social",
    weight: 2
  },
  {
    id: "mp_026",
    question: "How important is social approval for your academic choices?",
    options: ["Very important in my decisions", "Somewhat important", "Moderately important", "Minor consideration", "Not important"],
    category: "social",
    weight: 3
  },
  {
    id: "mp_027",
    question: "How do you feel when studying less than your peers?",
    options: ["Very guilty and anxious", "Somewhat concerned", "A bit uneasy", "Doesn't bother me", "I don't compare"],
    category: "social",
    weight: 2
  },
  {
    id: "mp_028",
    question: "How much do teachers' opinions motivate you?",
    options: ["Greatly - I want their approval", "Significantly", "Somewhat", "A little", "Not much"],
    category: "social",
    weight: 3
  },
  {
    id: "mp_029",
    question: "How do you feel about disappointing people with poor performance?",
    options: ["Devastating - major motivator to avoid", "Very concerned about it", "Somewhat concerned", "Mildly concerned", "Doesn't worry me"],
    category: "social",
    weight: 3
  },
  {
    id: "mp_030",
    question: "How important is studying to fit in with your social group?",
    options: ["Very important", "Somewhat important", "A minor factor", "Not important", "My group doesn't focus on studying"],
    category: "social",
    weight: 2
  },

  // Future Goals Motivation
  {
    id: "mp_031",
    question: "How connected do you feel between current studies and future career?",
    options: ["Very directly connected", "Clearly connected", "Somewhat connected", "Loosely connected", "Don't see the connection"],
    category: "future_goals",
    weight: 4
  },
  {
    id: "mp_032",
    question: "How often do you think about your long-term career goals while studying?",
    options: ["Constantly - it drives me", "Very often", "Sometimes", "Rarely", "Never"],
    category: "future_goals",
    weight: 3
  },
  {
    id: "mp_033",
    question: "How clear are your post-graduation plans?",
    options: ["Very clear and detailed", "Fairly clear", "Some ideas", "Vague ideas", "No clear plans"],
    category: "future_goals",
    weight: 3
  },
  {
    id: "mp_034",
    question: "How much does your desired future motivate your present study habits?",
    options: ["It's my primary motivator", "Major motivation", "Some motivation", "Minor motivation", "Doesn't motivate me"],
    category: "future_goals",
    weight: 4
  },
  {
    id: "mp_035",
    question: "How important is financial success in your academic motivation?",
    options: ["Extremely important", "Very important", "Somewhat important", "Not very important", "Not a factor"],
    category: "future_goals",
    weight: 2
  },
  {
    id: "mp_036",
    question: "Do you have a specific dream job or career?",
    options: ["Yes, very specific and it drives me", "Yes, and it motivates me", "Sort of - still exploring", "No, I'm undecided", "Career isn't my focus"],
    category: "future_goals",
    weight: 3
  },
  {
    id: "mp_037",
    question: "How often do you research or plan for your future career?",
    options: ["Very frequently", "Regularly", "Occasionally", "Rarely", "Never"],
    category: "future_goals",
    weight: 2
  },
  {
    id: "mp_038",
    question: "How important is achieving a certain lifestyle through education?",
    options: ["Extremely important", "Very important", "Somewhat important", "Not very important", "Not important"],
    category: "future_goals",
    weight: 2
  },
  {
    id: "mp_039",
    question: "How does thinking about your future make you feel?",
    options: ["Excited and motivated", "Hopeful and driven", "Neutral", "Anxious", "Overwhelmed"],
    category: "future_goals",
    weight: 2
  },
  {
    id: "mp_040",
    question: "How much do you see education as a means to an end?",
    options: ["Entirely - it's just a stepping stone", "Mostly practical purpose", "Mix of practical and personal", "More for personal growth", "Education is the goal itself"],
    category: "future_goals",
    weight: 3
  },

  // Autonomy and Control
  {
    id: "mp_041",
    question: "How much control do you feel over your academic choices?",
    options: ["Complete control", "Mostly in control", "Some control", "Limited control", "No control"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_042",
    question: "How do you feel about choosing your own study methods?",
    options: ["Love the freedom - essential", "Prefer having choice", "It's okay either way", "Prefer guidance", "Want to be told what to do"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_043",
    question: "How important is having a say in what you study?",
    options: ["Extremely important", "Very important", "Somewhat important", "Not very important", "Don't care"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_044",
    question: "How do you feel about self-directed learning?",
    options: ["Thrive on it", "Enjoy it", "It's acceptable", "Find it challenging", "Prefer structured learning"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_045",
    question: "How much do you customize your study approach?",
    options: ["Extensively - I have my own system", "Quite a bit", "Somewhat", "A little", "Follow standard methods"],
    category: "autonomy",
    weight: 2
  },
  {
    id: "mp_046",
    question: "How do you feel when forced to study something you don't want to?",
    options: ["Very resistant and unmotivated", "Frustrated but compliant", "Accept it as necessary", "Don't mind much", "Equally motivated either way"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_047",
    question: "How important is personal ownership of your learning?",
    options: ["Extremely important", "Very important", "Somewhat important", "Not very important", "Doesn't matter"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_048",
    question: "How do you react to micromanagement of your studies?",
    options: ["Strongly dislike - kills motivation", "Dislike it", "Tolerate it", "Don't mind", "Actually prefer it"],
    category: "autonomy",
    weight: 2
  },
  {
    id: "mp_049",
    question: "How much do you value independence in learning?",
    options: ["Highly value it", "Value it significantly", "Moderately value it", "Don't value it much", "Prefer dependence/guidance"],
    category: "autonomy",
    weight: 3
  },
  {
    id: "mp_050",
    question: "How do you feel about flexible study schedules vs. rigid ones?",
    options: ["Need flexibility to stay motivated", "Prefer flexibility", "Either works", "Prefer structure", "Need rigid structure"],
    category: "autonomy",
    weight: 2
  },

  // Competence and Mastery
  {
    id: "mp_051",
    question: "How important is becoming an expert in your field?",
    options: ["Extremely important - my main goal", "Very important", "Somewhat important", "Not very important", "Not a priority"],
    category: "competence",
    weight: 3
  },
  {
    id: "mp_052",
    question: "How do you feel when you've truly mastered a skill?",
    options: ["Incredibly fulfilled", "Very satisfied", "Good but ready for next", "Relieved", "Doesn't affect me much"],
    category: "competence",
    weight: 3
  },
  {
    id: "mp_053",
    question: "How important is continuous improvement to you?",
    options: ["Essential - always want to be better", "Very important", "Important", "Somewhat important", "Not very focused on it"],
    category: "competence",
    weight: 4
  },
  {
    id: "mp_054",
    question: "How do you handle topics you're naturally good at?",
    options: ["Push to master them completely", "Enjoy and develop them", "Maintain but don't prioritize", "Take them for granted", "Find them boring"],
    category: "competence",
    weight: 2
  },
  {
    id: "mp_055",
    question: "How motivated are you by personal progress?",
    options: ["Extremely - it's my main drive", "Very motivated", "Moderately motivated", "Somewhat motivated", "Not really motivated by it"],
    category: "competence",
    weight: 4
  },
  {
    id: "mp_056",
    question: "How do you feel about becoming highly skilled?",
    options: ["It's my passion and goal", "Very appealing", "Appealing", "Nice but not essential", "Indifferent"],
    category: "competence",
    weight: 3
  },
  {
    id: "mp_057",
    question: "How important is developing deep expertise?",
    options: ["Critically important", "Very important", "Important", "Somewhat important", "Surface knowledge is enough"],
    category: "competence",
    weight: 3
  },
  {
    id: "mp_058",
    question: "How do you respond to intellectual challenges?",
    options: ["Energized - love proving I can do it", "Motivated to overcome them", "Accept them", "Find them daunting", "Prefer to avoid them"],
    category: "competence",
    weight: 4
  },
  {
    id: "mp_059",
    question: "How much do you care about being competent?",
    options: ["It's fundamental to my identity", "Very important to me", "Important", "Somewhat important", "Not very important"],
    category: "competence",
    weight: 3
  },
  {
    id: "mp_060",
    question: "How do you feel about reaching your potential?",
    options: ["Passionate drive to reach it", "Strongly motivated", "Motivated", "Somewhat interested", "Don't think about it much"],
    category: "competence",
    weight: 3
  }
];

// Focus Type Quiz - 48 questions based on attention research
export const FOCUS_TYPE_QUESTIONS: QuizQuestion[] = [
  // Sustained Attention
  {
    id: "ft_001",
    question: "How long can you typically maintain focus on a single task?",
    options: ["2+ hours easily", "60-90 minutes", "30-60 minutes", "15-30 minutes", "Under 15 minutes"],
    category: "sustained",
    weight: 4
  },
  {
    id: "ft_002",
    question: "How do you handle monotonous or repetitive study tasks?",
    options: ["Stay focused throughout", "Maintain focus well", "Need occasional breaks", "Find it challenging", "Struggle to focus"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_003",
    question: "How does your focus change during long study sessions?",
    options: ["Stays consistent", "Slight decline", "Moderate decline", "Significant decline", "Declines rapidly"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_004",
    question: "How often do you need to take breaks during focused work?",
    options: ["Rarely - can go for hours", "Every 60-90 minutes", "Every 30-45 minutes", "Every 15-25 minutes", "Very frequently"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_005",
    question: "How well do you maintain attention when reading long texts?",
    options: ["Excellent - fully absorbed", "Good - mostly focused", "Moderate - some wandering", "Difficult - mind wanders often", "Very difficult - can't focus"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_006",
    question: "How do you handle studying topics that don't immediately interest you?",
    options: ["Focus just as well", "Can focus with effort", "Challenging but manageable", "Very challenging", "Nearly impossible"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_007",
    question: "What's your attention span like during lectures?",
    options: ["Fully attentive throughout", "Good for most of it", "Attention fades halfway", "Struggle after 15-20 min", "Very short attention span"],
    category: "sustained",
    weight: 3
  },
  {
    id: "ft_008",
    question: "How consistent is your focus across different times of day?",
    options: ["Very consistent", "Mostly consistent", "Some variation", "Significant variation", "Highly variable"],
    category: "sustained",
    weight: 2
  },

  // Selective Attention
  {
    id: "ft_009",
    question: "How well can you filter out distractions?",
    options: ["Excellent - rarely distracted", "Good - mostly stay focused", "Moderate - some distractions", "Poor - easily distracted", "Very poor - constantly distracted"],
    category: "selective",
    weight: 4
  },
  {
    id: "ft_010",
    question: "How do you handle background noise while studying?",
    options: ["Completely tune it out", "Can ignore it mostly", "Sometimes distracting", "Often distracting", "Can't focus with any noise"],
    category: "selective",
    weight: 3
  },
  {
    id: "ft_011",
    question: "How easily do visual distractions pull your attention?",
    options: ["Rarely notice them", "Occasionally notice", "Sometimes distracting", "Often distracting", "Constantly distracted"],
    category: "selective",
    weight: 3
  },
  {
    id: "ft_012",
    question: "How do you handle studying in busy environments?",
    options: ["Focus just as well", "Can focus with effort", "Challenging but possible", "Very difficult", "Nearly impossible"],
    category: "selective",
    weight: 3
  },
  {
    id: "ft_013",
    question: "When someone talks nearby, how does it affect you?",
    options: ["Don't notice at all", "Barely notice", "Somewhat distracting", "Very distracting", "Completely breaks focus"],
    category: "selective",
    weight: 3
  },
  {
    id: "ft_014",
    question: "How well can you ignore your phone during study sessions?",
    options: ["Never think about it", "Rarely tempted", "Sometimes tempted", "Often tempted", "Constantly checking it"],
    category: "selective",
    weight: 4
  },
  {
    id: "ft_015",
    question: "How do internal distractions (thoughts/worries) affect you?",
    options: ["Rarely intrude", "Occasionally intrude", "Sometimes intrude", "Often intrude", "Constantly intrude"],
    category: "selective",
    weight: 3
  },
  {
    id: "ft_016",
    question: "How easily can you return to focus after interruptions?",
    options: ["Immediately", "Within a minute", "A few minutes", "Several minutes", "Very difficult"],
    category: "selective",
    weight: 3
  },

  // Divided Attention
  {
    id: "ft_017",
    question: "How well can you multitask while studying?",
    options: ["Effectively handle multiple things", "Can manage two tasks", "Struggle with multitasking", "Can't multitask effectively", "Multitasking ruins focus"],
    category: "divided",
    weight: 3
  },
  {
    id: "ft_018",
    question: "Can you listen to music and study simultaneously?",
    options: ["Yes, helps me focus", "Yes, doesn't affect me", "Sometimes works", "Usually distracting", "Never works"],
    category: "divided",
    weight: 2
  },
  {
    id: "ft_019",
    question: "How do you handle switching between different subjects?",
    options: ["Switch easily", "Can switch with minor adjustment", "Need time to adjust", "Difficult transition", "Very disruptive"],
    category: "divided",
    weight: 3
  },
  {
    id: "ft_020",
    question: "Can you take notes while listening to a lecture?",
    options: ["Easily and effectively", "Generally well", "Manageable but challenging", "Very challenging", "Miss important points"],
    category: "divided",
    weight: 3
  },
  {
    id: "ft_021",
    question: "How well do you handle multiple ongoing projects?",
    options: ["Excel at it", "Manage well", "Can handle it", "Find it stressful", "Prefer one thing at a time"],
    category: "divided",
    weight: 2
  },
  {
    id: "ft_022",
    question: "How does task-switching affect your efficiency?",
    options: ["No impact", "Minimal impact", "Some impact", "Significant impact", "Major disruption"],
    category: "divided",
    weight: 3
  },
  {
    id: "ft_023",
    question: "Can you monitor time while deeply focused?",
    options: ["Yes, good time awareness", "Usually aware", "Sometimes lose track", "Often lose track", "Completely lose track"],
    category: "divided",
    weight: 2
  },
  {
    id: "ft_024",
    question: "How well can you think and write simultaneously?",
    options: ["Very naturally", "Generally well", "Adequately", "Challenging", "Very difficult"],
    category: "divided",
    weight: 2
  },

  // Alternating Attention
  {
    id: "ft_025",
    question: "How quickly can you shift focus between different tasks?",
    options: ["Instantly", "Very quickly", "Moderately fast", "Slowly", "Very slowly"],
    category: "alternating",
    weight: 3
  },
  {
    id: "ft_026",
    question: "How do you handle studying multiple topics in one session?",
    options: ["Prefer and excel at it", "Works well for me", "Can manage it", "Prefer one topic", "Strongly prefer single focus"],
    category: "alternating",
    weight: 3
  },
  {
    id: "ft_027",
    question: "After a break, how quickly can you refocus?",
    options: ["Immediately", "Within 1-2 minutes", "Within 5 minutes", "Takes 10+ minutes", "Very difficult"],
    category: "alternating",
    weight: 3
  },
  {
    id: "ft_028",
    question: "How do you handle interleaved practice (mixing topics)?",
    options: ["Prefer it - helps learning", "Works well", "Can adapt", "Find it confusing", "Strongly dislike it"],
    category: "alternating",
    weight: 3
  },
  {
    id: "ft_029",
    question: "How well can you switch between different types of thinking?",
    options: ["Very fluidly", "Quite well", "Adequately", "With difficulty", "Struggle significantly"],
    category: "alternating",
    weight: 2
  },
  {
    id: "ft_030",
    question: "How do you handle studying that requires frequent reference switching?",
    options: ["Enjoy the variety", "Manage well", "Can handle it", "Find it disruptive", "Prefer continuous reading"],
    category: "alternating",
    weight: 2
  },
  {
    id: "ft_031",
    question: "How flexible is your attention?",
    options: ["Extremely flexible", "Very flexible", "Moderately flexible", "Somewhat rigid", "Prefer single focus"],
    category: "alternating",
    weight: 3
  },
  {
    id: "ft_032",
    question: "How do you feel about changing study methods mid-session?",
    options: ["Energizes me", "Fine with it", "Neutral", "Prefer consistency", "Disruptive"],
    category: "alternating",
    weight: 2
  },

  // Deep Focus (Flow State)
  {
    id: "ft_033",
    question: "How often do you experience 'flow' or deep immersion while studying?",
    options: ["Very frequently", "Often", "Sometimes", "Rarely", "Never"],
    category: "deep",
    weight: 4
  },
  {
    id: "ft_034",
    question: "Can you lose track of time when deeply focused?",
    options: ["Happens regularly", "Happens often", "Happens occasionally", "Rarely happens", "Never happens"],
    category: "deep",
    weight: 3
  },
  {
    id: "ft_035",
    question: "How easily do you enter a state of deep concentration?",
    options: ["Very easily", "Fairly easily", "Takes some time", "Very difficult", "Nearly impossible"],
    category: "deep",
    weight: 4
  },
  {
    id: "ft_036",
    question: "How do you feel during periods of intense focus?",
    options: ["Energized and in the zone", "Engaged and productive", "Focused but aware of effort", "Strained concentration", "Can't reach that state"],
    category: "deep",
    weight: 3
  },
  {
    id: "ft_037",
    question: "How long does it take you to reach deep focus?",
    options: ["Immediate", "5-10 minutes", "15-20 minutes", "30+ minutes", "Can't reach deep focus"],
    category: "deep",
    weight: 3
  },
  {
    id: "ft_038",
    question: "How often do you feel completely absorbed in your studies?",
    options: ["Very often", "Often", "Sometimes", "Rarely", "Never"],
    category: "deep",
    weight: 3
  },
  {
    id: "ft_039",
    question: "Can you study for extended periods without breaks?",
    options: ["Yes, regularly 2+ hours", "Often 1-2 hours", "Usually under 1 hour", "Need frequent breaks", "Can't go more than 30 min"],
    category: "deep",
    weight: 3
  },
  {
    id: "ft_040",
    question: "How protected are you from distractions when deeply focused?",
    options: ["Completely immune", "Mostly immune", "Somewhat protected", "Easily interrupted", "Very fragile focus"],
    category: "deep",
    weight: 3
  },

  // Environmental Sensitivity
  {
    id: "ft_041",
    question: "How sensitive are you to your study environment?",
    options: ["Can focus anywhere", "Fairly adaptable", "Moderately sensitive", "Quite sensitive", "Extremely sensitive"],
    category: "environmental",
    weight: 3
  },
  {
    id: "ft_042",
    question: "How does lighting affect your ability to focus?",
    options: ["No effect", "Minimal effect", "Some effect", "Significant effect", "Major effect"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_043",
    question: "How does temperature affect your concentration?",
    options: ["No effect", "Minimal effect", "Some effect", "Significant effect", "Major effect"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_044",
    question: "How important is comfort for maintaining focus?",
    options: ["Can focus in discomfort", "Prefer comfort but adaptable", "Fairly important", "Very important", "Critical for focus"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_045",
    question: "How do you adapt to new study environments?",
    options: ["Instantly comfortable", "Quick adjustment", "Need some time", "Difficult adjustment", "Very challenging"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_046",
    question: "How does hunger or tiredness affect your focus?",
    options: ["No impact", "Minor impact", "Moderate impact", "Significant impact", "Cannot focus when hungry/tired"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_047",
    question: "How crucial is a designated study space for you?",
    options: ["Not important - anywhere works", "Slightly helpful", "Somewhat important", "Very important", "Absolutely essential"],
    category: "environmental",
    weight: 2
  },
  {
    id: "ft_048",
    question: "How do changes in routine affect your ability to focus?",
    options: ["No effect", "Minimal effect", "Some effect", "Significant effect", "Major disruption"],
    category: "environmental",
    weight: 2
  }
];

export const MOTIVATION_PROFILE_RESULTS = {
  categories: {
    intrinsic: {
      name: "Intrinsic Motivation",
      description: "Driven by internal satisfaction and love of learning"
    },
    achievement: {
      name: "Achievement Motivation",
      description: "Driven by grades, recognition, and external success"
    },
    social: {
      name: "Social Motivation",
      description: "Driven by relationships and others' expectations"
    },
    future_goals: {
      name: "Future Goals Motivation",
      description: "Driven by long-term career and life aspirations"
    },
    autonomy: {
      name: "Autonomy Motivation",
      description: "Driven by independence and personal control"
    },
    competence: {
      name: "Competence Motivation",
      description: "Driven by mastery and skill development"
    }
  }
};

export const FOCUS_TYPE_RESULTS = {
  categories: {
    sustained: {
      name: "Sustained Attention",
      description: "Ability to maintain focus over extended periods"
    },
    selective: {
      name: "Selective Attention",
      description: "Ability to filter distractions and stay on task"
    },
    divided: {
      name: "Divided Attention",
      description: "Ability to handle multiple tasks simultaneously"
    },
    alternating: {
      name: "Alternating Attention",
      description: "Ability to shift focus flexibly between tasks"
    },
    deep: {
      name: "Deep Focus (Flow)",
      description: "Ability to enter states of complete immersion"
    },
    environmental: {
      name: "Environmental Sensitivity",
      description: "How external factors affect your concentration"
    }
  }
};