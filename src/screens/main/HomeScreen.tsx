import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, Alert, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { supabase } from '../../utils/supabase';
import { useSupabaseTasks, useSupabaseInsights, useSupabaseLeaderboard, useSupabaseLeaderboardWithFriends, Insight, useSupabaseAchievements, Achievement, useSupabaseSubtasks, Subtask, useSupabaseSubjects } from '../../utils/supabaseHooks';
import { BarChart as ChartKitBarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const MOCK_INSIGHTS = [
  {
    title: 'Mornings Are Golden',
    description:
      'Since you tend to focus most during mornings, consider scheduling your most important study sessions during this time to maximize your productivity. Take advantage of your natural energy boost to tackle challenging topics.',
    link: '#',
  },
  {
    title: 'Park It Up',
    description:
      'Your preferred environment is a park, which suggests you prefer a peaceful and natural setting. Try to incorporate more park sessions into your study routine to reduce distraction and improve focus.',
    link: '#',
  },
  {
    title: "Nature's Soundtrack",
    description:
      'Your preferred sound preference is nature, which can help you stay focused. Consider using a nature sounds app or playing calming music in the background during your study sessions to maintain a consistent focus environment.',
    link: '#',
  },
];

const MOCK_TASKS: { text: string; priority: string }[] = [];

const MOCK_LEADERBOARD = {
  weeklyGoal: 10, // hours
};

const MOCK_DAILY_INSPIRATION = '"It always seems impossible until it\'s done."';

const HomeScreen = () => {
  const { user } = useAuth();
  const [taskInput, setTaskInput] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [subTaskInput, setSubTaskInput] = useState<{ [taskId: string]: string }>({});
  const [activeTab, setActiveTab] = useState('Active');
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [progressTab, setProgressTab] = useState<'FocusTime' | 'Tasks'>('FocusTime');
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<{ [taskId: string]: boolean }>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  // Helper for faded primary color
  const fadedPrimary = theme.primary + '22'; // 13% opacity hex fallback

  // Supabase hooks
  const { tasks: supabaseTasks, addTask, updateTask, deleteTask, loading: tasksLoading, error: tasksError } = useSupabaseTasks();
  const { 
    insights, 
    setInsights, 
    loading: insightsLoading, 
    setLoading: setInsightsLoading, 
    error: insightsError, 
    setError: setInsightsError 
  } = useSupabaseInsights();
  const { leaderboard, loading: leaderboardLoading, error: leaderboardError } = useSupabaseLeaderboard();
  const { leaderboard: leaderboardRankings, loading: rankingsLoading, error: rankingsError } = useSupabaseLeaderboardWithFriends();
  const { 
    achievements: supabaseAchievements, 
    loading: achievementsLoading, 
    error: achievementsError,
    refetch: refetchAchievements,
    setAchievements 
  } = useSupabaseAchievements();
  const { subjects, addSubject, loading: subjectsLoading, error: subjectsError } = useSupabaseSubjects();

  // Derived task lists
  const activeTasks = supabaseTasks.filter(task => task.status !== 'completed');
  const completedTasks = supabaseTasks.filter(task => task.status === 'completed');

  // Subtasks state for all tasks
  const [allSubtasks, setAllSubtasks] = useState<{ [taskId: string]: Subtask[] }>({});
  const [subtasksLoading, setSubtasksLoading] = useState<{ [taskId: string]: boolean }>({});
  const [subtasksError, setSubtasksError] = useState<{ [taskId: string]: string | null }>({});

  // Add state for focus sessions
  const [focusSessions, setFocusSessions] = useState<any[]>([]);
  const [focusSessionsLoading, setFocusSessionsLoading] = useState(false);

  // Define days array here, before it's used
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const fetchInsights = useCallback(async () => {
    if (!user?.id) {
      setInsightsError('User not authenticated.');
      setInsightsLoading(false);
      return;
    }
    try {
      // First, try to fetch existing insights from the database
      const { data: existingInsights, error: fetchError } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (fetchError) throw fetchError;

      // If we have recent insights (less than 24 hours old), use them
      const recentInsights = existingInsights?.filter(
        insight => new Date(insight.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );

      if (recentInsights && recentInsights.length > 0) {
        setInsights(recentInsights);
        return;
      }

      // If no recent insights, generate new ones using the Edge Function
      const response = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const { insights: newInsights } = await response.json();
      if (newInsights) {
        setInsights(newInsights);
      }
    } catch (err: any) {
      console.error('Error fetching insights:', err);
      setInsightsError(err.message);
    } finally {
      setInsightsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchInsights();
    }
  }, [fetchInsights, user?.id]);

  useEffect(() => {
    const fetchAllSubtasks = async () => {
      const newSubtasks: { [taskId: string]: Subtask[] } = {};
      const newLoading: { [taskId: string]: boolean } = {};
      const newError: { [taskId: string]: string | null } = {};
      for (const task of supabaseTasks) {
        newLoading[task.id] = true;
        try {
          const { data, error } = await supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', task.id);
          if (error) {
            newError[task.id] = error.message;
            newSubtasks[task.id] = [];
          } else {
            newError[task.id] = null;
            newSubtasks[task.id] = data || [];
          }
        } catch (err: any) {
          newError[task.id] = err.message;
          newSubtasks[task.id] = [];
        }
        newLoading[task.id] = false;
      }
      setAllSubtasks(newSubtasks);
      setSubtasksLoading(newLoading);
      setSubtasksError(newError);
    };
    if (supabaseTasks.length > 0) fetchAllSubtasks();
  }, [supabaseTasks]);

  const handleStartFocusSession = () => {
    setShowPriorityModal(true);
  };

  const handlePriorityChoice = (auto: boolean) => {
    setShowPriorityModal(false);
    navigation.navigate('StudySessionScreen');
  };

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    await addTask(taskInput, '', priority);
    setTaskInput('');
    setPriority('Medium');
  };

  const handleEditTask = (taskId: string, text: string) => {
    setEditTaskId(taskId);
    setEditTaskText(text);
  };
  const handleSaveEditTask = async (taskId: string) => {
    await updateTask(taskId, { title: editTaskText });
    setEditTaskId(null);
    setEditTaskText('');
  };
  const handleDeleteTask = async (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => await deleteTask(taskId) },
    ]);
  };
  const handleCompleteTask = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
  };
  const handleUndoTask = async (taskId: string) => {
    await updateTask(taskId, { status: 'pending' });
  };
  const handleChangePriority = async (taskId: string, newPriority: string) => {
    await updateTask(taskId, { priority: newPriority });
  };

  // Subtask handlers (CRUD)
  const handleAddSubTask = async (taskId: string) => {
    const text = subTaskInput[taskId]?.trim();
    if (!text || !user?.id) return;
    const { data, error } = await supabase
      .from('subtasks')
      .insert([{ task_id: taskId, user_id: user.id, text, completed: false }]);
    if (!error) {
      setAllSubtasks(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), ...(data || [])],
      }));
      setSubTaskInput(prev => ({ ...prev, [taskId]: '' }));
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleSubTask = async (taskId: string, subTaskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ completed: !completed })
      .eq('id', subTaskId);
    if (!error) {
      setAllSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(st =>
          st.id === subTaskId ? { ...st, completed: !completed } : st
        ),
      }));
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteSubTask = async (taskId: string, subTaskId: string) => {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subTaskId);
    if (!error) {
      setAllSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].filter(st => st.id !== subTaskId),
      }));
    } else {
      Alert.alert('Error', error.message);
    }
  };

  // Fetch focus sessions for the week
  const fetchWeeklyFocusSessions = useCallback(async () => {
    if (!user?.id) return;
    
    setFocusSessionsLoading(true);
    try {
      // Get date 7 days ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching focus sessions:', error);
      } else {
        setFocusSessions(data || []);
      }
    } catch (err) {
      console.error('Error in fetchWeeklyFocusSessions:', err);
    } finally {
      setFocusSessionsLoading(false);
    }
  }, [user?.id]);

  // Fetch focus sessions when user changes
  useEffect(() => {
    if (user?.id) {
      fetchWeeklyFocusSessions();
    }
  }, [user?.id, fetchWeeklyFocusSessions]);

  // Calculate focus time per day from real data
  const focusPerDay = useMemo(() => {
    return days.map(day => {
      const sessionsForDay = focusSessions.filter(
        session => session.created_at?.slice(0, 10) === day && session.completed
      );
      const totalMinutes = sessionsForDay.reduce(
        (sum, session) => sum + (session.duration || 0), 
        0
      );
      return Math.round(totalMinutes / 60); // Convert to hours
    });
  }, [focusSessions, days]);

  // Update tasksPerDay to use updated_at for completed tasks
  const tasksPerDay = useMemo(() => {
    return days.map(day =>
      completedTasks.filter((t: any) => {
        const completedDate = t.updated_at || t.created_at;
        return completedDate?.slice(0, 10) === day;
      }).length
    );
  }, [completedTasks, days]);

  // New handlers for navigation
  const handleFocusNow = () => {
    navigation.navigate('StudySessionScreen');
  };

  const handleViewLeaderboard = () => {
    navigation.navigate('Main', { screen: 'Leaderboard' });
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Defensive style getter
  function getStyle(stylesObj: any, key: string) {
    if (!stylesObj[key]) {
      console.warn(`Style "${key}" is undefined!`);
      return {};
    }
    return stylesObj[key];
  }

  // Add state for daily inspiration
  const [inspiration, setInspiration] = useState<string | null>(null);
  const [inspirationLoading, setInspirationLoading] = useState(true);
  const [inspirationError, setInspirationError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInspiration = async () => {
      setInspirationLoading(true);
      setInspirationError(null);
      try {
        if (!user?.id) {
          setInspirationError('User not authenticated.');
          setInspirationLoading(false);
          return;
        }
        const res = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/generate-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({ user_id: user.id }),
        });
        const data = await res.json();
        setInspiration(data?.inspiration || null);
      } catch (err: any) {
        setInspirationError('Failed to load inspiration.');
      }
      setInspirationLoading(false);
    };
    if (user?.id) {
      fetchInspiration();
    }
  }, [user?.id]);

  // Add this function after other useCallback hooks
  const checkAndAwardAchievements = useCallback(async () => {
    if (!user?.id) return;

    const earned = (type: string) =>
      supabaseAchievements.some(a => a.achievement_type === type);

    const toInsert: any[] = [];

    // 1. First Task Completed
    if (!earned('First Task Completed') && completedTasks.length >= 1) {
      toInsert.push({
        user_id: user.id,
        achievement_type: 'First Task Completed',
        description: 'Complete your first task',
        earned_at: new Date().toISOString()
      });
    }

    // 2. 5 Tasks Completed
    if (!earned('5 Tasks Completed') && completedTasks.length >= 5) {
      toInsert.push({
        user_id: user.id,
        achievement_type: '5 Tasks Completed',
        description: 'Complete 5 tasks',
        earned_at: new Date().toISOString()
      });
    }

    // 3. First Focus Session
    if (!earned('First Focus Session') && focusSessions.length >= 1) {
      toInsert.push({
        user_id: user.id,
        achievement_type: 'First Focus Session',
        description: 'Start your first focus session',
        earned_at: new Date().toISOString()
      });
    }

    if (toInsert.length) {
      try {
        const { data, error } = await supabase
          .from('achievements')
          .insert(toInsert)
          .select();

        if (error) {
          console.error('Error inserting achievements:', error);
          console.log('User ID:', user.id);
          console.log('To Insert:', toInsert);
        } else {
          console.log('Successfully inserted achievements:', data);
          refetchAchievements();
        }
      } catch (err) {
        console.error('Exception while inserting achievements:', err);
      }
    }
  }, [user?.id, completedTasks, focusSessions, supabaseAchievements, refetchAchievements]);

  // Add this effect to check achievements when tasks or sessions change
  useEffect(() => {
    checkAndAwardAchievements();
  }, [checkAndAwardAchievements]);

  // Add these state variables inside HomeScreen component
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Add this function to handle achievement transitions
  const showNextAchievement = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentAchievementIndex((prev) => 
        (prev + 1) % (supabaseAchievements.length || 1)
      );
    });
  }, [fadeAnim, supabaseAchievements.length]);

  // Add this effect to auto-rotate achievements
  useEffect(() => {
    if (supabaseAchievements.length > 1) {
      const interval = setInterval(showNextAchievement, 5000); // Change every 5 seconds
      return () => clearInterval(interval);
    }
  }, [showNextAchievement, supabaseAchievements.length]);

  // Move the PRIORITIES array definition inside the HomeScreen component, after 'const { theme } = useTheme();'
  const PRIORITIES = [
    { label: 'Low', color: theme.primary },
    { label: 'Medium', color: '#3b82f6' },
    { label: 'High', color: '#ef4444' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: 80 }} enableOnAndroid={true} extraScrollHeight={80}>
          <Text style={[getStyle(styles, 'envLabel'), { color: theme.primary }]}>Nature Environment</Text>

          {/* Pomodoro Timer Card */}
          <View style={[getStyle(styles, 'timerCard'), { backgroundColor: theme.card }]}>
            <Text style={[getStyle(styles, 'timerTitle'), { color: theme.text }]}>Ready to focus?</Text>
            <Text style={[getStyle(styles, 'timerSubtitle'), { color: theme.text + '99' }]}>Balanced work and rest cycles (45min/15min)</Text>
            <View style={getStyle(styles, 'timerRow')}>
              <View style={[getStyle(styles, 'timerInfoBox'), { backgroundColor: fadedPrimary }]}>
                <Text style={[getStyle(styles, 'timerInfoLabel'), { color: theme.primary }]}>{supabaseTasks && supabaseTasks.length > 0 ? `${supabaseTasks.length} Tasks` : 'No Tasks'}</Text>
              </View>
              <View style={[getStyle(styles, 'timerMainBox'), { backgroundColor: fadedPrimary }]}>
                <Text style={[getStyle(styles, 'timerMain'), { color: theme.primary }]}>45:00</Text>
                <Text style={[getStyle(styles, 'timerMainLabel'), { color: theme.text + '99' }]}>Balanced Timer</Text>
              </View>
              <View style={[getStyle(styles, 'timerInfoBox'), { backgroundColor: fadedPrimary }]}>
                <Text style={[getStyle(styles, 'timerInfoLabel'), { color: theme.primary }]}>15m</Text>
                <Text style={[getStyle(styles, 'timerInfoLabel'), { color: theme.primary }]}>Break</Text>
              </View>
            </View>
            <TouchableOpacity style={[getStyle(styles, 'startButton'), { backgroundColor: theme.primary }]} onPress={handleStartFocusSession}>
              <Text style={[getStyle(styles, 'startButtonText'), { color: theme.card }]}>Start Focus Session</Text>
            </TouchableOpacity>
        </View>

          {/* Task/Subject Creation */}
          <View style={[getStyle(styles, 'taskCard'), { backgroundColor: theme.card }]}>
            <Text style={[getStyle(styles, 'taskTitle'), { color: theme.text }]}>Create Your Subject/Task List</Text>
            <TextInput
              style={[getStyle(styles, 'taskInput'), { color: theme.text }]}
              placeholder="Add a new subject or task..."
              placeholderTextColor={theme.text + '99'}
              value={taskInput}
              onChangeText={setTaskInput}
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 4, color: theme.text }}>Priority Level:</Text>
            <View style={getStyle(styles, 'priorityRow')}>
              {PRIORITIES.map(p => (
        <TouchableOpacity 
                  key={p.label}
                  style={[getStyle(styles, 'priorityButton'), { borderColor: p.color, backgroundColor: priority === p.label ? p.color : theme.card }]}
                  onPress={() => setPriority(p.label)}
                >
                  <Text style={{ color: priority === p.label ? theme.card : p.color, fontWeight: 'bold' }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[getStyle(styles, 'addButton'), { opacity: taskInput.trim() ? 1 : 0.5, backgroundColor: theme.primary }]} onPress={handleAddTask} disabled={!taskInput.trim()}>
                <Text style={[getStyle(styles, 'addButtonText'), { color: theme.card }]}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.text + '99', fontSize: 13, marginBottom: 8 }}>
              Low (themed), Medium (blue), High (red) indicate the priority level of your task.
            </Text>
            <View style={getStyle(styles, 'taskTabsRow')}>
              <TouchableOpacity onPress={() => setActiveTab('Active')} style={[getStyle(styles, 'tabBtn'), { borderBottomColor: activeTab === 'Active' ? theme.primary : 'transparent' }]}>
                <Text style={[getStyle(styles, 'tabText'), activeTab === 'Active' && { color: theme.primary } ]}>Active Tasks ({activeTasks.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('Completed')} style={[getStyle(styles, 'tabBtn'), { borderBottomColor: activeTab === 'Completed' ? theme.primary : 'transparent' }]}>
                <Text style={[getStyle(styles, 'tabText'), activeTab === 'Completed' && { color: theme.primary } ]}>Completed ({completedTasks.length})</Text>
              </TouchableOpacity>
            </View>
            {activeTab === 'Active' && (
              <View style={{ marginTop: 16 }}>
                {tasksLoading ? (
                  <Text style={getStyle(styles, 'noTasksText')}>Loading tasks...</Text>
                ) : tasksError ? (
                  <Text style={[getStyle(styles, 'noTasksText'), { color: '#ef4444' }]}>{tasksError}</Text>
                ) : activeTasks.length === 0 ? (
                  <Text style={getStyle(styles, 'noTasksText')}>No active tasks. Add your first task above!</Text>
                ) : (
                  activeTasks.map(task => (
                    <View key={task.id} style={[getStyle(styles, 'taskItem'), { borderLeftColor: PRIORITIES.find(p => p.label === task.priority)?.color || '#3b82f6' }]}> 
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        {editTaskId === task.id ? (
                          <>
                            <TextInput
                              style={[getStyle(styles, 'taskText'), { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 6, marginRight: 8 }]}
                              value={editTaskText}
                              onChangeText={setEditTaskText}
                              onSubmitEditing={() => handleSaveEditTask(task.id)}
                            />
                            <TouchableOpacity onPress={() => handleSaveEditTask(task.id)} style={{ marginRight: 8 }}>
                              <Ionicons name="checkmark" size={20} color="#22c55e" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditTaskId(null)} style={{ marginRight: 8 }}>
                              <Ionicons name="close" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity onPress={() => handleToggleExpand(task.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name={expandedTasks[task.id] ? 'chevron-down' : 'chevron-forward'} size={18} color="#888" style={{ marginRight: 8 }} />
                            <Text style={getStyle(styles, 'taskText')}>{task.title}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {PRIORITIES.map(p => (
                            <TouchableOpacity
                              key={p.label}
                              style={[getStyle(styles, 'priorityDot'), { backgroundColor: p.color, opacity: task.priority === p.label ? 1 : 0.3 }]}
                              onPress={() => handleChangePriority(task.id, p.label)}
                            />
                          ))}
                          <TouchableOpacity onPress={() => handleEditTask(task.id, task.title)} style={{ marginLeft: 8 }}>
                            <Ionicons name="pencil" size={20} color="#3b82f6" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={{ marginLeft: 8 }}>
                            <Ionicons name="trash" size={20} color="#ef4444" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleCompleteTask(task.id)} style={{ marginLeft: 8 }}>
                            <Ionicons name="checkbox-outline" size={22} color="#22c55e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {expandedTasks[task.id] && (
                        <View style={{ marginTop: 10, marginLeft: 8 }}>
                          {subtasksLoading[task.id] ? (
                            <Text style={{ color: '#888', fontSize: 14 }}>Loading subtasks...</Text>
                          ) : subtasksError[task.id] ? (
                            <Text style={{ color: '#ef4444', fontSize: 14 }}>{subtasksError[task.id]}</Text>
                          ) : !allSubtasks[task.id] || allSubtasks[task.id].length === 0 ? (
                            <Text style={{ color: '#888', fontSize: 14 }}>No sub-tasks yet.</Text>
                          ) : (
                            allSubtasks[task.id].map((st: any) => (
                              <TouchableOpacity key={st.id} style={getStyle(styles, 'subTaskRow')} onPress={() => handleToggleSubTask(task.id, st.id, st.completed)}>
                                <Ionicons name={st.completed ? 'checkbox' : 'square-outline'} size={20} color={st.completed ? '#22c55e' : '#888'} />
                                <Text style={[getStyle(styles, 'subTaskText'), st.completed && { textDecorationLine: 'line-through', color: '#aaa' }]}>{st.text}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                          <View style={getStyle(styles, 'addSubTaskRow')}>
                            <TextInput
                              style={getStyle(styles, 'subTaskInput')}
                              placeholder="Add sub-task..."
                              value={subTaskInput[task.id] || ''}
                              onChangeText={txt => setSubTaskInput(prev => ({ ...prev, [task.id]: txt }))}
                              onSubmitEditing={() => handleAddSubTask(task.id)}
                            />
                            <TouchableOpacity onPress={() => handleAddSubTask(task.id)} style={getStyle(styles, 'addSubTaskBtn')}>
                              <Ionicons name="add-circle" size={24} color="#3b82f6" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
            {activeTab === 'Completed' && (
              <View style={{ marginTop: 16 }}>
                {completedTasks.length === 0 && <Text style={getStyle(styles, 'noTasksText')}>No completed tasks yet.</Text>}
                {completedTasks.map(task => (
                  <View key={task.id} style={[getStyle(styles, 'taskItem'), { borderLeftColor: PRIORITIES.find(p => p.label === task.priority)?.color || '#3b82f6', opacity: 0.6 }]}> 
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={'checkmark-done'} size={18} color="#22c55e" style={{ marginRight: 8 }} />
                        <Text style={[getStyle(styles, 'taskText'), { textDecorationLine: 'line-through', color: '#aaa' }]}>{task.title}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleUndoTask(task.id)} style={{ marginLeft: 8 }}>
                          <Ionicons name="arrow-undo" size={20} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={{ marginLeft: 8 }}>
                          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ marginTop: 10, marginLeft: 8 }}>
                      {!task.subTasks || task.subTasks.length === 0 ? (
                        <Text style={{ color: '#888', fontSize: 14 }}>No sub-tasks.</Text>
                      ) : (
                        task.subTasks.map((st: any) => (
                          <View key={st.id} style={getStyle(styles, 'subTaskRow')}>
                            <Ionicons name={st.completed ? 'checkbox' : 'square-outline'} size={20} color={st.completed ? '#22c55e' : '#888'} />
                            <Text style={[getStyle(styles, 'subTaskText'), { textDecorationLine: 'line-through', color: '#aaa' }]}>{st.text}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* AI-Powered Insights */}
          <View style={{
            backgroundColor: theme.card,
            borderColor: theme.border || '#E0E0E0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginHorizontal: 16,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={getStyle(styles, 'insightsTitle')}>AI-Powered Insights</Text>
              <TouchableOpacity onPress={fetchInsights}>
                <Ionicons name="refresh" size={20} color="#388E3C" />
              </TouchableOpacity>
            </View>
            {insightsLoading ? (
              <Text style={getStyle(styles, 'noTasksText')}>Analyzing your study patterns...</Text>
            ) : insightsError ? (
              <View>
                <Text style={[getStyle(styles, 'noTasksText'), { color: '#ef4444' }]}>{insightsError}</Text>
                <TouchableOpacity onPress={fetchInsights} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#388E3C', textAlign: 'center' }}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : insights && insights.length > 0 ? (
              insights.map((insight: any, idx: number) => (
                <View key={insight.id || idx} style={getStyle(styles, 'insightBox')}>
                  <Text style={getStyle(styles, 'insightTitle')}>{insight.insight_type}</Text>
                  <Text style={getStyle(styles, 'insightDesc')}>{insight.content}</Text>
                  {insight.insight_type === 'Action Needed' && (
                    <TouchableOpacity style={getStyle(styles, 'focusNowBtn')} onPress={handleFocusNow}>
                      <Text style={getStyle(styles, 'focusNowText')}>Focus now</Text>
                      <MaterialIcons name="open-in-new" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={getStyle(styles, 'noTasksText')}>Complete some tasks to get personalized insights!</Text>
            )}
          </View>

          {/* Updated Focus Leaderboard */}
          <View style={{
            backgroundColor: theme.card,
            borderColor: theme.border || '#E0E0E0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginHorizontal: 16,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={getStyle(styles, 'leaderboardTitle')}>Focus Leaderboard</Text>
              <TouchableOpacity onPress={handleViewLeaderboard}>
                <Text style={getStyle(styles, 'leaderboardViewAll')}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {/* User's Weekly Goal */}
            {leaderboard && (
              <Text style={getStyle(styles, 'leaderboardGoal')}>
                Your Weekly Goal: {Math.round((leaderboard.total_focus_time || 0) / 60)}/{leaderboard.weekly_focus_goal || 10} hours
              </Text>
            )}
            
            {/* Top Rankings */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '600' }}>TOP PERFORMERS</Text>
              
              {rankingsLoading ? (
                <Text style={getStyle(styles, 'noTasksText')}>Loading rankings...</Text>
              ) : rankingsError ? (
                <Text style={[getStyle(styles, 'noTasksText'), { color: '#ef4444' }]}>{rankingsError}</Text>
              ) : leaderboardRankings && leaderboardRankings.length > 0 ? (
                <View>
                  {leaderboardRankings.slice(0, 3).map((entry, idx) => (
                    <View key={entry.id} style={getStyle(styles, 'rankingRow')}>
                      <View style={getStyle(styles, 'rankingPosition')}>
                        {idx === 0 && <Text style={getStyle(styles, 'rankingMedal')}>🥇</Text>}
                        {idx === 1 && <Text style={getStyle(styles, 'rankingMedal')}>🥈</Text>}
                        {idx === 2 && <Text style={getStyle(styles, 'rankingMedal')}>🥉</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={getStyle(styles, 'rankingName')}>
                          {entry.user_id === user?.id ? 'You' : `User ${idx + 1}`}
                        </Text>
                        <Text style={getStyle(styles, 'rankingStats')}>
                          {Math.round((entry.total_focus_time || 0) / 60)}h • {entry.current_streak || 0} day streak
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={getStyle(styles, 'rankingPoints')}>{entry.points || 0}</Text>
                        <Text style={getStyle(styles, 'rankingPointsLabel')}>points</Text>
                      </View>
                    </View>
                  ))}
                  
                  {/* Show user's position if not in top 3 */}
                  {leaderboardRankings.length > 3 && !leaderboardRankings.slice(0, 3).find(e => e.user_id === user?.id) && (
                    <View style={[getStyle(styles, 'rankingRow'), { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E8F5E9', paddingTop: 8 }]}>
                      <View style={getStyle(styles, 'rankingPosition')}>
                        <Text style={getStyle(styles, 'rankingNumber')}>
                          {leaderboardRankings.findIndex(e => e.user_id === user?.id) + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[getStyle(styles, 'rankingName'), { color: '#388E3C' }]}>You</Text>
                        <Text style={getStyle(styles, 'rankingStats')}>
                          {Math.round((leaderboard?.total_focus_time || 0) / 60)}h • {leaderboard?.current_streak || 0} day streak
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={getStyle(styles, 'rankingPoints')}>{leaderboard?.points || 0}</Text>
                        <Text style={getStyle(styles, 'rankingPointsLabel')}>points</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="people-outline" size={32} color="#C8E6C9" />
                  <Text style={[getStyle(styles, 'noTasksText'), { marginTop: 8 }]}>
                    Add friends to compete on the leaderboard!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Weekly Progress */}
          <View style={{
            backgroundColor: theme.card,
            borderColor: theme.border || '#E0E0E0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginHorizontal: 16,
            marginBottom: 16,
          }}>
            <Text style={getStyle(styles, 'progressTitle')}>Weekly Progress</Text>
            <View style={getStyle(styles, 'progressTabsRow')}>
              <TouchableOpacity 
                style={progressTab === 'FocusTime' ? getStyle(styles, 'progressTabActive') : getStyle(styles, 'progressTab')} 
                onPress={() => setProgressTab('FocusTime')}
              >
                <Text style={getStyle(styles, 'progressTabText')}>Focus Time</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={progressTab === 'Tasks' ? getStyle(styles, 'progressTabActive') : getStyle(styles, 'progressTab')} 
                onPress={() => setProgressTab('Tasks')}
              >
                <Text style={getStyle(styles, 'progressTabText')}>Tasks</Text>
              </TouchableOpacity>
        </View>

            {focusSessionsLoading && progressTab === 'FocusTime' ? (
              <Text style={[getStyle(styles, 'noTasksText'), { marginTop: 40 }]}>Loading focus data...</Text>
            ) : (
              <ChartKitBarChart
                data={{
                  labels: days.map(day => {
                    const date = new Date(day);
                    return date.toLocaleDateString('en', { weekday: 'short' });
                  }),
                  datasets: [
                    {
                      data: progressTab === 'FocusTime' ? focusPerDay : tasksPerDay,
                    },
                  ],
                }}
                width={Dimensions.get('window').width - 64}
                height={180}
                yAxisLabel={''}
                yAxisSuffix={progressTab === 'FocusTime' ? 'h' : ''}
                chartConfig={{
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: progressTab === 'FocusTime' ? 1 : 0,
                  color: (opacity = 1) => theme.primary + Math.floor(opacity * 255).toString(16),
                  labelColor: (opacity = 1) => theme.primary + Math.floor(opacity * 255).toString(16),
                  style: { borderRadius: 12 },
                  propsForBackgroundLines: { stroke: '#C8E6C9' },
                }}
                style={{ marginVertical: 8, borderRadius: 12, alignSelf: 'center' }}
                fromZero
                showValuesOnTopOfBars
              />
            )}
            
            {/* Add summary below chart */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#388E3C' }}>
                  {progressTab === 'FocusTime' 
                    ? `${focusPerDay.reduce((a, b) => a + b, 0).toFixed(1)}h`
                    : tasksPerDay.reduce((a, b) => a + b, 0)
                  }
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {progressTab === 'FocusTime' ? 'Total Hours' : 'Total Tasks'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#388E3C' }}>
                  {progressTab === 'FocusTime' 
                    ? `${(focusPerDay.reduce((a, b) => a + b, 0) / 7).toFixed(1)}h`
                    : (tasksPerDay.reduce((a, b) => a + b, 0) / 7).toFixed(1)
                  }
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>Daily Average</Text>
              </View>
            </View>
          </View>

          {/* Achievements */}
          <View style={{
            backgroundColor: theme.card,
            borderColor: theme.border || '#E0E0E0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginHorizontal: 16,
            marginBottom: 16,
          }}>
            <View style={styles.achievementHeader}>
              <Text style={getStyle(styles, 'progressTitle')}>Achievements</Text>
              {supabaseAchievements.length > 1 && (
                <View style={styles.achievementDots}>
                  {supabaseAchievements.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.achievementDot,
                        index === currentAchievementIndex && styles.achievementDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {achievementsLoading ? (
              <Text style={getStyle(styles, 'noTasksText')}>Loading achievements...</Text>
            ) : achievementsError ? (
              <Text style={[getStyle(styles, 'noTasksText'), { color: '#ef4444' }]}>
                Error loading achievements
              </Text>
            ) : supabaseAchievements.length === 0 ? (
              <Text style={getStyle(styles, 'noTasksText')}>No achievements yet.</Text>
            ) : (
              <Animated.View 
                style={[
                  { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: theme.border || '#E0E0E0', opacity: fadeAnim }
                ]}
              >
                <View style={styles.achievementContent}>
                  <Ionicons 
                    name="trophy" 
                    size={24} 
                    color={theme.primary} 
                    style={styles.achievementIcon}
                  />
                  <View style={styles.achievementTextContainer}>
                    <Text style={styles.achievementTitle}>
                      {supabaseAchievements[currentAchievementIndex].achievement_type}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {supabaseAchievements[currentAchievementIndex].description}
                    </Text>
                    <Text style={styles.achievementDate}>
                      Earned: {new Date(supabaseAchievements[currentAchievementIndex].earned_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Daily Inspiration */}
          <View style={{
            backgroundColor: theme.card,
            borderColor: theme.border || '#E0E0E0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginHorizontal: 16,
            marginBottom: 16,
            alignItems: 'center',
          }}>
            <Text style={getStyle(styles, 'inspirationTitle')}>Daily Inspiration</Text>
            {inspirationLoading ? (
              <Text style={getStyle(styles, 'inspirationQuote')}>Loading...</Text>
            ) : inspirationError ? (
              <Text style={[getStyle(styles, 'inspirationQuote'), { color: '#ef4444' }]}>{inspirationError}</Text>
            ) : inspiration ? (
              <Text style={getStyle(styles, 'inspirationQuote')}>{inspiration}</Text>
            ) : (
              <Text style={getStyle(styles, 'inspirationQuote')}>No inspiration for today.</Text>
            )}
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {/* Modal for Task Priority */}
      <Modal
        visible={showPriorityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={getStyle(modalStyles, 'overlay')}>
          <View style={getStyle(modalStyles, 'modalBox')}>
            <Text style={getStyle(modalStyles, 'modalTitle')}>Task Priority</Text>
            <Text style={getStyle(modalStyles, 'modalDesc')}>
              Would you like to automatically prioritize tasks based on their priority level, or would you prefer to create your own order?
            </Text>
            <TouchableOpacity style={getStyle(modalStyles, 'modalBtn')} onPress={() => handlePriorityChoice(false)}>
              <Text style={getStyle(modalStyles, 'modalBtnText')}>Create My Own Order</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[getStyle(modalStyles, 'modalBtn'), getStyle(modalStyles, 'modalBtnPrimary')]} onPress={() => handlePriorityChoice(true)}>
              <Text style={[getStyle(modalStyles, 'modalBtnText'), getStyle(modalStyles, 'modalBtnTextPrimary')]}>Use Automatic Priority</Text>
            </TouchableOpacity>
            <TouchableOpacity style={getStyle(modalStyles, 'cancelBtn')} onPress={() => setShowPriorityModal(false)}>
              <Text style={getStyle(modalStyles, 'cancelBtnText')}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FCF8' },
  envLabel: { color: '#388E3C', fontSize: 13, marginLeft: 20, marginTop: 2, marginBottom: 10 },
  timerCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#C8E6C9', alignItems: 'center' },
  timerTitle: { fontWeight: 'bold', fontSize: 16, color: '#1B5E20' },
  timerSubtitle: { color: '#666', fontSize: 13, marginBottom: 10 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginVertical: 10 },
  timerInfoBox: { flex: 1, alignItems: 'center' },
  timerInfoLabel: { color: '#888', fontSize: 13 },
  timerMainBox: { flex: 2, alignItems: 'center' },
  timerMain: { fontSize: 36, fontWeight: 'bold', color: '#388E3C' },
  timerMainLabel: { color: '#888', fontSize: 12 },
  startButton: { backgroundColor: '#388E3C', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10 },
  startButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  taskCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#C8E6C9' },
  taskTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginBottom: 8 },
  taskInput: { backgroundColor: '#F1F8E9', borderRadius: 6, padding: 10, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priorityButton: { borderWidth: 2, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  addButton: { backgroundColor: '#4CAF50', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 18 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  taskTabsRow: { flexDirection: 'row', marginBottom: 8 },
  tabBtn: { marginRight: 18 },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#388E3C', textDecorationLine: 'underline' },
  noTasksText: { color: '#888', fontSize: 14, marginTop: 8 },
  insightsCard: { backgroundColor: '#E8F5E9', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18 },
  insightsTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginBottom: 10 },
  insightBox: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  insightTitle: { fontWeight: 'bold', fontSize: 14, color: '#388E3C', marginBottom: 2 },
  insightDesc: { color: '#333', fontSize: 13, marginBottom: 6 },
  focusNowBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  focusNowText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 13 },
  leaderboardCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#C8E6C9' },
  leaderboardTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20' },
  leaderboardViewAll: { color: '#4CAF50', fontWeight: 'bold', fontSize: 13 },
  leaderboardGoal: { color: '#333', fontSize: 13, marginTop: 8 },
  progressCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#C8E0E0' },
  progressTitle: { fontWeight: 'bold', fontSize: 15, color: '#1B5E20', marginBottom: 8 },
  progressTabsRow: { flexDirection: 'row', marginBottom: 8 },
  progressTab: { marginRight: 18, paddingBottom: 2 },
  progressTabActive: { marginRight: 18, borderBottomWidth: 2, borderBottomColor: '#388E3C', paddingBottom: 2 },
  progressTabText: { color: '#388E3C', fontWeight: 'bold', fontSize: 14 },
  taskItem: {
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  taskText: {
    color: '#333',
    fontSize: 14,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  subTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  subTaskText: {
    color: '#333',
    fontSize: 14,
  },
  addSubTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  subTaskInput: {
    flex: 1,
    padding: 5,
  },
  addSubTaskBtn: {
    padding: 5,
  },
  inspirationCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  inspirationTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1B5E20',
    marginBottom: 8,
  },
  inspirationQuote: {
    color: '#388E3C',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rankingPosition: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankingMedal: {
    fontSize: 20,
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  rankingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 2,
  },
  rankingStats: {
    fontSize: 12,
    color: '#666',
  },
  rankingPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#388E3C',
  },
  rankingPointsLabel: {
    fontSize: 10,
    color: '#666',
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementDots: {
    flexDirection: 'row',
    gap: 4,
  },
  achievementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8F5E9',
  },
  achievementDotActive: {
    backgroundColor: '#15803D',
  },
  achievementContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: '#888',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: 320,
    maxWidth: '90%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  modalTitle: { fontWeight: 'bold', fontSize: 18, color: '#1B5E20', marginBottom: 10 },
  modalDesc: { color: '#333', fontSize: 14, marginBottom: 20 },
  modalBtn: { backgroundColor: '#E0E0E0', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 10 },
  modalBtnText: { color: '#388E3C', fontWeight: 'bold', fontSize: 14 },
  modalBtnPrimary: { backgroundColor: '#4CAF50' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { backgroundColor: '#E0E0E0', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { color: '#388E3C', fontWeight: 'bold', fontSize: 14 },
});

export default HomeScreen;
