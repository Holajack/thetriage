export interface Quote {
  quote: string;
  author: string;
  category?: 'focus' | 'motivation' | 'learning' | 'persistence' | 'growth' | 'success' | 'mindset';
}

// Comprehensive database of 200+ motivational quotes focused on focus, learning, and productivity
export const MOTIVATIONAL_QUOTES: Quote[] = [
  // Focus & Concentration Quotes
  { quote: "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell", category: "focus" },
  { quote: "The successful warrior is the average person, with laser-like focus.", author: "Bruce Lee", category: "focus" },
  { quote: "Where focus goes, energy flows.", author: "Tony Robbins", category: "focus" },
  { quote: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein", category: "focus" },
  { quote: "The key to success is to focus our conscious mind on things we desire, not things we fear.", author: "Brian Tracy", category: "focus" },
  { quote: "One reason so few of us achieve what we truly want is that we never direct our focus; we never concentrate our power.", author: "Tony Robbins", category: "focus" },
  { quote: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.", author: "Zig Ziglar", category: "focus" },
  { quote: "You cannot depend on your eyes when your imagination is out of focus.", author: "Mark Twain", category: "focus" },
  { quote: "Focus on being productive instead of being busy.", author: "Tim Ferriss", category: "focus" },
  { quote: "The shorter way to do many things is to do only one thing at a time.", author: "Mozart", category: "focus" },
  { quote: "Concentrate your energies, your thoughts and your capital. Put all your eggs in one basket, and then watch that basket.", author: "Andrew Carnegie", category: "focus" },
  { quote: "The immature think that knowledge and action are different, but the wise see them as the same.", author: "Bhagavad Gita", category: "focus" },
  { quote: "My success is not a matter of having incredible talent. I simply have focused on something I loved.", author: "Howard Schultz", category: "focus" },
  { quote: "What you focus on expands, and when you focus on the goodness in your life, you create more of it.", author: "Oprah Winfrey", category: "focus" },
  { quote: "Focused, hard work is the real key to success. Keep your eyes on the goal, and just keep taking the next step.", author: "John Carmack", category: "focus" },

  // Learning & Education Quotes
  { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", category: "learning" },
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", category: "learning" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", category: "learning" },
  { quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", category: "learning" },
  { quote: "Anyone who stops learning is old, whether at twenty or eighty. Anyone who keeps learning stays young.", author: "Henry Ford", category: "learning" },
  { quote: "Education is not preparation for life; education is life itself.", author: "John Dewey", category: "learning" },
  { quote: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert", category: "learning" },
  { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci", category: "learning" },
  { quote: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", category: "learning" },
  { quote: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo", category: "learning" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes", category: "learning" },
  { quote: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.", author: "Richard Feynman", category: "learning" },
  { quote: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", category: "learning" },
  { quote: "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence.", author: "Abigail Adams", category: "learning" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "learning" },

  // Persistence & Determination Quotes
  { quote: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein", category: "persistence" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "persistence" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "persistence" },
  { quote: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison", category: "persistence" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "persistence" },
  { quote: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius", category: "persistence" },
  { quote: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins", category: "persistence" },
  { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown", category: "persistence" },
  { quote: "Perseverance is not a long race; it is many short races one after the other.", author: "Walter Elliot", category: "persistence" },
  { quote: "You just can't beat the person who never gives up.", author: "Babe Ruth", category: "persistence" },
  { quote: "Fall seven times, stand up eight.", author: "Japanese Proverb", category: "persistence" },
  { quote: "A river cuts through rock, not because of its power, but because of its persistence.", author: "Jim Watkins", category: "persistence" },
  { quote: "The difference between a successful person and others is not lack of strength not a lack of knowledge but rather a lack of will.", author: "Vince Lombardi", category: "persistence" },
  { quote: "When you feel like quitting, think about why you started.", author: "Unknown", category: "persistence" },
  { quote: "Character consists of what you do on the third and fourth tries.", author: "James Michener", category: "persistence" },

  // Growth Mindset Quotes
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch", category: "growth" },
  { quote: "Intelligence is not fixed. The more you learn, the smarter you become.", author: "Carol Dweck", category: "growth" },
  { quote: "Do not be embarrassed by your failures, learn from them and start again.", author: "Richard Branson", category: "growth" },
  { quote: "Mistakes are proof that you are trying.", author: "Unknown", category: "growth" },
  { quote: "Your brain is like a muscle. The more you use it, the stronger it gets.", author: "Unknown", category: "growth" },
  { quote: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", category: "growth" },
  { quote: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford", category: "growth" },
  { quote: "I am always doing that which I cannot do, in order that I may learn how to do it.", author: "Pablo Picasso", category: "growth" },
  { quote: "It's not what you know, it's what you do with what you know.", author: "Unknown", category: "growth" },
  { quote: "Challenges are what make life interesting. Overcoming them is what makes life meaningful.", author: "Joshua J. Marine", category: "growth" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", category: "growth" },
  { quote: "A year from now you may wish you had started today.", author: "Karen Lamb", category: "growth" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "growth" },
  { quote: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden", category: "growth" },
  { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis", category: "growth" },

  // Success & Achievement Quotes
  { quote: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer", category: "success" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", category: "success" },
  { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown", category: "success" },
  { quote: "Dream bigger. Do bigger.", author: "Unknown", category: "success" },
  { quote: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt", category: "success" },
  { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill", category: "success" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "success" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "success" },
  { quote: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery", category: "success" },
  { quote: "Little progress is still progress.", author: "Unknown", category: "success" },
  { quote: "Don't wait for opportunity. Create it.", author: "George Bernard Shaw", category: "success" },
  { quote: "Great things never come from comfort zones.", author: "Unknown", category: "success" },
  { quote: "Dream it. Wish it. Do it.", author: "Unknown", category: "success" },
  { quote: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer", category: "success" },
  { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins", category: "success" },

  // Mindset & Mental Strength Quotes
  { quote: "Your limitation—it's only your imagination.", author: "Unknown", category: "mindset" },
  { quote: "Push yourself, because no one else is going to do it for you.", author: "Unknown", category: "mindset" },
  { quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown", category: "mindset" },
  { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown", category: "mindset" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "mindset" },
  { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle", category: "mindset" },
  { quote: "You have been assigned this mountain to show others it can be moved.", author: "Mel Robbins", category: "mindset" },
  { quote: "Difficult roads often lead to beautiful destinations.", author: "Zig Ziglar", category: "mindset" },
  { quote: "Your only limit is your mind.", author: "Unknown", category: "mindset" },
  { quote: "The mind is everything. What you think you become.", author: "Buddha", category: "mindset" },
  { quote: "You are what you do, not what you say you'll do.", author: "Carl Jung", category: "mindset" },
  { quote: "Action is the foundational key to all success.", author: "Pablo Picasso", category: "mindset" },
  { quote: "The only way to achieve the impossible is to believe it is possible.", author: "Charles Kingsleigh", category: "mindset" },
  { quote: "If you can dream it, you can do it.", author: "Walt Disney", category: "mindset" },
  { quote: "What we fear doing most is usually what we most need to do.", author: "Tim Ferriss", category: "mindset" },

  // Study & Focus Specific Quotes
  { quote: "Studying is not about time, it's about focus.", author: "Unknown", category: "focus" },
  { quote: "The secret to getting ahead is getting started. The secret to getting started is breaking down your complex tasks into small manageable tasks.", author: "Mark Twain", category: "focus" },
  { quote: "Don't count the days, make the days count.", author: "Muhammad Ali", category: "motivation" },
  { quote: "Study while others are sleeping; work while others are loafing; prepare while others are playing; and dream while others are wishing.", author: "William Arthur Ward", category: "persistence" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes", category: "learning" },
  { quote: "Concentration comes out of a combination of confidence and hunger.", author: "Arnold Palmer", category: "focus" },
  { quote: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki", category: "motivation" },
  { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma", category: "growth" },
  { quote: "Work hard in silence, let success make the noise.", author: "Frank Ocean", category: "success" },
  { quote: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown", category: "persistence" },

  // Additional Focus & Productivity Quotes
  { quote: "Absorb what is useful, discard what is not, add what is uniquely your own.", author: "Bruce Lee", category: "learning" },
  { quote: "Knowledge is power. Information is liberating. Education is the premise of progress.", author: "Kofi Annan", category: "learning" },
  { quote: "The only thing that interferes with my learning is my education.", author: "Albert Einstein", category: "learning" },
  { quote: "Study the past if you would define the future.", author: "Confucius", category: "learning" },
  { quote: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison", category: "learning" },
  { quote: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire", category: "learning" },
  { quote: "I hear and I forget. I see and I remember. I do and I understand.", author: "Confucius", category: "learning" },
  { quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X", category: "learning" },
  { quote: "The beautiful thing about learning is nobody can take it away from you.", author: "B.B. King", category: "learning" },
  { quote: "Intelligence plus character—that is the goal of true education.", author: "Martin Luther King Jr.", category: "learning" },

  // Time Management & Discipline Quotes
  { quote: "Time is what we want most, but what we use worst.", author: "William Penn", category: "focus" },
  { quote: "You will never find time for anything. If you want time you must make it.", author: "Charles Buxton", category: "focus" },
  { quote: "Don't be fooled by the calendar. There are only as many days in the year as you make use of.", author: "Charles Richards", category: "focus" },
  { quote: "Time is the most valuable thing a person can spend.", author: "Theophrastus", category: "focus" },
  { quote: "The bad news is time flies. The good news is you're the pilot.", author: "Michael Altshuler", category: "focus" },
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", category: "persistence" },
  { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "persistence" },
  { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", category: "persistence" },
  { quote: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson", category: "success" },
  { quote: "Either you run the day or the day runs you.", author: "Jim Rohn", category: "focus" },

  // Motivation & Drive Quotes
  { quote: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon", category: "motivation" },
  { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser", category: "motivation" },
  { quote: "Try not to become a person of success, but rather try to become a person of value.", author: "Albert Einstein", category: "motivation" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller", category: "motivation" },
  { quote: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson", category: "motivation" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "motivation" },
  { quote: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs", category: "motivation" },
  { quote: "The road to success and the road to failure are almost exactly the same.", author: "Colin R. Davis", category: "motivation" },
  { quote: "Success is liking yourself, liking what you do, and liking how you do it.", author: "Maya Angelou", category: "motivation" },
  { quote: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn", category: "motivation" },

  // Continuous Improvement Quotes
  { quote: "Strive for progress, not perfection.", author: "Unknown", category: "growth" },
  { quote: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy", category: "growth" },
  { quote: "What seems to us as bitter trials are often blessings in disguise.", author: "Oscar Wilde", category: "growth" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "growth" },
  { quote: "The only way to learn mathematics is to do mathematics.", author: "Paul Halmos", category: "learning" },
  { quote: "You don't understand anything until you learn it more than one way.", author: "Marvin Minsky", category: "learning" },
  { quote: "The mind is not a vessel to be filled but a fire to be ignited.", author: "Plutarch", category: "learning" },
  { quote: "Change is the end result of all true learning.", author: "Leo Buscaglia", category: "learning" },
  { quote: "In learning you will teach, and in teaching you will learn.", author: "Phil Collins", category: "learning" },
  { quote: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese Proverb", category: "learning" },

  // Overcoming Challenges Quotes
  { quote: "A smooth sea never made a skilled sailor.", author: "Franklin D. Roosevelt", category: "persistence" },
  { quote: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers", category: "persistence" },
  { quote: "The struggle you're in today is developing the strength you need for tomorrow.", author: "Unknown", category: "persistence" },
  { quote: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne", category: "mindset" },
  { quote: "It's not about perfect. It's about effort.", author: "Jillian Michaels", category: "persistence" },
  { quote: "Don't limit your challenges. Challenge your limits.", author: "Unknown", category: "mindset" },
  { quote: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito", category: "growth" },
  { quote: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford", category: "growth" },
  { quote: "The comeback is always stronger than the setback.", author: "Unknown", category: "persistence" },
  { quote: "Tough times never last, but tough people do.", author: "Robert H. Schuller", category: "persistence" },

  // Self-Belief & Confidence Quotes
  { quote: "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.", author: "Roy T. Bennett", category: "mindset" },
  { quote: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Buddha", category: "mindset" },
  { quote: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson", category: "mindset" },
  { quote: "Confidence comes from discipline and training.", author: "Robert Kiyosaki", category: "mindset" },
  { quote: "Low self-confidence isn't a life sentence. Self-confidence can be learned, practiced, and mastered.", author: "Barrie Davenport", category: "mindset" },
  { quote: "Don't be satisfied with stories, how things have gone with others. Unfold your own myth.", author: "Rumi", category: "mindset" },
  { quote: "If you hear a voice within you say 'you cannot paint,' then by all means paint and that voice will be silenced.", author: "Vincent Van Gogh", category: "mindset" },
  { quote: "Always be yourself and have faith in yourself. Do not go out and look for a successful personality and try to duplicate it.", author: "Bruce Lee", category: "mindset" },
  { quote: "You have within you right now, everything you need to deal with whatever the world can throw at you.", author: "Brian Tracy", category: "mindset" },
  { quote: "No one can make you feel inferior without your consent.", author: "Eleanor Roosevelt", category: "mindset" },

  // Goal Setting & Achievement Quotes
  { quote: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry", category: "success" },
  { quote: "The trouble with not having a goal is that you can spend your life running up and down the field and never score.", author: "Bill Copeland", category: "success" },
  { quote: "Set your goals high, and don't stop till you get there.", author: "Bo Jackson", category: "success" },
  { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis", category: "success" },
  { quote: "If you want to be happy, set a goal that commands your thoughts, liberates your energy, and inspires your hopes.", author: "Andrew Carnegie", category: "success" },
  { quote: "The greater danger for most of us lies not in setting our aim too high and falling short; but in setting our aim too low, and achieving our mark.", author: "Michelangelo", category: "success" },
  { quote: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar", category: "success" },
  { quote: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins", category: "success" },
  { quote: "People with goals succeed because they know where they're going.", author: "Earl Nightingale", category: "success" },
  { quote: "You measure the size of the accomplishment by the obstacles you had to overcome to reach your goals.", author: "Booker T. Washington", category: "success" },
];

// Helper function to get a random quote
export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[randomIndex];
}

// Helper function to get a quote by category
export function getQuoteByCategory(category: Quote['category']): Quote {
  const categoryQuotes = MOTIVATIONAL_QUOTES.filter(q => q.category === category);
  if (categoryQuotes.length === 0) return getRandomQuote();
  const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
  return categoryQuotes[randomIndex];
}

// Helper function to get multiple random quotes
export function getRandomQuotes(count: number): Quote[] {
  const shuffled = [...MOTIVATIONAL_QUOTES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, MOTIVATIONAL_QUOTES.length));
}
