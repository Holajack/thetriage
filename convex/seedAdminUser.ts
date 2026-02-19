import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Seed admin user with Elite subscription and demo data
 * Usage: Call from Convex Dashboard with { clerkId: "user_XXXX" }
 */
export const seedAdminData = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}`);
    }

    // 1. Update user to Elite with demo profile data
    await ctx.db.patch(user._id, {
      subscriptionTier: "elite",
      subscriptionOverride: true, // Prevents RevenueCat from downgrading this account
      flintCurrency: 2840,
      university: "Stanford University",
      major: "Pre-Med Biology",
      location: "Palo Alto, CA",
      classes: "CHEM 101, BIO 201, MATH 53",
      trailBuddyType: "nora",
      trailBuddyName: "Nora",
      firstSessionBonusClaimed: true,
    });

    // 2. Update or create leaderboard stats
    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const today = new Date().toISOString().split("T")[0];

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalFocusTime: 1470,      // 24h 30m in minutes
        weeklyFocusTime: 620,       // ~10h 20m
        monthlyFocusTime: 2400,
        level: 8,
        points: 2280,
        currentStreak: 7,
        longestStreak: 14,
        sessionsCompleted: 45,
        totalSessions: 47,
        achievementsEarned: 5,
        lastSessionDate: today,
      });
    } else {
      await ctx.db.insert("leaderboardStats", {
        userId: user._id,
        totalFocusTime: 1470,
        weeklyFocusTime: 620,
        monthlyFocusTime: 2400,
        level: 8,
        points: 2280,
        currentStreak: 7,
        longestStreak: 14,
        sessionsCompleted: 45,
        totalSessions: 47,
        achievementsEarned: 5,
        lastSessionDate: today,
      });
    }

    // 3. Create demo focus sessions (past 7 days with varied types)
    await seedFocusSessions(ctx, user._id);

    // 4. Create demo achievements
    await seedAchievements(ctx, user._id);

    // 5. Create demo tasks
    await seedTasks(ctx, user._id);

    // 6. Ensure Nora onboarding/policy acceptance is complete
    const noraStatus = await ctx.db
      .query("noraOnboardingStatus")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const now = new Date().toISOString();
    if (noraStatus) {
      await ctx.db.patch(noraStatus._id, {
        completedAt: now,
        acceptedPoliciesAt: now,
        version: 1,
      });
    } else {
      await ctx.db.insert("noraOnboardingStatus", {
        userId: user._id,
        completedAt: now,
        acceptedPoliciesAt: now,
        version: 1,
      });
    }

    return {
      success: true,
      userId: user._id,
      message: "Admin data seeded successfully",
    };
  },
});

/**
 * Reset user data to clean state
 * Usage: Call from Convex Dashboard with { clerkId: "user_38xRvhbh7sf0Q4vsMOgWvtiBojw" }
 */
export const resetUserData = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}`);
    }

    // Delete all focus sessions
    const sessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    // Delete all achievements
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const a of achievements) {
      await ctx.db.delete(a._id);
    }

    // Delete all tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const t of tasks) {
      await ctx.db.delete(t._id);
    }

    // Reset leaderboard stats
    const stats = await ctx.db
      .query("leaderboardStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalFocusTime: 0,
        weeklyFocusTime: 0,
        monthlyFocusTime: 0,
        level: 1,
        points: 0,
        currentStreak: 0,
        longestStreak: 0,
        sessionsCompleted: 0,
        totalSessions: 0,
        achievementsEarned: 0,
        lastSessionDate: undefined,
      });
    }

    // Reset user flint and bonus
    await ctx.db.patch(user._id, {
      flintCurrency: 0,
      firstSessionBonusClaimed: false,
    });

    return {
      success: true,
      userId: user._id,
      message: "User data reset to clean state",
    };
  },
});

/**
 * Seed fake friends for screenshot purposes
 * Creates realistic users with varied stats for leaderboard competition
 * Usage: Call from Convex Dashboard with { adminClerkId: "user_XXXX" }
 */
export const seedFakeFriends = mutation({
  args: { adminClerkId: v.string() },
  handler: async (ctx, args) => {
    // Find admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.adminClerkId))
      .unique();

    if (!adminUser) {
      throw new Error(`Admin user not found with Clerk ID: ${args.adminClerkId}`);
    }

    // Realistic friend data (non-AI looking names)
    const fakeFriends = [
      { firstName: "Marcus", lastName: "Chen", username: "mchen_study", email: "marcus.c@demo.thetriage.app" },
      { firstName: "Sofia", lastName: "Rodriguez", username: "sofi_r", email: "sofia.r@demo.thetriage.app" },
      { firstName: "James", lastName: "Okonkwo", username: "jamesO", email: "james.o@demo.thetriage.app" },
      { firstName: "Emma", lastName: "Patel", username: "emma.patel", email: "emma.p@demo.thetriage.app" },
      { firstName: "Lucas", lastName: "Kim", username: "lucask22", email: "lucas.k@demo.thetriage.app" },
      { firstName: "Ava", lastName: "Thompson", username: "avathompson", email: "ava.t@demo.thetriage.app" },
      { firstName: "Noah", lastName: "Martinez", username: "noahm", email: "noah.m@demo.thetriage.app" },
    ];

    // Varied stats to create competition (admin at 2280 points is #3)
    const friendStats = [
      { points: 3120, level: 10, streak: 12, weeklyTime: 840, totalTime: 2100, sessions: 62 },  // #1
      { points: 2680, level: 9, streak: 9, weeklyTime: 720, totalTime: 1800, sessions: 54 },   // #2
      { points: 1920, level: 7, streak: 5, weeklyTime: 480, totalTime: 1200, sessions: 38 },   // #4
      { points: 1540, level: 6, streak: 3, weeklyTime: 360, totalTime: 900, sessions: 28 },    // #5
      { points: 980, level: 4, streak: 2, weeklyTime: 180, totalTime: 540, sessions: 16 },     // #6
      { points: 420, level: 2, streak: 0, weeklyTime: 60, totalTime: 180, sessions: 6 },       // #7
      { points: 180, level: 1, streak: 1, weeklyTime: 30, totalTime: 60, sessions: 2 },        // #8
    ];

    const today = new Date().toISOString().split("T")[0];
    const createdFriendIds: Id<"users">[] = [];

    for (let i = 0; i < fakeFriends.length; i++) {
      const friend = fakeFriends[i];
      const stats = friendStats[i];

      // Check if this demo friend already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", `demo_friend_${i + 1}`))
        .unique();

      let userId: Id<"users">;

      if (existingUser) {
        userId = existingUser._id;
        // Update existing user
        await ctx.db.patch(userId, {
          fullName: `${friend.firstName} ${friend.lastName}`,
          username: friend.username,
          subscriptionTier: i < 2 ? "elite" : i < 4 ? "pro" : "free",
        });
      } else {
        // Create new fake user
        userId = await ctx.db.insert("users", {
          clerkId: `demo_friend_${i + 1}`,
          email: friend.email,
          username: friend.username,
          fullName: `${friend.firstName} ${friend.lastName}`,
          status: "active",
          subscriptionTier: i < 2 ? "elite" : i < 4 ? "pro" : "free",
          flintCurrency: Math.floor(Math.random() * 1000) + 100,
        });
      }

      // Update or create leaderboard stats
      const existingStats = await ctx.db
        .query("leaderboardStats")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      if (existingStats) {
        await ctx.db.patch(existingStats._id, {
          points: stats.points,
          level: stats.level,
          currentStreak: stats.streak,
          longestStreak: stats.streak + Math.floor(Math.random() * 5),
          weeklyFocusTime: stats.weeklyTime,
          monthlyFocusTime: stats.weeklyTime * 3,
          totalFocusTime: stats.totalTime,
          sessionsCompleted: stats.sessions,
          totalSessions: stats.sessions + Math.floor(Math.random() * 3),
          achievementsEarned: Math.floor(stats.level / 2),
          lastSessionDate: today,
        });
      } else {
        await ctx.db.insert("leaderboardStats", {
          userId,
          points: stats.points,
          level: stats.level,
          currentStreak: stats.streak,
          longestStreak: stats.streak + Math.floor(Math.random() * 5),
          weeklyFocusTime: stats.weeklyTime,
          monthlyFocusTime: stats.weeklyTime * 3,
          totalFocusTime: stats.totalTime,
          sessionsCompleted: stats.sessions,
          totalSessions: stats.sessions + Math.floor(Math.random() * 3),
          achievementsEarned: Math.floor(stats.level / 2),
          lastSessionDate: today,
        });
      }

      // Check if friendship already exists
      const existingFriendship = await ctx.db
        .query("friends")
        .withIndex("by_userId", (q) => q.eq("userId", adminUser._id))
        .filter((q) => q.eq(q.field("friendId"), userId))
        .unique();

      if (!existingFriendship) {
        // Create bidirectional friendship
        await ctx.db.insert("friends", { userId: adminUser._id, friendId: userId });
        await ctx.db.insert("friends", { userId, friendId: adminUser._id });
      }

      createdFriendIds.push(userId);
    }

    return {
      success: true,
      friendsCreated: createdFriendIds.length,
      message: `Created/updated ${createdFriendIds.length} fake friends with leaderboard data`,
    };
  },
});

/**
 * Clean up fake friends (removes demo users and their data)
 * Usage: Call from Convex Dashboard with no args
 */
export const cleanupFakeFriends = mutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;

    for (let i = 1; i <= 10; i++) {
      const demoUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", `demo_friend_${i}`))
        .unique();

      if (demoUser) {
        // Delete friendships
        const friendships = await ctx.db
          .query("friends")
          .withIndex("by_userId", (q) => q.eq("userId", demoUser._id))
          .collect();
        for (const f of friendships) {
          await ctx.db.delete(f._id);
        }

        const reverseFriendships = await ctx.db
          .query("friends")
          .withIndex("by_friendId", (q) => q.eq("friendId", demoUser._id))
          .collect();
        for (const f of reverseFriendships) {
          await ctx.db.delete(f._id);
        }

        // Delete leaderboard stats
        const stats = await ctx.db
          .query("leaderboardStats")
          .withIndex("by_userId", (q) => q.eq("userId", demoUser._id))
          .unique();
        if (stats) {
          await ctx.db.delete(stats._id);
        }

        // Delete the user
        await ctx.db.delete(demoUser._id);
        deleted++;
      }
    }

    return { success: true, deleted, message: `Cleaned up ${deleted} demo friends` };
  },
});

// Helper function to seed focus sessions
async function seedFocusSessions(ctx: any, userId: Id<"users">) {
  // Define sessions for past 7 days with varied types
  const sessionTemplates = [
    // Today (day 0)
    { daysAgo: 0, duration: 90, type: "deep_work", subject: "Chemistry", hour: 9 },
    { daysAgo: 0, duration: 45, type: "balanced", subject: "Biology", hour: 14 },
    { daysAgo: 0, duration: 25, type: "sprint", subject: "Math", hour: 16 },
    // Yesterday (day 1)
    { daysAgo: 1, duration: 90, type: "deep_work", subject: "Chemistry", hour: 10 },
    { daysAgo: 1, duration: 45, type: "balanced", subject: "English", hour: 15 },
    // 2 days ago
    { daysAgo: 2, duration: 60, type: "balanced", subject: "Biology", hour: 11 },
    { daysAgo: 2, duration: 25, type: "sprint", subject: "History", hour: 14 },
    { daysAgo: 2, duration: 45, type: "balanced", subject: "Math", hour: 17 },
    // 3 days ago
    { daysAgo: 3, duration: 90, type: "deep_work", subject: "Chemistry", hour: 9 },
    { daysAgo: 3, duration: 25, type: "sprint", subject: "Biology", hour: 16 },
    // 4 days ago
    { daysAgo: 4, duration: 45, type: "balanced", subject: "English", hour: 10 },
    { daysAgo: 4, duration: 45, type: "balanced", subject: "Math", hour: 14 },
    { daysAgo: 4, duration: 25, type: "sprint", subject: "History", hour: 17 },
    // 5 days ago
    { daysAgo: 5, duration: 90, type: "deep_work", subject: "Chemistry", hour: 9 },
    { daysAgo: 5, duration: 45, type: "balanced", subject: "Biology", hour: 15 },
    // 6 days ago
    { daysAgo: 6, duration: 60, type: "balanced", subject: "Math", hour: 11 },
    { daysAgo: 6, duration: 25, type: "sprint", subject: "English", hour: 16 },
  ];

  for (const template of sessionTemplates) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - template.daysAgo);
    startDate.setHours(template.hour, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + template.duration);

    await ctx.db.insert("focusSessions", {
      userId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      durationSeconds: template.duration * 60,
      sessionType: template.type,
      status: "completed",
      subject: template.subject,
    });
  }
}

// Helper function to seed achievements
async function seedAchievements(ctx: any, userId: Id<"users">) {
  const achievements = [
    {
      type: "first_session",
      title: "First Steps",
      desc: "Completed your first focus session",
      icon: "footsteps",
      points: 10,
      daysAgo: 30,
    },
    {
      type: "week_warrior",
      title: "Week Warrior",
      desc: "Studied every day for a week",
      icon: "shield",
      points: 50,
      daysAgo: 7,
    },
    {
      type: "streak_7",
      title: "7 Day Streak",
      desc: "Maintained a 7-day study streak",
      icon: "flame",
      points: 100,
      daysAgo: 0,
    },
    {
      type: "deep_focus",
      title: "Deep Focus Master",
      desc: "Completed 10 deep work sessions",
      icon: "brain",
      points: 75,
      daysAgo: 14,
    },
    {
      type: "early_bird",
      title: "Early Bird",
      desc: "Started a session before 7am",
      icon: "sunny",
      points: 25,
      daysAgo: 21,
    },
  ];

  for (const ach of achievements) {
    const earnedDate = new Date();
    earnedDate.setDate(earnedDate.getDate() - ach.daysAgo);

    await ctx.db.insert("achievements", {
      userId,
      achievementType: ach.type,
      title: ach.title,
      description: ach.desc,
      icon: ach.icon,
      pointsAwarded: ach.points,
      earnedAt: earnedDate.toISOString(),
    });
  }
}

/**
 * Seed fake messages for screenshot demos
 * Creates realistic conversations between admin and fake friends
 * Usage: Call from Convex Dashboard with { adminClerkId: "user_XXXX" }
 */
export const seedFakeMessages = mutation({
  args: { adminClerkId: v.string() },
  handler: async (ctx, args) => {
    // Find admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.adminClerkId))
      .unique();

    if (!adminUser) {
      throw new Error(`Admin user not found with Clerk ID: ${args.adminClerkId}`);
    }

    // Get existing fake friends
    const friends: Array<{ _id: Id<"users">; fullName?: string }> = [];
    for (let i = 1; i <= 7; i++) {
      const friend = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", `demo_friend_${i}`))
        .unique();
      if (friend) friends.push(friend);
    }

    if (friends.length === 0) {
      throw new Error("No fake friends found. Run seedFakeFriends first.");
    }

    // Define realistic conversations
    const conversations = [
      {
        friendIndex: 0, // Marcus Chen
        messages: [
          { fromFriend: true, content: "Hey! Ready for the study session?", hoursAgo: 4, isRead: true },
          { fromFriend: false, content: "Yes! Let me grab my notes", hoursAgo: 3.9, isRead: true },
          { fromFriend: true, content: "Cool, I'll start the room. Join when ready!", hoursAgo: 3.8, isRead: true },
          { fromFriend: false, content: "Just joined. This calculus chapter is rough 😅", hoursAgo: 3.5, isRead: true },
          { fromFriend: true, content: "We got this! 45 min sprint then break?", hoursAgo: 3.4, isRead: true },
        ],
      },
      {
        friendIndex: 1, // Sofia Rodriguez
        messages: [
          { fromFriend: true, content: "Did you finish the calc homework?", hoursAgo: 48, isRead: true },
          { fromFriend: false, content: "Almost done! Problem 5 is tricky", hoursAgo: 47, isRead: true },
          { fromFriend: true, content: "I can help if you want to study together", hoursAgo: 46, isRead: true },
          { fromFriend: false, content: "That would be great, thanks!", hoursAgo: 45, isRead: true },
          { fromFriend: true, content: "Want to start a session tomorrow at 2pm?", hoursAgo: 2, isRead: false },
          { fromFriend: true, content: "I found some good practice problems we can work through", hoursAgo: 1.5, isRead: false },
        ],
      },
      {
        friendIndex: 2, // James Okonkwo
        messages: [
          { fromFriend: true, content: "Great session today! 🔥", hoursAgo: 8, isRead: true },
          { fromFriend: false, content: "Thanks! Your streak is impressive", hoursAgo: 7.5, isRead: true },
          { fromFriend: true, content: "Consistency is key 💪", hoursAgo: 7, isRead: true },
          { fromFriend: false, content: "How do you stay motivated?", hoursAgo: 6.5, isRead: true },
          { fromFriend: true, content: "I set small goals each day. Start with just 25min if needed", hoursAgo: 6, isRead: true },
          { fromFriend: true, content: "Also this app helps a lot haha", hoursAgo: 1, isRead: false },
        ],
      },
      {
        friendIndex: 3, // Emma Patel
        messages: [
          { fromFriend: true, content: "Are you taking CHEM 101 too?", hoursAgo: 72, isRead: true },
          { fromFriend: false, content: "Yes! The midterm is coming up fast", hoursAgo: 70, isRead: true },
          { fromFriend: true, content: "Wanna form a study group?", hoursAgo: 68, isRead: true },
          { fromFriend: false, content: "Definitely! I could use the accountability", hoursAgo: 66, isRead: true },
        ],
      },
      {
        friendIndex: 4, // Lucas Kim
        messages: [
          { fromFriend: true, content: "Just hit level 5! 🎉", hoursAgo: 24, isRead: true },
          { fromFriend: false, content: "Nice! Congrats!", hoursAgo: 23, isRead: true },
          { fromFriend: true, content: "Thanks, trying to catch up to you on the leaderboard", hoursAgo: 22, isRead: true },
        ],
      },
    ];

    let messagesCreated = 0;

    for (const conv of conversations) {
      const friend = friends[conv.friendIndex];
      if (!friend) continue;

      for (const msg of conv.messages) {
        await ctx.db.insert("messages", {
          senderId: msg.fromFriend ? friend._id : adminUser._id,
          recipientId: msg.fromFriend ? adminUser._id : friend._id,
          content: msg.content,
          messageType: "text",
          isRead: msg.isRead,
        });
        messagesCreated++;
      }
    }

    return {
      success: true,
      messagesCreated,
      message: `Created ${messagesCreated} demo messages across ${conversations.length} conversations`,
    };
  },
});

/**
 * Seed fake study rooms for screenshot demos
 * Creates active study rooms with participants and chat
 * Usage: Call from Convex Dashboard with { adminClerkId: "user_XXXX" }
 */
export const seedFakeStudyRooms = mutation({
  args: { adminClerkId: v.string() },
  handler: async (ctx, args) => {
    // Find admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.adminClerkId))
      .unique();

    if (!adminUser) {
      throw new Error(`Admin user not found with Clerk ID: ${args.adminClerkId}`);
    }

    // Get some fake friends
    const marcus = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", "demo_friend_1"))
      .unique();
    const sofia = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", "demo_friend_2"))
      .unique();
    const emma = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", "demo_friend_4"))
      .unique();

    if (!marcus || !sofia) {
      throw new Error("Required fake friends not found. Run seedFakeFriends first.");
    }

    const now = new Date().toISOString();
    const roomsCreated: string[] = [];

    // Study Room 1: Active calculus study group (Marcus as owner)
    const calcRoomId = await ctx.db.insert("studyRooms", {
      name: "Calculus Study Group",
      description: "Working through Chapter 5 derivatives",
      ownerId: marcus._id,
      isPublic: true,
      maxParticipants: 8,
      currentParticipants: 3,
      roomCode: "CALC42",
      subject: "Mathematics",
      sessionDuration: 45,
      breakDuration: 10,
      isActive: true,
    });
    roomsCreated.push("CALC42");

    // Add participants to calc room
    const calcParticipants = [
      { user: marcus, role: "owner" },
      { user: adminUser, role: "participant" },
      { user: sofia, role: "participant" },
    ];

    for (const p of calcParticipants) {
      await ctx.db.insert("studyRoomParticipants", {
        roomId: calcRoomId,
        userId: p.user._id,
        joinedAt: now,
        isActive: true,
        role: p.role,
      });
    }

    // Add chat messages to calc room
    const calcMessages = [
      { sender: marcus, content: "Welcome everyone! Let's focus on derivatives today", type: "text" },
      { sender: adminUser, content: "Sounds good! I'm on problem 3", type: "text" },
      { sender: sofia, content: "Can someone explain the chain rule again?", type: "text" },
      { sender: marcus, content: "Sure! It's d/dx[f(g(x))] = f'(g(x)) · g'(x)", type: "text" },
      { sender: sofia, content: "That makes more sense now, thanks!", type: "text" },
      { sender: adminUser, content: "15 min left in this sprint!", type: "text" },
    ];

    for (const msg of calcMessages) {
      await ctx.db.insert("studyRoomMessages", {
        roomId: calcRoomId,
        senderId: msg.sender._id,
        content: msg.content,
        messageType: msg.type,
      });
    }

    // Study Room 2: Chemistry review session (admin as owner)
    const chemRoomId = await ctx.db.insert("studyRooms", {
      name: "Chem 101 Midterm Prep",
      description: "Review session for organic chemistry midterm",
      ownerId: adminUser._id,
      isPublic: false,
      maxParticipants: 6,
      currentParticipants: 2,
      roomCode: "CHEM99",
      subject: "Chemistry",
      sessionDuration: 90,
      breakDuration: 15,
      isActive: true,
    });
    roomsCreated.push("CHEM99");

    // Add participants to chem room
    const chemParticipants = [
      { user: adminUser, role: "owner" },
      { user: emma || sofia, role: "participant" },
    ];

    for (const p of chemParticipants) {
      await ctx.db.insert("studyRoomParticipants", {
        roomId: chemRoomId,
        userId: p.user._id,
        joinedAt: now,
        isActive: true,
        role: p.role,
      });
    }

    // Add chat messages to chem room
    const chemMessages = [
      { sender: adminUser, content: "Let's review reaction mechanisms first", type: "text" },
      { sender: emma || sofia, content: "Good idea. SN1 vs SN2 always confuses me", type: "text" },
      { sender: adminUser, content: "Me too. Let's make some flashcards for those", type: "text" },
    ];

    for (const msg of chemMessages) {
      await ctx.db.insert("studyRoomMessages", {
        roomId: chemRoomId,
        senderId: msg.sender._id,
        content: msg.content,
        messageType: msg.type,
      });
    }

    return {
      success: true,
      roomsCreated: roomsCreated.length,
      roomCodes: roomsCreated,
      message: `Created ${roomsCreated.length} demo study rooms with participants and chat`,
    };
  },
});

/**
 * Clean up all demo data (messages, rooms) for fresh screenshots
 * Usage: Call from Convex Dashboard with { adminClerkId: "user_XXXX" }
 */
export const cleanupDemoData = mutation({
  args: { adminClerkId: v.string() },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.adminClerkId))
      .unique();

    if (!adminUser) {
      throw new Error(`Admin user not found`);
    }

    let deleted = { messages: 0, rooms: 0, participants: 0, roomMessages: 0 };

    // Delete messages involving admin
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", adminUser._id))
      .collect();
    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", adminUser._id))
      .collect();

    for (const m of [...sentMessages, ...receivedMessages]) {
      await ctx.db.delete(m._id);
      deleted.messages++;
    }

    // Delete study rooms owned by admin or demo friends
    const adminRooms = await ctx.db
      .query("studyRooms")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", adminUser._id))
      .collect();

    for (const room of adminRooms) {
      // Delete room messages
      const roomMsgs = await ctx.db
        .query("studyRoomMessages")
        .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
        .collect();
      for (const m of roomMsgs) {
        await ctx.db.delete(m._id);
        deleted.roomMessages++;
      }

      // Delete participants
      const participants = await ctx.db
        .query("studyRoomParticipants")
        .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
        .collect();
      for (const p of participants) {
        await ctx.db.delete(p._id);
        deleted.participants++;
      }

      await ctx.db.delete(room._id);
      deleted.rooms++;
    }

    // Also clean rooms by demo friends
    for (let i = 1; i <= 7; i++) {
      const demoFriend = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", `demo_friend_${i}`))
        .unique();

      if (demoFriend) {
        const friendRooms = await ctx.db
          .query("studyRooms")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", demoFriend._id))
          .collect();

        for (const room of friendRooms) {
          const roomMsgs = await ctx.db
            .query("studyRoomMessages")
            .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
            .collect();
          for (const m of roomMsgs) {
            await ctx.db.delete(m._id);
            deleted.roomMessages++;
          }

          const participants = await ctx.db
            .query("studyRoomParticipants")
            .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
            .collect();
          for (const p of participants) {
            await ctx.db.delete(p._id);
            deleted.participants++;
          }

          await ctx.db.delete(room._id);
          deleted.rooms++;
        }
      }
    }

    return {
      success: true,
      deleted,
      message: `Cleaned up demo data`,
    };
  },
});

// Helper function to seed tasks
async function seedTasks(ctx: any, userId: Id<"users">) {
  const tasks = [
    {
      title: "Chapter 5: Organic Chemistry",
      description: "Review reaction mechanisms and practice problems",
      status: "in_progress",
      priority: "high",
      category: "Chemistry",
      estimatedMinutes: 90,
    },
    {
      title: "Bio Lab Report",
      description: "Write up cell culture experiment results",
      status: "pending",
      priority: "medium",
      category: "Biology",
      estimatedMinutes: 60,
    },
    {
      title: "Math Problem Set 4",
      description: "Differential equations - chapters 4-5",
      status: "completed",
      priority: "high",
      category: "Math",
      estimatedMinutes: 45,
    },
    {
      title: "Read Chapter 12",
      description: "Cell signaling pathways",
      status: "completed",
      priority: "medium",
      category: "Biology",
      estimatedMinutes: 30,
    },
    {
      title: "Practice Quiz",
      description: "Organic chemistry review questions",
      status: "completed",
      priority: "low",
      category: "Chemistry",
      estimatedMinutes: 25,
    },
  ];

  for (const task of tasks) {
    await ctx.db.insert("tasks", {
      userId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      estimatedMinutes: task.estimatedMinutes,
    });
  }
}
