import { useState, useEffect, useCallback } from 'react';
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
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fix the friends query - use proper join syntax
      const { data: friendsData, error: friendsError } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profiles!inner(*)
        `)
        .in('user_id', [
          // Get user's friend IDs first
          // This is a simplified approach - you may need to adjust based on your friends table structure
        ])
        .order('points', { ascending: false })
        .limit(10);

      if (friendsError) {
        console.error('Friends leaderboard error:', friendsError);
        // Don't throw here, just log and continue with empty array
      }

      // Global leaderboard query (this should work fine)
      const { data: globalData, error: globalError } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profiles(*)
        `)
        .order('points', { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      setData({
        friendsLeaderboard: friendsData || [],
        globalLeaderboard: globalData || [],
      });
    } catch (err: any) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message);
      // Set fallback data
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

  return { data, loading, error, refetch: fetchLeaderboard };
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
