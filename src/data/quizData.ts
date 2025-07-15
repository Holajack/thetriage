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