import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, Alert, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { supabase } from '../../utils/supabase';
import { useSupabaseTasks, useSupabaseLeaderboard, useSupabaseLeaderboardWithFriends, Insight } from '../../utils/supabaseHooks';
import { BarChart as ChartKitBarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Import userAppData functions  
const userAppDataModule = require('../../utils/userAppData');

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

// Extract functions from userAppData module
const { useUserAppData, getDailyInspiration } = userAppDataModule;

export default function HomeScreen() {
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
  
  const [inspiration, setInspiration] = useState<string | null>(null);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  
  // Use our comprehensive data hook
  const { data: userData, isLoading: userDataLoading, error: userDataError, refreshData } = useUserAppData();

  // Helper for faded primary color
  const fadedPrimary = theme.primary + '22'; // 13% opacity hex fallback

  const { addTask, updateTask, deleteTask, loading: tasksLoading, error: tasksError } = useSupabaseTasks();

  const activeTasks = userData?.activeTasks || [];
  const completedTasks = userData?.completedTasks || [];

  const [allSubtasks, setAllSubtasks] = useState<{ [taskId: string]: any[] }>({});
  const [subtasksLoading, setSubtasksLoading] = useState<{ [taskId: string]: boolean }>({});
  const [addingSubtask, setAddingSubtask] = useState<{ [taskId: string]: boolean }>({});
  const [subtasksError, setSubtasksError] = useState<{ [taskId: string]: string | null }>({});

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (userData) {
      const subtasksByTask: { [taskId: string]: any[] } = {};
      userData.tasks.forEach(task => {
        if (task.subtasks) {
          subtasksByTask[task.id] = task.subtasks;
        }
      });
      setAllSubtasks(subtasksByTask);
      
      getDailyInspiration().then(quote => setInspiration(quote));
    }
  }, [userData]);

  const handleRefreshData = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [refreshData]);

  const fetchSubtasks = useCallback(async (taskId: string) => {
    try {
      setSubtasksLoading(prev => ({ ...prev, [taskId]: true }));
      setSubtasksError(prev => ({ ...prev, [taskId]: null }));
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setAllSubtasks(prev => ({ ...prev, [taskId]: data || [] }));
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      setSubtasksError(prev => ({ ...prev, [taskId]: 'Failed to load subtasks' }));
    } finally {
      setSubtasksLoading(prev => ({ ...prev, [taskId]: false }));
    }
  }, []);

  const handleStartFocusSession = () => {
    // Show the priority modal to let user choose automatic or manual
    setShowPriorityModal(true);
  };

  const handlePriorityChoice = (automatic: boolean) => {
    setShowPriorityModal(false);
    
    if (automatic) {
      // Navigate directly to timer with automatic configuration and task auto-selection
      console.log('🎯 Starting automatic focus session with highest priority task');
      navigation.navigate('StudySessionScreen', { 
        autoStart: true,
        manualSelection: false
      });
    } else {
      // Navigate to custom setup modal
      navigation.navigate('StudySessionScreen', { 
        autoStart: false,
        manualSelection: true
      });
    }
  };

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    await addTask(taskInput, '', priority);
    setTaskInput('');
    setPriority('Medium');
    // Refresh data to sync between useSupabaseTasks and useUserAppData
    await refreshData();
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
    await refreshData();
  };
  const handleUndoTask = async (taskId: string) => {
    await updateTask(taskId, { status: 'pending' });
    await refreshData();
  };
  const handleChangePriority = async (taskId: string, newPriority: string) => {
    await updateTask(taskId, { priority: newPriority });
    await refreshData();
  };
  
  const handleAddSubTask = async (taskId: string) => {
    if (!subTaskInput[taskId]?.trim()) return;
    
    try {
      setAddingSubtask(prev => ({ ...prev, [taskId]: true }));
      
      // Debug: Check user authentication and task ownership
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Subtask creation debug:', {
        taskId,
        userId: session?.user?.id,
        isAuthenticated: !!session?.user
      });

      // Verify the task exists and belongs to the user
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, user_id, title')
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('❌ Task verification failed:', taskError);
        throw new Error('Task not found or access denied');
      }

      console.log('✅ Task verification:', {
        taskExists: !!taskData,
        taskUserId: taskData?.user_id,
        currentUserId: session?.user?.id,
        ownershipMatch: taskData?.user_id === session?.user?.id
      });

      // Get existing subtasks count for order
      const { count } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);
      
      const nextOrder = (count || 0) + 1;

      // Try with 'title' first, then fallback to 'text' if schema mismatch
      const subtaskData = {
        task_id: taskId,
        completed: false,
        order: nextOrder,
      };

      // First attempt with 'title' column
      let { data, error } = await supabase
        .from('subtasks')
        .insert({
          ...subtaskData,
          title: subTaskInput[taskId].trim(),
        });
        
      // If we get a schema error about 'title' column, try with 'text' column
      if (error && error.code === 'PGRST204' && error.message.includes('title')) {
        console.log('🔄 Falling back to text column for subtasks');
        const fallbackResult = await supabase
          .from('subtasks')
          .insert({
            ...subtaskData,
            text: subTaskInput[taskId].trim(),
          });
        data = fallbackResult.data;
        error = fallbackResult.error;
      }
        
      if (error) {
        console.error('❌ Subtask insertion error:', error);
        throw error;
      }

      console.log('✅ Subtask created successfully:', data);
      
      // Update the UI
      setSubTaskInput(prev => ({ ...prev, [taskId]: '' }));
      fetchSubtasks(taskId); // Refresh the subtasks
    } catch (error) {
      console.error('❌ Error adding subtask:', error);
      
      let errorMessage = 'Failed to add subtask. Please try again.';
      if (error.code === '42501') {
        errorMessage = 'Permission denied. You can only add subtasks to your own tasks.';
      } else if (error.code === 'PGRST204') {
        errorMessage = 'Database schema mismatch. Please contact support.';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'Task not found. Please refresh and try again.';
      }
      
      // Only show alert if it's a user-facing error, not a background issue
      if (error.code !== '42501' || taskData) {
        Alert.alert('Error', errorMessage);
      } else {
        console.log('🔧 Suppressing RLS error alert for background operation');
      }
    } finally {
      setAddingSubtask(prev => ({ ...prev, [taskId]: false }));
    }
  };
  
  const handleToggleSubTask = async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    try {
      // Update in database
      await supabase
        .from('subtasks')
        .update({ completed: !currentStatus })
        .eq('id', subtaskId);
      
      // Update local state
      setAllSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(st => 
          st.id === subtaskId ? { ...st, completed: !currentStatus } : st
        )
      }));
      
      // Refresh data
      await refreshData();
      
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handlePullToRefresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [refreshData]);

  const handleFocusNow = () => {
    navigation.navigate('StudySessionScreen');
  };

  const handleViewLeaderboard = () => {
    navigation.navigate('Main', { screen: 'Leaderboard' });
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  function getStyle(stylesObj: any, key: string) {
    if (!stylesObj[key]) {
      console.warn(`Style "${key}" is undefined!`);
      return {};
    }
    return stylesObj[key];
  }

  const PRIORITIES = [
    { label: 'Low', color: theme.primary },
    { label: 'Medium', color: '#3b82f6' },
    { label: 'High', color: '#ef4444' },
  ];

  // Add the missing getDurationText function
  const getDurationText = (workStyle?: string) => {
    switch (workStyle) {
      case 'Deep Work':
      case 'deepwork':
        return '90 minutes';
      case 'Sprint Focus':
      case 'sprint':
        return '25 minutes';
      case 'Extended Focus':
      case 'extended':
        return '60 minutes';
      case 'Balanced Focus':
      case 'Balanced':
      case 'balanced':
      default:
        return '45 minutes';
    }
  };

  // Add the missing getWorkStyleDuration function
  const getWorkStyleDuration = (workStyle?: string) => {
    switch (workStyle) {
      case 'Deep Work':
      case 'deepwork':
        return 90 * 60; // 90 minutes in seconds
      case 'Sprint Focus':
      case 'sprint':
        return 25 * 60; // 25 minutes in seconds
      case 'Extended Focus':
      case 'extended':
        return 60 * 60; // 60 minutes in seconds
      case 'Balanced Focus':
      case 'Balanced':
      case 'balanced':
      default:
        return 45 * 60; // 45 minutes in seconds
    }
  };

  const getWorkStyleTimerDisplay = () => {
    const workStyle = userData?.onboarding?.work_style || userData?.onboarding?.focus_method;
    switch (workStyle) {
      case 'Deep Work':
      case 'deepwork':
        return '90m';
      case 'Sprint Focus':
      case 'sprint':
        return '25m';
      case 'Extended Focus':
      case 'extended':
        return '60m';
      case 'Balanced Focus':
      case 'Balanced':
      case 'balanced':
      default:
        return '45m';
    }
  };

  const getBreakTimerDisplay = () => {
    const workStyle = userData?.onboarding?.work_style || userData?.onboarding?.focus_method;
    switch (workStyle) {
      case 'Deep Work':
      case 'deepwork':
        return '20m';
      case 'Sprint Focus':
      case 'sprint':
        return '5m';
      case 'Extended Focus':
      case 'extended':
        return '15m';
      case 'Balanced Focus':
      case 'Balanced':
      case 'balanced':
      default:
        return '15m';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {userDataLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.text }}>Loading your study data...</Text>
        </View>
      ) : userDataError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#FF6B6B', textAlign: 'center', marginBottom: 20 }}>
            Error loading your data. Please try again.
          </Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: theme.primary,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8
            }}
            onPress={handleRefreshData}
          >
            <Text style={{ color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <KeyboardAwareScrollView 
            contentContainerStyle={{ paddingBottom: 80 }} 
            enableOnAndroid={true} 
            extraScrollHeight={80}
          >
            <Text style={[styles.envLabel, { color: theme.primary }]}>
              {userData?.profile?.theme_environment || 'Nature'} Environment
            </Text>

            {/* Pomodoro Timer Card */}
            <View style={[styles.timerCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.timerTitle, { color: theme.text }]}>Ready to focus?</Text>
              <Text style={[styles.timerSubtitle, { color: theme.text + '99' }]}>
                {userData?.onboarding?.focus_method || 'Balanced'} work and rest cycles (45min/15min)
              </Text>
              <View style={styles.timerRow}>
                {/* Tasks Section - Separate Rectangle */}
                <View style={[styles.timerSectionBox, { backgroundColor: fadedPrimary }]}>
                  <Text style={[styles.timerInfoLabel, { color: theme.primary }]}>
                    {userData?.activeTasks?.length > 0 ? `${userData.activeTasks.length} Tasks` : 'No Tasks'}
                  </Text>
                </View>
                
                {/* Main Timer Section - Separate Rectangle */}
                <View style={[styles.timerSectionBox, styles.timerMainSection, { backgroundColor: fadedPrimary }]}>
                  <Text style={[styles.timerMain, { color: theme.primary }]}>
                    {getWorkStyleTimerDisplay()}
                  </Text>
                  <Text style={[styles.timerMainLabel, { color: theme.text + '99' }]}>
                    {userData?.onboarding?.work_style || userData?.onboarding?.focus_method || 'Balanced'} Timer
                  </Text>
                </View>
                
                {/* Break Section - Separate Rectangle */}
                <View style={[styles.timerSectionBox, { backgroundColor: fadedPrimary }]}>
                  <Text style={[styles.timerInfoLabel, { color: theme.primary }]}>
                    {getBreakTimerDisplay()}
                  </Text>
                  <Text style={[styles.timerInfoLabel, { color: theme.primary }]}>Break</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.startButton, { backgroundColor: theme.primary }]} onPress={handleStartFocusSession}>
                <Text style={[styles.startButtonText, { color: theme.card }]}>Start Focus Session</Text>
              </TouchableOpacity>
            </View>

            {/* Task/Subject Creation */}
            <View style={[styles.taskCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.taskTitle, { color: theme.text }]}>Create Your Subject/Task List</Text>
              <TextInput
                style={[styles.taskInput, { color: theme.text }]}
                placeholder="Add a new subject or task..."
                placeholderTextColor={theme.text + '99'}
                value={taskInput}
                onChangeText={setTaskInput}
              />
              <Text style={{ fontWeight: 'bold', marginBottom: 4, color: theme.text }}>Priority Level:</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity 
                    key={p.label}
                    style={[styles.priorityButton, { borderColor: p.color, backgroundColor: priority === p.label ? p.color : theme.card }]}
                    onPress={() => setPriority(p.label)}
                  >
                    <Text style={{ color: priority === p.label ? theme.card : p.color, fontWeight: 'bold' }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.addButton, { opacity: taskInput.trim() ? 1 : 0.5, backgroundColor: theme.primary }]} onPress={handleAddTask} disabled={!taskInput.trim()}>
                  <Text style={[styles.addButtonText, { color: theme.card }]}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: theme.text + '99', fontSize: 13, marginBottom: 8 }}>
                Low (themed), Medium (blue), High (red) indicate the priority level of your task.
              </Text>
              <View style={styles.taskTabsRow}>
                <TouchableOpacity onPress={() => setActiveTab('Active')} style={[styles.tabBtn, { borderBottomColor: activeTab === 'Active' ? theme.primary : 'transparent' }]}>
                  <Text style={[styles.tabText, activeTab === 'Active' && { color: theme.primary } ]}>Active Tasks ({activeTasks.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('Completed')} style={[styles.tabBtn, { borderBottomColor: activeTab === 'Completed' ? theme.primary : 'transparent' }]}>
                  <Text style={[styles.tabText, activeTab === 'Completed' && { color: theme.primary } ]}>Completed ({completedTasks.length})</Text>
                </TouchableOpacity>
              </View>
              {activeTab === 'Active' && (
                <View style={{ marginTop: 16 }}>
                  {tasksLoading ? (
                    <Text style={styles.noTasksText}>Loading tasks...</Text>
                  ) : tasksError ? (
                    <Text style={[styles.noTasksText, { color: '#ef4444' }]}>{tasksError}</Text>
                  ) : activeTasks.length === 0 ? (
                    <Text style={styles.noTasksText}>No active tasks. Add your first task above!</Text>
                  ) : (
                    activeTasks.map(task => (
                      <View key={task.id} style={[styles.taskItem, { borderLeftColor: PRIORITIES.find(p => p.label === task.priority)?.color || '#3b82f6' }]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          {editTaskId === task.id ? (
                            <>
                              <TextInput
                                style={[styles.taskText, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 6, marginRight: 8 }]}
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
                              <Text style={styles.taskText}>{task.title}</Text>
                            </TouchableOpacity>
                          )}
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {PRIORITIES.map(p => (
                              <TouchableOpacity
                                key={p.label}
                                style={[styles.priorityDot, { backgroundColor: p.color, opacity: task.priority === p.label ? 1 : 0.3 }]}
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
                                <TouchableOpacity key={st.id} style={styles.subTaskRow} onPress={() => handleToggleSubTask(task.id, st.id, st.completed)}>
                                  <Ionicons name={st.completed ? 'checkbox' : 'square-outline'} size={20} color={st.completed ? '#22c55e' : '#888'} />
                                  <Text style={[styles.subTaskText, st.completed && { textDecorationLine: 'line-through', color: '#aaa' }]}>{st.title || st.text}</Text>
                                </TouchableOpacity>
                              ))
                            )}
                            <View style={styles.addSubTaskRow}>
                              <TextInput
                                style={styles.subTaskInput}
                                placeholder="Add sub-task..."
                                value={subTaskInput[task.id] || ''}
                                onChangeText={txt => setSubTaskInput(prev => ({ ...prev, [task.id]: txt }))}
                                onSubmitEditing={() => handleAddSubTask(task.id)}
                              />
                              <TouchableOpacity onPress={() => handleAddSubTask(task.id)} style={styles.addSubTaskBtn}>
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
                  {completedTasks.length === 0 && <Text style={styles.noTasksText}>No completed tasks yet.</Text>}
                  {completedTasks.map(task => (
                    <View key={task.id} style={[styles.taskItem, { borderLeftColor: PRIORITIES.find(p => p.label === task.priority)?.color || '#3b82f6', opacity: 0.6 }]}> 
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name={'checkmark-done'} size={18} color="#22c55e" style={{ marginRight: 8 }} />
                          <Text style={[styles.taskText, { textDecorationLine: 'line-through', color: '#aaa' }]}>{task.title}</Text>
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
                            <View key={st.id} style={styles.subTaskRow}>
                              <Ionicons name={st.completed ? 'checkbox' : 'square-outline'} size={20} color={st.completed ? '#22c55e' : '#888'} />
                              <Text style={[styles.subTaskText, { textDecorationLine: 'line-through', color: '#aaa' }]}>{st.title || st.text}</Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.insightsTitle}>AI-Powered Insights</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Nora' as never)}
                    style={{ marginLeft: 8, backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Ask Nora</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleRefreshData}>
                  <Ionicons name="refresh" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              
              {userDataLoading ? (
                <Text style={styles.noTasksText}>Analyzing your study patterns...</Text>
              ) : userDataError ? (
                <View>
                  <Text style={[styles.noTasksText, { color: '#ef4444' }]}>Error loading insights</Text>
                  <TouchableOpacity onPress={handleRefreshData} style={{ marginTop: 8 }}>
                    <Text style={{ color: theme.primary, textAlign: 'center' }}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : userData?.insights && userData.insights.length > 0 ? (
                userData.insights.map((insight, idx) => (
                  <View key={insight.id || idx} style={styles.insightBox}>
                    <Text style={styles.insightTitle}>{insight.insight_type}</Text>
                    <Text style={styles.insightDesc}>{insight.content}</Text>
                    {insight.insight_type === 'Action Needed' && (
                      <TouchableOpacity style={[styles.focusNowBtn, { backgroundColor: theme.primary }]} onPress={handleFocusNow}>
                        <Text style={[styles.focusNowText, { color: '#FFFFFF' }]}>Focus now</Text>
                        <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <View>
                  <Text style={styles.noTasksText}>Let me help you improve your study habits!</Text>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '10', padding: 12, borderRadius: 8 }}
                      onPress={() => navigation.navigate('Settings' as never)}
                    >
                      <Ionicons name="settings-outline" size={20} color={theme.primary} />
                      <Text style={{ marginLeft: 8, color: theme.text, flex: 1 }}>Adjust your study preferences and goals</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '10', padding: 12, borderRadius: 8 }}
                      onPress={() => navigation.navigate('StudySessionScreen' as never, { autoStart: false, manualSelection: true })}
                    >
                      <Ionicons name="timer-outline" size={20} color={theme.primary} />
                      <Text style={{ marginLeft: 8, color: theme.text, flex: 1 }}>Start your first focus session</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '10', padding: 12, borderRadius: 8 }}
                      onPress={() => navigation.navigate('Nora' as never)}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
                      <Text style={{ marginLeft: 8, color: theme.text, flex: 1 }}>Chat with Nora for personalized study tips</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
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
                <Text style={styles.leaderboardTitle}>Focus Leaderboard</Text>
                <TouchableOpacity onPress={handleViewLeaderboard}>
                  <Text style={styles.leaderboardViewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {/* User's Weekly Goal */}
              {userData?.leaderboard && (
                <Text style={styles.leaderboardGoal}>
                  Your Weekly Goal: {Math.round((userData.weeklyFocusTime || 0) / 60)}/
                  {userData.onboarding?.weekly_focus_goal || 10} hours
                </Text>
              )}
              
              {/* Daily inspiration */}
              {inspiration && (
                <View style={{ 
                  marginTop: 12, 
                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                  padding: 12,
                  borderRadius: 8
                }}>
                  <Text style={{ 
                    fontStyle: 'italic',
                    textAlign: 'center',
                    color: theme.text,
                    fontSize: 14
                  }}>
                    "{inspiration}"
                  </Text>
                </View>
              )}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>Weekly Progress</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity 
                    onPress={() => setProgressTab('FocusTime')}
                    style={[
                      progressTab === 'FocusTime' ? styles.progressTabActive : styles.progressTab,
                      { borderBottomColor: theme.primary }
                    ]}
                  >
                    <Text style={[
                      styles.progressTabText, 
                      { color: progressTab === 'FocusTime' ? theme.primary : '#888' }
                    ]}>
                      Focus Time
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setProgressTab('Tasks')}
                    style={[
                      progressTab === 'Tasks' ? styles.progressTabActive : styles.progressTab,
                      { borderBottomColor: theme.primary }
                    ]}
                  >
                    <Text style={[
                      styles.progressTabText, 
                      { color: progressTab === 'Tasks' ? theme.primary : '#888' }
                    ]}>
                      Tasks
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {progressTab === 'FocusTime' ? (
                <View>
                  {userData && userData.dailyFocusData ? (
                    <View>
                      {userData.dailyFocusData.some(item => item.hours > 0) ? (
                        <ChartKitBarChart
                          data={{
                            labels: userData.dailyFocusData.map((item: any) => item.day),
                            datasets: [{
                              data: userData.dailyFocusData.map((item: any) => item.hours || 0.1) // Use 0.1 for empty bars
                            }]
                          }}
                          width={Dimensions.get("window").width - 60}
                          height={180}
                          yAxisLabel=""
                          yAxisSuffix="h"
                          yAxisInterval={1}
                          chartConfig={{
                            backgroundColor: theme.card,
                            backgroundGradientFrom: theme.card,
                            backgroundGradientTo: theme.card,
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                              borderRadius: 12
                            },
                            propsForDots: {
                              r: "6",
                              strokeWidth: "2",
                              stroke: "#ffa726"
                            }
                          }}
                          style={{
                            marginVertical: 8,
                            borderRadius: 12
                          }}
                        />
                      ) : (
                        <Text style={{ color: '#888', textAlign: 'center', marginVertical: 30 }}>
                          No focus time recorded this week
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={{ color: '#888', textAlign: 'center', marginVertical: 30 }}>
                      Loading focus data...
                    </Text>
                  )}
                </View>
              ) : (
                <View>
                  {userData && userData.dailyTasksCompleted ? (
                    <View>
                      {userData.dailyTasksCompleted.some((item: any) => item.count > 0) ? (
                        <ChartKitBarChart
                          data={{
                            labels: userData.dailyTasksCompleted.map((item: any) => item.day),
                            datasets: [{
                              data: userData.dailyTasksCompleted.map((item: any) => item.count || 0.1) // Use 0.1 for empty bars
                            }]
                          }}
                          width={Dimensions.get("window").width - 60}
                          height={180}
                          yAxisLabel=""
                          yAxisSuffix=""
                          yAxisInterval={1}
                          chartConfig={{
                            backgroundColor: theme.card,
                            backgroundGradientFrom: theme.card,
                            backgroundGradientTo: theme.card,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                              borderRadius: 12
                            },
                            propsForDots: {
                              r: "6",
                              strokeWidth: "2",
                              stroke: "#ffa726"
                            }
                          }}
                          style={{
                            marginVertical: 8,
                            borderRadius: 12
                          }}
                        />
                      ) : (
                        <Text style={{ color: '#888', textAlign: 'center', marginVertical: 30 }}>
                          No completed tasks this week
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={{ color: '#888', textAlign: 'center', marginVertical: 30 }}>
                      Loading task data...
                    </Text>
                  )}
                </View>
              )}
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
                <Text style={styles.progressTitle}>Achievements</Text>
                {userData?.achievements && userData.achievements.length > 1 && (
                  <View style={styles.achievementDots}>
                    {userData.achievements.map((_, index) => (
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

              {userDataLoading ? (
                <Text style={styles.noTasksText}>Loading achievements...</Text>
              ) : userDataError ? (
                <Text style={[styles.noTasksText, { color: '#ef4444' }]}>
                  Error loading achievements
                </Text>
              ) : !userData?.achievements || userData.achievements.length === 0 ? (
                <Text style={styles.noTasksText}>No achievements yet.</Text>
              ) : (
                <Animated.View 
                  style={[
                    { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: theme.border || '#E0E0E0', opacity: 1 }
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
                        {userData.achievements[0].achievement_type}
                      </Text>
                      <Text style={styles.achievementDescription}>
                        {userData.achievements[0].description}
                      </Text>
                      <Text style={styles.achievementDate}>
                        Earned: {new Date(userData.achievements[0].earned_at).toLocaleDateString()}
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
              <Text style={styles.inspirationTitle}>Daily Inspiration</Text>
              {userDataLoading ? (
                <Text style={styles.inspirationQuote}>Loading...</Text>
              ) : userDataError ? (
                <Text style={[styles.inspirationQuote, { color: '#ef4444' }]}>Error loading inspiration</Text>
              ) : inspiration ? (
                <Text style={styles.inspirationQuote}>{inspiration}</Text>
              ) : (
                <Text style={styles.inspirationQuote}>No inspiration for today.</Text>
              )}
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      )}
      
      {/* Enhanced Priority Modal */}
      <Modal visible={showPriorityModal} transparent animationType="fade">
        <View style={priorityModalStyles.overlay}>
          <View style={priorityModalStyles.modalBox}>
            <Text style={priorityModalStyles.modalTitle}>Start Focus Session</Text>
            <Text style={priorityModalStyles.modalDesc}>
              Choose how you want to set up your study session.
            </Text>
            
            {/* Automatic Selection */}
            <View style={priorityModalStyles.workStyleSection}>
              <Text style={priorityModalStyles.sectionTitle}>Automatic Setup</Text>
              <Text style={priorityModalStyles.workStyleInfo}>
                Uses your work style ({userData?.onboarding?.work_style || 'Balanced'}) and task priorities automatically.
              </Text>
              <TouchableOpacity 
                style={priorityModalStyles.useWorkStyleBtn}
                onPress={() => handlePriorityChoice(true)}
              >
                <MaterialIcons name="autorenew" size={20} color="#fff" />
                <Text style={priorityModalStyles.useWorkStyleBtnText}>Quick Start (Automatic)</Text>
              </TouchableOpacity>
            </View>

            {/* Manual Selection */}
            <View style={priorityModalStyles.manualSection}>
              <Text style={priorityModalStyles.sectionTitle}>Custom Setup</Text>
              <Text style={priorityModalStyles.manualInfo}>
                Manually select tasks, subjects, and session duration.
              </Text>
              <TouchableOpacity 
                style={priorityModalStyles.manualBtn}
                onPress={() => handlePriorityChoice(false)}
              >
                <MaterialIcons name="tune" size={20} color="#2196F3" />
                <Text style={priorityModalStyles.manualBtnText}>Custom Setup (Manual)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={priorityModalStyles.cancelBtn}
              onPress={() => setShowPriorityModal(false)}
            >
              <Text style={priorityModalStyles.cancelBtnText}>Cancel</Text>
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
  timerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginVertical: 10,
    gap: 12 // Add spacing between sections
  },
  timerSectionBox: {
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  timerMainSection: {
    flex: 2, // Make the main timer section larger
    minHeight: 100,
  },
  timerInfoLabel: { 
    color: '#888', 
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  timerMain: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#388E3C',
    textAlign: 'center'
  },
  timerMainLabel: { 
    color: '#888', 
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FCF8',
  },
  scrollView: {
    flex: 1,
  },
  focusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  focusCardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1B5E20',
    marginBottom: 4,
  },
  focusCardDesc: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  focusOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  focusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  autoBtnStyle: {
    backgroundColor: '#4CAF50',
  },
  manualBtnStyle: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  focusBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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

const priorityModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 20,
  },
  workStyleSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  manualSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  workStyleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  manualInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  useWorkStyleBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  useWorkStyleBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  manualBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
    gap: 8,
  },
  manualBtnText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 16,
  },
});
