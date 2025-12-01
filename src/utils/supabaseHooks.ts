import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // Make sure this path is correct
import { supabase } from './supabase';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date?: string;
  category?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type: string;
  content: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  description: string;
  earned_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title?: string;  // Optional since actual DB might have 'text' instead
  text?: string;   // Optional fallback for schema compatibility
  completed: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  is_current_user?: boolean;
  total_focus_time?: number;
  weekly_focus_time?: number;
  monthly_focus_time?: number;
  current_streak?: number;
  longest_streak?: number;
  total_sessions?: number;
  level?: number;
  points?: number;
  weekly_focus_goal?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  room_id?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  session_type: 'individual' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  university?: string;
  major?: string;
  classes?: string;
  timeZone?: string;
  status?: string;
  weeklyFocusGoal?: number;
  soundPreference?: string;
  focusDuration?: number;
  breakDuration?: number;
  fullNameVisibility?: string;
  universityVisibility?: string;
  locationVisibility?: string;
  classesVisibility?: string;
  subscription_tier?: 'free' | 'premium' | 'pro';
  created_at: string;
  updated_at: string;
}

export interface CommunityActivity {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  activity_type: string;
  action: string;
  time: string;
  created_at: string;
}

// Alias for backward compatibility
export type Leaderboard = LeaderboardEntry;

export const useSupabaseTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (title: string, description: string = '', priority: string = 'Medium') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // First, try to create the task with the order column
      let taskData: any = {
        user_id: session.user.id,
        title,
        description,
        priority,
        status: 'pending' as const
      };

      // Get the current maximum order for the user's tasks to set the next order
      let nextOrder = 1;
      try {
        const { data: existingTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('order')
          .eq('user_id', session.user.id)
          .order('order', { ascending: false })
          .limit(1);

        if (!fetchError && existingTasks && existingTasks.length > 0 && existingTasks[0].order) {
          nextOrder = existingTasks[0].order + 1;
        }

        // Try to include order in the task data
        taskData = { ...taskData, order: nextOrder };
      } catch (orderError) {
        console.log('Order column might not exist, proceeding without order field');
      }

      // Attempt to insert the task
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();

      if (error) {
        // If error is related to order column not existing, try without order
        if (error.message.includes('column "order"') || error.message.includes('order')) {
          console.log('Retrying task creation without order column...');
          const taskDataWithoutOrder = {
            user_id: session.user.id,
            title,
            description,
            priority,
            status: 'pending' as const
          };

          const { data: retryData, error: retryError } = await supabase
            .from('tasks')
            .insert([taskDataWithoutOrder])
            .select();

          if (retryError) throw retryError;
          if (retryData) {
            setTasks(prev => [retryData[0], ...prev]);
          }
        } else {
          throw error;
        }
      } else if (data) {
        setTasks(prev => [data[0], ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select();

      if (error) throw error;
      if (data) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...data[0] } : task
        ));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks
  };
};

export const useSupabaseInsights = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setInsights([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setInsights(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    setInsights,
    loading,
    setLoading,
    error,
    setError,
    refetch: fetchInsights
  };
};

export const useSupabaseLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLeaderboard(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setLeaderboard(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refetch: fetchLeaderboard
  };
};

export const useSupabaseLeaderboardWithFriends = () => {
  const [data, setData] = useState<{
    friendsLeaderboard: Leaderboard[];
    globalLeaderboard: Leaderboard[];
  }>({
    friendsLeaderboard: [],
    globalLeaderboard: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLeaderboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Fetch all users who have begun using the app (have leaderboard stats)
      // Show top 100 users to display everyone while maintaining performance
      const { data: globalData, error: globalError } = await supabase
        .from('leaderboard_stats')
        .select(`
          *,
          profiles!leaderboard_stats_user_id_fkey(username, full_name, avatar_url)
        `)
        .order('points', { ascending: false })
        .limit(100);

      if (globalError) {
        console.error('❌ Global leaderboard error:', globalError);
        throw globalError;
      }

      console.log(`✅ Loaded ${globalData?.length || 0} users from global leaderboard (all app users)`);

      // Fix 2: Try to get friends from user_friends table (if it exists)
      let friendsData: any[] = [];
      let friendIds: string[] = [];
      try {
        // Fetch accepted friendships in either direction
        const { data: userFriends, error: friendsError } = await supabase
          .from('user_friends')
          .select('user_id, friend_id, status')
          .or(`and(user_id.eq.${user.id},status.eq.accepted),and(friend_id.eq.${user.id},status.eq.accepted)`);

        if (!friendsError && userFriends && userFriends.length > 0) {
          friendIds = Array.from(new Set(userFriends.map(rel => rel.user_id === user.id ? rel.friend_id : rel.user_id).filter(Boolean)));
          console.log(`✅ Found ${friendIds.length} accepted friends from Supabase user_friends table`);

          if (friendIds.length > 0) {
            // Get leaderboard data for friends
            const { data: friendsLeaderboard, error: friendsLeaderboardError } = await supabase
              .from('leaderboard_stats')
              .select(`
                *,
                profiles!leaderboard_stats_user_id_fkey(username, full_name, avatar_url)
              `)
              .in('user_id', friendIds)
              .order('points', { ascending: false });

            if (!friendsLeaderboardError) {
              friendsData = friendsLeaderboard || [];
              console.log(`✅ Loaded leaderboard stats for ${friendsData.length} friends from Supabase`);
            } else {
              console.error('❌ Error loading friends leaderboard:', friendsLeaderboardError);
            }
          }
        } else {
          console.log('ℹ️ No accepted friends found in Supabase user_friends table');
        }
      } catch (friendsErr) {
        console.warn('Friends data not available (table may not exist):', friendsErr);
        // Continue without friends data
      }

      // Format the data
      const formattedGlobal = (globalData || []).map(entry => ({
        ...entry,
        is_current_user: entry.user_id === user.id,
        display_name: entry.user_id === user.id ? 'You' : (entry.profiles?.full_name || entry.profiles?.username || 'Unknown User'),
        avatar_url: entry.profiles?.avatar_url
      }));

      const formattedFriends = friendsData.map(entry => ({
        ...entry,
        is_current_user: entry.user_id === user.id,
        display_name: entry.user_id === user.id ? 'You' : (entry.profiles?.full_name || entry.profiles?.username || 'Unknown User'),
        avatar_url: entry.profiles?.avatar_url
      }));

      // Ensure we have entries for friends without leaderboard stats
      if (friendIds.length > 0) {
        const friendsWithEntries = new Set(formattedFriends.map(f => f.user_id));
        const missingFriendIds = friendIds.filter(id => !friendsWithEntries.has(id));
        if (missingFriendIds.length > 0) {
          const { data: missingProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', missingFriendIds);

          (missingProfiles || []).forEach(profile => {
            formattedFriends.push({
              id: profile.id,
              user_id: profile.id,
              total_focus_time: 0,
              weekly_focus_time: 0,
              points: 0,
              level: 1,
              current_streak: 0,
              is_current_user: profile.id === user.id,
              display_name: profile.id === user.id ? 'You' : (profile.full_name || profile.username || 'Unknown User'),
              avatar_url: profile.avatar_url,
            });
          });
        }
      }

      // Add current user to friends leaderboard if not already there
      const currentUserInFriends = formattedFriends.find(f => f.is_current_user);
      if (!currentUserInFriends) {
        const currentUserEntry = formattedGlobal.find(g => g.is_current_user);
        if (currentUserEntry) {
          formattedFriends.push(currentUserEntry);
        } else {
          // Add a placeholder entry using profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', user.id)
            .single();

          formattedFriends.push({
            id: profile?.id || user.id,
            user_id: user.id,
            total_focus_time: 0,
            weekly_focus_time: 0,
            points: 0,
            level: 1,
            current_streak: 0,
            is_current_user: true,
            display_name: (profile?.full_name || profile?.username || 'You'),
            avatar_url: profile?.avatar_url,
          });
        }
      }

      // Ensure current user exists in global leaderboard
      const currentUserInGlobal = formattedGlobal.find(g => g.is_current_user);
      if (!currentUserInGlobal) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', user.id)
          .single();

        formattedGlobal.push({
          id: profile?.id || user.id,
          user_id: user.id,
          total_focus_time: 0,
          weekly_focus_time: 0,
          points: 0,
          level: 1,
          current_streak: 0,
          is_current_user: true,
          display_name: profile?.full_name || profile?.username || 'You',
          avatar_url: profile?.avatar_url,
        });
      }

      const sortLeaderboard = (entries: Leaderboard[]) => {
        return [...entries].sort((a, b) => {
          const pointsA = a.points ?? 0;
          const pointsB = b.points ?? 0;
          if (pointsA !== pointsB) return pointsB - pointsA;
          const weeklyA = a.weekly_focus_time ?? 0;
          const weeklyB = b.weekly_focus_time ?? 0;
          if (weeklyA !== weeklyB) return weeklyB - weeklyA;
          const totalA = a.total_focus_time ?? 0;
          const totalB = b.total_focus_time ?? 0;
          return totalB - totalA;
        });
      };

      const dedupeByUser = (entries: Leaderboard[]) => {
        const map = new Map<string, Leaderboard>();
        let counter = 0;
        entries.forEach(entry => {
          const baseKey = entry.user_id || entry.id || entry.display_name;
          const key = baseKey ? String(baseKey) : `unknown-${counter++}`;
          map.set(key, entry);
        });
        return Array.from(map.values());
      };

      const friendsSorted = sortLeaderboard(dedupeByUser(formattedFriends));
      const globalSorted = sortLeaderboard(dedupeByUser(formattedGlobal));

      console.log(`📊 Leaderboard Summary:`);
      console.log(`   Friends: ${friendsSorted.length} users (from Supabase user_friends)`);
      console.log(`   Global: ${globalSorted.length} users (all app users)`);

      setData({
        friendsLeaderboard: friendsSorted,
        globalLeaderboard: globalSorted,
      });
    } catch (err: any) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message);
      setData({
        friendsLeaderboard: [],
        globalLeaderboard: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeaderboard
  };
};

export const useSupabaseAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAchievements([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', session.user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    setAchievements,
    loading,
    error,
    refetch: fetchAchievements
  };
};

export const useSupabaseSubtasks = (taskId: string) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) {
      setSubtasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSubtasks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  return {
    subtasks,
    loading,
    error,
    refetch: fetchSubtasks
  };
};

export const useSupabaseSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSubjects([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const addSubject = async (name: string, color?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          user_id: session.user.id,
          name,
          color
        }])
        .select();

      if (error) throw error;
      if (data) {
        setSubjects(prev => [data[0], ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    subjects,
    loading,
    error,
    addSubject,
    refetch: fetchSubjects
  };
};

export const useSupabaseFriends = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Use the appropriate friends table structure
      let data = [];
      
      try {
        // Try user_friends table first (most likely structure)
        const { data: userFriendsData, error: userFriendsError } = await supabase
          .from('user_friends')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false });

        if (!userFriendsError && userFriendsData) {
          data = userFriendsData;
        } else {
          throw new Error('user_friends table not available');
        }
      } catch (userFriendsError) {
        try {
          // Try friends table with status column
          const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false });
          
          if (!friendsError && friendsData) {
            data = friendsData;
          } else {
            throw new Error('friends table with status not available');
          }
        } catch (friendsWithStatusError) {
          try {
            // Final fallback: friends table without status column
            const { data: basicFriendsData, error: basicFriendsError } = await supabase
              .from('friends')
              .select('user_id, friend_id, created_at')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            
            if (!basicFriendsError && basicFriendsData) {
              data = basicFriendsData;
            } else {
              console.warn('No suitable friends table found');
              data = [];
            }
          } catch (basicError) {
            console.warn('All friends table queries failed');
            data = [];
          }
        }
      }

      setFriends(data || []);
    } catch (err: any) {
      console.warn('Friends table fetch error:', err.message);
      setError(null); // Don't set error for missing table, just use empty array
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    loading,
    error,
    refetch: fetchFriends
  };
};

export const useSupabaseStudyRooms = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      // First try to get rooms without the relationship to avoid conflicts
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Then enhance with creator data separately to avoid relationship conflicts
      let enhancedRooms = data || [];
      if (data && data.length > 0) {
        try {
          const creatorIds = [...new Set(data.map(room => room.creator_id).filter(Boolean))];
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase
              .from('profiles')
              .select('id, full_name, username, email')
              .in('id', creatorIds);
            
            if (creators) {
              const creatorMap = new Map(creators.map(creator => [creator.id, creator]));
              enhancedRooms = data.map(room => ({
                ...room,
                creator: room.creator_id ? creatorMap.get(room.creator_id) : null
              }));
            }
          }
        } catch (creatorError) {
          console.warn('Could not fetch creator data, using rooms without creator info');
        }
      }
      
      setRooms(enhancedRooms);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    error,
    refetch: fetchRooms
  };
};

export const useSupabaseFocusSession = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const startSession = async (roomId?: string, sessionType: 'individual' | 'group' = 'individual') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const sessionData = {
        user_id: session.user.id,
        room_id: roomId || null,
        session_type: sessionType,
        status: 'active',
        start_time: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('focus_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setIsSessionActive(true);
      setSessionDuration(0);

      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  };

  const endSession = async () => {
    if (!currentSession) return null;

    try {
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(currentSession.start_time).getTime()) / 1000);

      // Don't save sessions under 5 minutes (300 seconds)
      if (duration < 300) {
        console.log(`⏭️ Session too short (${Math.floor(duration / 60)} minutes), not saving to database`);

        // Delete the session from database
        await supabase
          .from('focus_sessions')
          .delete()
          .eq('id', currentSession.id);

        setCurrentSession(null);
        setSessionDuration(0);
        setIsSessionActive(false);

        return {
          id: currentSession.id,
          duration: duration,
          end_time: endTime,
          status: 'too_short',
          message: 'Session was less than 5 minutes and was not saved'
        };
      }

      // Try with different column names for backward compatibility
      let updateData: any = {
        end_time: endTime,
        status: 'completed'
      };

      // Try duration_seconds first, then duration, then duration_minutes
      const { data: testData, error: testError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', currentSession.id)
        .limit(1);

      if (testData && testData[0]) {
        const columns = Object.keys(testData[0]);
        if (columns.includes('duration_seconds')) {
          updateData.duration_seconds = duration;
        } else if (columns.includes('duration')) {
          updateData.duration = Math.floor(duration / 60); // Convert to minutes
        } else if (columns.includes('duration_minutes')) {
          updateData.duration_minutes = Math.floor(duration / 60);
        }
      }

      const { data: updatedSession, error } = await supabase
        .from('focus_sessions')
        .update(updateData)
        .eq('id', currentSession.id)
        .select()
        .single();

      if (error) throw error;

      // Award Flint currency for completed session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const minutesCompleted = duration / 60; // Convert seconds to minutes
          const flintEarned = Math.floor(minutesCompleted); // 1 Flint per completed minute

          if (flintEarned > 0) {
            // Get current profile data
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('flint_currency, first_session_bonus_claimed')
              .eq('id', session.user.id)
              .single();

            if (!profileError && profile) {
              let totalFlintToAward = flintEarned;
              let bonusAwarded = false;

              // Check if this is the first completed session
              if (!profile.first_session_bonus_claimed) {
                totalFlintToAward += 0.5; // Add first session bonus
                bonusAwarded = true;
              }

              const newFlintBalance = (profile.flint_currency || 0) + totalFlintToAward;

              // Update profile with new flint balance
              const updateData: any = { flint_currency: newFlintBalance };
              if (bonusAwarded) {
                updateData.first_session_bonus_claimed = true;
              }

              await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', session.user.id);

              console.log(`✨ Flint awarded: ${totalFlintToAward} (${flintEarned} for ${minutesCompleted.toFixed(0)} minutes${bonusAwarded ? ' + 0.5 first session bonus' : ''})`);

            }
          }
        }
      } catch (flintError) {
        console.error('Error awarding Flint:', flintError);
        // Don't throw - we don't want to break session completion if Flint award fails
      }

      setCurrentSession(null);
      setSessionDuration(0);
      setIsSessionActive(false);

      return updatedSession;
    } catch (error) {
      console.error('Error ending session:', error);
      // Return fallback data so the app doesn't break
      return {
        id: currentSession.id,
        duration: sessionDuration,
        end_time: new Date().toISOString(),
        status: 'completed'
      };
    }
  };

  const pauseSession = async () => {
    if (!currentSession) return;

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .update({ status: 'paused' })
        .eq('id', currentSession.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setIsSessionActive(false);
      return data;
    } catch (error) {
      console.error('Error pausing session:', error);
      throw error;
    }
  };

  const resumeSession = async () => {
    if (!currentSession) return;

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .update({ status: 'active' })
        .eq('id', currentSession.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setIsSessionActive(true);
      return data;
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    }
  };

  return {
    isSessionActive,
    currentSession,
    sessionDuration,
    startSession,
    endSession,
    pauseSession,
    resumeSession
  };
};

// Enhanced session history fetch with better error handling
export const useFocusSessionHistory = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      // Get table structure first
      const { data: tableData, error: tableError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1);

      let selectColumns = '*';
      if (tableData && tableData[0]) {
        const columns = Object.keys(tableData[0]);
        // Build select based on available columns
        const availableColumns = ['id', 'user_id', 'start_time', 'end_time', 'status', 'session_type', 'created_at'];
        
        if (columns.includes('duration_seconds')) {
          availableColumns.push('duration_seconds');
        } else if (columns.includes('duration')) {
          availableColumns.push('duration');
        } else if (columns.includes('duration_minutes')) {
          availableColumns.push('duration_minutes');
        }
        
        selectColumns = availableColumns.join(', ');
      }

      const { data, error } = await supabase
        .from('focus_sessions')
        .select(selectColumns)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform data to consistent format
      const transformedData = (data || []).map(session => ({
        ...session,
        duration_minutes: session.duration_seconds 
          ? Math.floor(session.duration_seconds / 60)
          : session.duration_minutes || session.duration || 0
      }));

      setSessions(transformedData);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return { sessions, loading, error, refetch: fetchSessions };
};

export const useSupabaseProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = async (updates: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No authenticated user');

      // This would implement image upload logic
      // For now, just return a placeholder
      return { publicUrl: imageUri };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateStatus = async (status: string) => {
    try {
      return await updateProfile({ status });
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    updateProfile,
    uploadProfileImage,
    updateStatus,
    loading,
    error,
    refetch: fetchProfile
  };
};

export const useUserAppData = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Enhanced parallel fetching with better error handling
      const fetchWithFallback = async (tableName: string, query: any) => {
        try {
          const result = await query;
          if (result.error) {
            console.warn(`Table '${tableName}' error:`, result.error.message);
            return { data: null, error: result.error };
          }
          return result;
        } catch (err) {
          console.warn(`Table '${tableName}' fetch failed:`, err.message);
          return { data: null, error: err };
        }
      };

      const [
        profileResult,
        onboardingResult,
        settingsResult,
        tasksResult,
        achievementsResult,
        insightsResult,
        metricsResult
      ] = await Promise.all([
        fetchWithFallback('profiles', supabase.from('profiles').select('*').eq('id', userId).single()),
        fetchWithFallback('onboarding_preferences', supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single()),
        fetchWithFallback('user_settings', supabase.from('user_settings').select('*').eq('user_id', userId).single()),
        fetchWithFallback('tasks', supabase.from('tasks').select(`
          *,
          subtasks:subtasks(*)
        `).eq('user_id', userId).order('created_at', { ascending: false })),
        fetchWithFallback('achievements', supabase.from('achievements').select('*').eq('user_id', userId)),
        fetchWithFallback('ai_insights', supabase.from('ai_insights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)),
        fetchWithFallback('learning_metrics', supabase.from('learning_metrics').select('*').eq('user_id', userId).limit(1))
      ]);

      // Collect any errors for logging
      const errors = [
        profileResult.error && { table: 'profiles', error: profileResult.error },
        onboardingResult.error && { table: 'onboarding_preferences', error: onboardingResult.error },
        settingsResult.error && { table: 'user_settings', error: settingsResult.error },
        tasksResult.error && { table: 'tasks', error: tasksResult.error },
        achievementsResult.error && { table: 'achievements', error: achievementsResult.error },
        insightsResult.error && { table: 'ai_insights', error: insightsResult.error },
        metricsResult.error && { table: 'learning_metrics', error: metricsResult.error }
      ].filter(Boolean);

      if (errors.length > 0) {
        console.warn('Errors fetching user data (using fallbacks where possible):', errors);
      }

      const compiledData = {
        profile: profileResult.data || null,
        onboarding: onboardingResult.data || null,
        settings: settingsResult.data || null,
        tasks: tasksResult.data || [],
        achievements: achievementsResult.data || [],
        insights: insightsResult.data || [],
        metrics: metricsResult.data?.[0] || null // Take first record only to avoid multiple rows error
      };

      console.log('📊 User data compiled:', {
        tasksCount: compiledData.tasks.length,
        hasProfile: !!compiledData.profile,
        hasOnboarding: !!compiledData.onboarding
      });

      setUserData(compiledData);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return { 
    data: userData, 
    loading, 
    error, 
    refetch: fetchUserData 
  };
};
