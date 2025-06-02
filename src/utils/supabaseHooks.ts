import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
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
  text: string;
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

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: session.user.id,
          title,
          description,
          priority,
          status: 'pending'
        }])
        .select();

      if (error) throw error;
      if (data) {
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (type: 'friends' | 'global' = 'friends') => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLeaderboard([]);
        setGlobalLeaderboard([]);
        setLoading(false);
        return;
      }

      // Mock data for now - you can replace this with actual database calls
      const mockLeaderboardData: LeaderboardEntry[] = [
        {
          id: '1',
          user_id: session.user.id,
          display_name: 'You',
          avatar_url: undefined,
          is_current_user: true,
          points: 1250,
          weekly_focus_time: 180, // 3 hours in minutes
          current_streak: 7,
          level: 5,
          weekly_focus_goal: 600 // 10 hours in minutes
        },
        {
          id: '2',
          user_id: 'user2',
          display_name: 'Sarah Chen',
          avatar_url: undefined,
          is_current_user: false,
          points: 1890,
          weekly_focus_time: 320,
          current_streak: 12,
          level: 7
        },
        {
          id: '3',
          user_id: 'user3',
          display_name: 'Mike Johnson',
          avatar_url: undefined,
          is_current_user: false,
          points: 1650,
          weekly_focus_time: 290,
          current_streak: 5,
          level: 6
        },
        {
          id: '4',
          user_id: 'user4',
          display_name: 'Emma Davis',
          avatar_url: undefined,
          is_current_user: false,
          points: 1420,
          weekly_focus_time: 240,
          current_streak: 9,
          level: 5
        }
      ];

      // Sort by points descending
      const sortedData = mockLeaderboardData.sort((a, b) => (b.points || 0) - (a.points || 0));

      if (type === 'friends') {
        setLeaderboard(sortedData);
      } else {
        setGlobalLeaderboard(sortedData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStats = useCallback(async () => {
    // Mock implementation for updating user stats
    try {
      setLoading(true);
      // In a real implementation, this would update user statistics
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async (type?: 'friends' | 'global') => {
    await fetchLeaderboard(type);
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard('friends');
    fetchLeaderboard('global');
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    globalLeaderboard,
    loading,
    error,
    refetch,
    updateStats
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

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFriends(data || []);
    } catch (err: any) {
      setError(err.message);
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
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          creator:creator_id (
            id,
            full_name,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (roomId?: string, sessionType: 'individual' | 'group' = 'individual') => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Check if user already has an active session
      const { data: existingSession } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (existingSession) {
        // End the existing session before starting a new one
        await endSession(existingSession.id);
      }

      // Create new focus session
      const { data: newSession, error: createError } = await supabase
        .from('focus_sessions')
        .insert([{
          user_id: session.user.id,
          room_id: roomId,
          start_time: new Date().toISOString(),
          session_type: sessionType,
          status: 'active'
        }])
        .select()
        .single();

      if (createError) throw createError;

      setSessionId(newSession.id);
      setActiveSession(newSession);
      return newSession;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const endSession = useCallback(async (sessionIdToEnd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const targetSessionId = sessionIdToEnd || sessionId;
      if (!targetSessionId) {
        throw new Error('No active session to end');
      }

      // Get the session to calculate duration
      const { data: session, error: fetchError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', targetSessionId)
        .single();

      if (fetchError) throw fetchError;

      const endTime = new Date();
      const startTime = new Date(session.start_time);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Update session with end time and duration
      const { error: updateError } = await supabase
        .from('focus_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
          status: 'completed'
        })
        .eq('id', targetSessionId);

      if (updateError) throw updateError;

      setSessionId(null);
      setActiveSession(null);
      return { sessionId: targetSessionId, duration: durationSeconds };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const pauseSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!sessionId) {
        throw new Error('No active session to pause');
      }

      // For now, we'll track paused state in the client
      // Could be extended to track pause/resume times in database
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const resumeSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!sessionId) {
        throw new Error('No active session to resume');
      }

      // For now, we'll track resumed state in the client
      // Could be extended to track pause/resume times in database
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const getCurrentSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: activeSession, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (activeSession) {
        setSessionId(activeSession.id);
        setActiveSession(activeSession);
      }

      return activeSession;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Check for existing active session on mount
  useEffect(() => {
    getCurrentSession();
  }, [getCurrentSession]);

  return {
    sessionId,
    activeSession,
    loading,
    error,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    getCurrentSession
  };
};

export const useSupabaseProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
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
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (status: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadProfileImage = useCallback(async (imageUri: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      // Mock implementation - in a real app, you'd upload to Supabase Storage
      const mockAvatarUrl = `https://example.com/avatars/${session.user.id}.jpg`;
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: mockAvatarUrl })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    updateStatus,
    uploadProfileImage
  };
};

export const useSupabaseCommunityActivity = () => {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunityActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // This is a mock implementation since we don't have a community_activity table yet
      // You can implement this based on your actual database structure
      const mockActivities: CommunityActivity[] = [
        {
          id: '1',
          user_id: 'user1',
          user_name: 'Sarah',
          avatar_url: undefined,
          activity_type: 'focus_session',
          action: 'completed a 45-minute focus session',
          time: '2 hours ago',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: 'user2',
          user_name: 'Mike',
          avatar_url: undefined,
          activity_type: 'achievement',
          action: 'earned the "Focus Master" achievement',
          time: '4 hours ago',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          user_id: 'user3',
          user_name: 'Emma',
          avatar_url: undefined,
          activity_type: 'friend_request',
          action: 'joined the study community',
          time: '6 hours ago',
          created_at: new Date().toISOString()
        }
      ];

      setActivities(mockActivities);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityActivity();
  }, [fetchCommunityActivity]);

  return {
    activities,
    loading,
    error,
    refetch: fetchCommunityActivity
  };
};
