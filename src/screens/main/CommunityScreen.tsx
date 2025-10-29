import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSupabaseStudyRooms } from '../../utils/supabaseHooks';
import { supabase } from '../../utils/supabase';
import * as FriendService from '../../utils/friendRequestService';
import * as MessageService from '../../utils/messagingService';
import * as StudyRoomService from '../../utils/studyRoomService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import FriendRequestNotification from '../../components/FriendRequestNotification';
import MessageNotification from '../../components/MessageNotification';
import StudyRoomInvitations from '../../components/StudyRoomInvitations';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';

const TABS = ['Friends', 'Messages', 'All Users', 'Study Rooms'];
const MOCK_FRIENDS = [
  { id: '1', name: 'Nikolai', joined: '3/18/2025' },
  { id: '2', name: 'Owner', joined: '3/17/2025' },
];
const MOCK_MESSAGES = [
  {
    id: '1',
    name: 'Nikolai',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    lastMessage: 'You: Hlkf',
    time: 'about 1 month',
    read: true,
  },
  {
    id: '2',
    name: 'Owner',
    avatar: '',
    lastMessage: 'You: rude',
    time: 'about 1 month',
    read: true,
  },
];
const MOCK_USERS = [
  { id: '1', name: 'LK', joined: '4/18/2025' },
  { id: '2', name: 'Jack', joined: '4/18/2025' },
  { id: '3', name: 'KadenJ141', joined: '3/25/2025' },
  { id: '4', name: 'A.Green', joined: '3/25/2025' },
  { id: '5', name: 'AMG723', joined: '3/24/2025' },
  { id: '6', name: 'Xstahmx', joined: '3/22/2025' },
  { id: '7', name: 'jahol', joined: '3/20/2025' },
  { id: '8', name: 'OliveBoi23', joined: '3/19/2025' },
  { id: '9', name: 'T_Whid', joined: '3/19/2025' },
  { id: '10', name: 'AnamariaCarey', joined: '3/19/2025' },
  { id: '11', name: 'marissailee', joined: '3/18/2025' },
  { id: '12', name: 'jackenH', joined: '3/18/2025' },
  { id: '13', name: 'JaxKa', joined: '3/18/2025' },
  { id: '14', name: 'Nikolai', joined: '3/18/2025' },
  { id: '15', name: 'jkzh', joined: '3/17/2025' },
  { id: '16', name: 'Jakzh', joined: '3/17/2025' },
  { id: '17', name: 'abjak', joined: '3/17/2025' },
  { id: '18', name: 'Owner', joined: '3/17/2025' },
  { id: '19', name: 'Katzh', joined: '3/17/2025' },
  { id: '20', name: 'Hollaj', joined: '3/17/2025' },
];
const MOCK_STUDY_ROOMS = [
  {
    id: '1',
    title: 'Market Minds',
    live: true,
    participants: 3,
    topic: "Nikolai's project",
    creator: 'Hjack',
    avatars: [
      'https://randomuser.me/api/portraits/men/1.jpg',
      'https://randomuser.me/api/portraits/men/2.jpg',
      '', // fallback to initial
    ],
  },
];

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  created_at: string;
  status: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
  sender?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    email?: string;
    status?: string;
  };
  recipient?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    email?: string;
    status?: string;
  };
}

const CommunityScreen = () => {
  const route = useRoute<any>();
  const initialTab = route.params?.initialTab || 'All Users';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [participantLimit, setParticipantLimit] = useState('5');
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [createdRooms, setCreatedRooms] = useState<any[]>([]);
  const [pendingFriendRequestIds, setPendingFriendRequestIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addFriendEmail, setAddFriendEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [studyRooms, setStudyRooms] = useState<any[]>([]);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const { theme } = useTheme();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow'>('online');
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendService.FriendRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendService.FriendRequest[]>([]);
  const [friendsList, setFriendsList] = useState<FriendService.Friend[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showFriendRequestNotification, setShowFriendRequestNotification] = useState(false);
  const [showMessageNotification, setShowMessageNotification] = useState(false);
  const [showStudyRoomInvitations, setShowStudyRoomInvitations] = useState(false);
  const [pendingStudyRoomInvitations, setPendingStudyRoomInvitations] = useState<StudyRoomService.StudyRoomInvitation[]>([]);

  const acceptedFriendIds = useMemo(
    () => new Set(friendsList.map(friend => friend.friend_id)),
    [friendsList]
  );
  const incomingFriendRequestIds = useMemo(
    () => new Set(incomingFriendRequests.map(request => request.sender_id)),
    [incomingFriendRequests]
  );
  const outgoingFriendRequestIds = useMemo(
    () => new Set(outgoingFriendRequests.map(request => request.recipient_id)),
    [outgoingFriendRequests]
  );
  const userProfileMap = useMemo(() => {
    const map = new Map<string, Partial<User>>();

    users.forEach(user => {
      map.set(user.id, user);
    });

    friendsList.forEach(friend => {
      if (friend.friend_profile?.id) {
        map.set(friend.friend_profile.id, {
          ...map.get(friend.friend_profile.id),
          ...friend.friend_profile,
        });
      }
    });

    incomingFriendRequests.forEach(request => {
      if (request.sender?.id) {
        map.set(request.sender.id, {
          ...map.get(request.sender.id),
          ...request.sender,
        });
      }
    });

    outgoingFriendRequests.forEach(request => {
      if ((request as any).recipient?.id) {
        const recipient = (request as any).recipient;
        map.set(recipient.id, {
          ...map.get(recipient.id),
          ...recipient,
        });
      }
    });

    return map;
  }, [users, friendsList, incomingFriendRequests, outgoingFriendRequests]);

  // Helper for faded primary color
  const fadedPrimary = theme.primary + '22'; // 13% opacity hex fallback

  // Fetch current user and session
  useEffect(() => {
    const fetchUserAndSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      setAccessToken(session?.access_token || null);
    };
    fetchUserAndSession();
  }, []);

  // Load friend requests and friends data
  const loadFriendsData = async () => {
    if (!currentUser) return;

    try {
      // Load incoming friend requests
      const incomingResult = await FriendService.getPendingFriendRequests();
      if (incomingResult.success) {
        setIncomingFriendRequests(incomingResult.data || []);
        // Don't automatically show notification - let user control when to view
      }

      // Load outgoing friend requests
      const outgoingResult = await FriendService.getSentFriendRequests();
      if (outgoingResult.success) {
        setOutgoingFriendRequests(outgoingResult.data || []);
      }

      // Load friends list
      const friendsResult = await FriendService.getFriendsList();
      if (friendsResult.success) {
        setFriendsList(friendsResult.data || []);
      }

      // Load unread message count
      const unreadResult = await MessageService.getUnreadMessageCount();
      if (unreadResult.success) {
        setUnreadMessageCount(unreadResult.count || 0);
        // Show message notification if there are unread messages
        if ((unreadResult.count || 0) > 0) {
          setShowMessageNotification(true);
        }
      }

      // Load study room invitations
      const invitationsResult = await StudyRoomService.getPendingStudyRoomInvitations();
      if (invitationsResult.success) {
        setPendingStudyRoomInvitations(invitationsResult.data || []);
        // Show study room invitations if there are pending invitations
        if ((invitationsResult.data || []).length > 0) {
          setShowStudyRoomInvitations(true);
        }
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadFriendsData();
    }
  }, [currentUser]);

  // Fetch user conversations with last messages
  useEffect(() => {
    const fetchUserConversations = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch all messages where user is sender or recipient
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, full_name, username, email, avatar_url, status),
            recipient:recipient_id(id, full_name, username, email, avatar_url, status)
          `)
          .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });

        if (msgError) throw msgError;

        // Group messages by conversation partner
        const conversationMap = new Map();
        
        messages?.forEach(msg => {
          const partnerId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
          const partner = msg.sender_id === currentUser.id ? msg.recipient : msg.sender;
          
          if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, {
              id: partnerId,
              partner: partner,
              lastMessage: msg,
              lastMessageTime: msg.created_at,
              unreadCount: 0
            });
          }
          
          // Count unread messages
          if (msg.recipient_id === currentUser.id && !msg.is_read) {
            const conv = conversationMap.get(partnerId);
            conv.unreadCount++;
          }
        });

        setUserConversations(Array.from(conversationMap.values()));
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    };

    fetchUserConversations();
  }, [currentUser]);

  // Fetch all users and friend requests
  useEffect(() => {
    const fetchUsersAndRequests = async () => {
      if (!currentUser) {
        console.log('❌ No current user, skipping fetch');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Starting user and friend requests fetch...');
        console.log('👤 Current user ID:', currentUser.id);
        
        // Test basic connection first
        try {
          await withTimeout(
            supabase.from('profiles').select('count').limit(1),
            3000
          );
          console.log('✅ Basic connection test passed');
        } catch (connError) {
          console.log('❌ Basic connection test failed:', connError.message);
          throw new Error('Unable to connect to the server. Please check your internet connection.');
        }
        
        // Fetch users with enhanced retry logic
        console.log('📊 Fetching users...');
        let usersResult;
        try {
          usersResult = await fetchWithRetry(async () => {
            return await supabase
              .from('profiles')
              .select('id, email, username, full_name, avatar_url, university, major, created_at, status')
              .neq('id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(50); // Limit results to improve performance
          }, 2); // Reduce retries for faster failure

          if (usersResult.error) {
            console.log('❌ Users fetch error:', usersResult.error);
            throw usersResult.error;
          }
          
          console.log(`✅ Users fetched: ${usersResult.data?.length || 0} users`);
        } catch (usersError) {
          console.log('❌ Users fetch failed completely:', usersError.message);
          // Don't throw here, continue with empty users list
          usersResult = { data: [], error: null };
        }

        // Fetch friend requests (with fallback)
        console.log('🤝 Fetching friend requests...');
        let requestsResult;
        try {
          requestsResult = await fetchWithRetry(async () => {
            return await supabase
              .from('friend_requests')
              .select('id, sender_id, recipient_id, status, created_at')
              .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
              .limit(100);
          }, 2);

          if (requestsResult.error) {
            console.log('❌ Friend requests fetch error:', requestsResult.error);
            throw requestsResult.error;
          }
          
          console.log(`✅ Friend requests fetched: ${requestsResult.data?.length || 0} requests`);
        } catch (requestsError) {
          console.log('⚠️ Friend requests fetch failed, continuing without them:', requestsError.message);
          requestsResult = { data: [], error: null };
        }

        // Update state with fetched data
        setUsers(usersResult.data || []);
        setFriendRequests(requestsResult.data || []);
        
        console.log('✅ Data fetch completed successfully');
        console.log(`📊 Final counts - Users: ${usersResult.data?.length || 0}, Friend requests: ${requestsResult.data?.length || 0}`);

      } catch (err: any) {
        console.error('❌ Critical error in fetchUsersAndRequests:', err);
        
        // Provide specific error messages based on error type
        let userMessage = 'Unable to load community data. Please try again.';
        
        if (err.message.includes('timeout') || err.message.includes('Request timeout')) {
          userMessage = 'Connection timeout. Please check your internet connection and try again.';
          setNetworkStatus('slow');
        } else if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
          userMessage = 'Network connection failed. Please check your internet and try again.';
          setNetworkStatus('offline');
        } else if (err.message.includes('Unable to connect')) {
          userMessage = err.message; // Use our custom connection message
          setNetworkStatus('offline');
        }
        
        setError(userMessage);
        
        // Provide fallback empty data
        setUsers([]);
        setFriendRequests([]);
        
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndRequests();

    // Set up real-time subscription using the new API
    const channel = supabase
      .channel('community-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        payload => {
          console.log('Friends change received!', payload);
          fetchUsersAndRequests();
          loadFriendsData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        payload => {
          console.log('Friend request change received!', payload);
          fetchUsersAndRequests();
          loadFriendsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Add a refresh function
  const refreshData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

      if (requestsError) throw requestsError;

      setUsers(usersData || []);
      setFriendRequests(requestsData || []);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Study Room creation handler
  const handleCreateRoom = async () => {
    if (!currentUser) return;
    
    // Basic validation
    if (!newRoomName.trim() || !newTopic.trim()) {
      Alert.alert('Validation Error', 'Please fill in the room name and topic.');
      return;
    }
    
    try {
      const result = await StudyRoomService.createStudyRoom({
        name: newRoomName.trim(),
        description: newDescription.trim(),
        subject: newTopic.trim(),
        max_participants: Number(participantLimit) || 5,
        session_duration: 25,
        break_duration: 5,
        is_public: true
      });

      if (result.success && result.data) {
        // Reset form and close modal
        setNewRoomName('');
        setNewTopic('');
        setNewDescription('');
        setNewSchedule('');
        setNewDuration('');
        setParticipantLimit('5');
        setShowCreateModal(false);

        // Navigate to the new room
        navigation.navigate('StudyRoomScreen', { room: result.data });
        
        // Refresh study rooms list
        loadUserStudyRooms();
      } else {
        Alert.alert('Error', result.error || 'Failed to create study room');
      }
    } catch (error: any) {
      console.error('Error creating study room:', error);
      Alert.alert('Error', 'Failed to create study room. Please try again.');
    }
  };

  // Join room handler
  const handleJoinRoom = async (room: any) => {
    if (!currentUser) return;

    try {
      const result = await StudyRoomService.joinStudyRoom(room.id);
      
      if (result.success) {
        navigation.navigate('StudyRoomScreen', { room: result.data || room });
        // Refresh study rooms list
        loadUserStudyRooms();
      } else {
        if (result.error === 'You are already in this study room') {
          // User is already in the room, just navigate to it
          navigation.navigate('StudyRoomScreen', { room });
        } else {
          Alert.alert('Error', result.error || 'Failed to join study room');
        }
      }
    } catch (error: any) {
      console.error('Error joining study room:', error);
      Alert.alert('Error', 'Failed to join study room. Please try again.');
    }
  };

  // Helper functions for status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return '#4CAF50';
      case 'busy':
        return '#FF9800';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      default:
        return 'Offline';
    }
  };

  // Enhanced handleAddFriend with better error handling:
  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to send friend requests.');
      return;
    }

    console.log(`🤝 Starting friend request for user: ${friendId}`);

    try {
      // Add to pending state immediately for UI feedback
      setPendingFriendRequestIds(prev => [...prev, friendId]);

      // Use the new friend service
      const result = await FriendService.sendFriendRequest(friendId);
      
      if (result.success) {
        Alert.alert('Success', 'Friend request sent!');
        // Refresh the data
        await loadFriendsData();
        setPendingFriendRequestIds(prev => prev.filter(id => id !== friendId));
      } else {
        // Remove from pending state on error
        setPendingFriendRequestIds(prev => prev.filter(id => id !== friendId));
        Alert.alert('Error', result.error || 'Failed to send friend request');
      }
    } catch (error: any) {
      // Remove from pending state on error
      setPendingFriendRequestIds(prev => prev.filter(id => id !== friendId));
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  // Handler for accepting friend requests
  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const result = await FriendService.respondToFriendRequest(requestId, 'accepted');
      
      if (result.success) {
        Alert.alert('Success', 'Friend request accepted!');
        await loadFriendsData();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  // Handler for declining friend requests
  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      const result = await FriendService.respondToFriendRequest(requestId, 'declined');
      
      if (result.success) {
        Alert.alert('Success', 'Friend request declined');
        await loadFriendsData();
      } else {
        Alert.alert('Error', result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  // Handler for searching users
  const handleSearchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await FriendService.searchUsers(query.trim());
      if (result.success) {
        setSearchResults(result.data || []);
      } else {
        console.error('Search error:', result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  // Handle message navigation with real user data
  const handleMessageUser = (user: User) => {
    navigation.navigate('MessageScreen', { 
      contact: { 
        name: user.full_name || user.username || user.email, 
        avatar: user.avatar_url || '', 
        status: getStatusLabel(user.status)
      } 
    });
  };

  // Move hooks inside component to access currentUser and accessToken
  function useSupabaseConversations(user: any) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const fetchConvos = async () => {
        setLoading(true);
        if (!user) { setConversations([]); setLoading(false); return; }
        const { data, error } = await supabase
          .from('conversations')
          .select('*, participants:conversation_participants(user_id, profile:profiles(*))')
          .contains('participants', [user.id]);
        setConversations(data || []);
        setLoading(false);
      };
      fetchConvos();
    }, [user]);
    return { conversations, loading };
  }
  function useSupabaseAllUsers(user: any) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const fetchUsers = async () => {
        setLoading(true);
        if (!user) { setUsers([]); setLoading(false); return; }
        const { data, error } = await supabase.from('profiles').select('*');
        setUsers(data?.filter((u: any) => u.id !== user.id) || []);
        setLoading(false);
      };
      fetchUsers();
    }, [user]);
    return { users, loading };
  }

  const { conversations, loading: conversationsLoading } = useSupabaseConversations(currentUser);
  const { users: allUsers, loading: allUsersLoading } = useSupabaseAllUsers(currentUser);
  const { rooms: roomsData, loading: studyRoomsLoading, error: studyRoomsError } = useSupabaseStudyRooms();

  // Update studyRooms with hook data
  useEffect(() => {
    if (roomsData && roomsData.length > 0) {
      setStudyRooms(roomsData);
    }
  }, [roomsData]);

  // Load user's study rooms - now handled by useSupabaseStudyRooms hook
  const loadUserStudyRooms = async () => {
    // This function is kept for compatibility but the actual loading 
    // is handled by the useSupabaseStudyRooms hook and the useEffect above
    console.log('Study rooms loading handled by hook');
  };

  // Fetch user's study rooms
  useEffect(() => {
    loadUserStudyRooms();
  }, [currentUser]);

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.university?.toLowerCase().includes(searchLower)
    );
  });

  // Handle sending message
  const handleSendMessage = async () => {
    if (!currentUser || !selectedUser || !messageText.trim()) return;

    try {
      // First, ensure a conversation exists
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          user_id: currentUser.id,
          participant_id: selectedUser.id
        }])
        .select()
        .single();

      if (convError) throw convError;

      // Then, send the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: currentUser.id,
          content: messageText.trim()
        }]);

      if (messageError) throw messageError;

      setMessageText('');
      setShowMessageModal(false);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Check if a friend request exists
  const getFriendStatus = (userId: string) => {
    if (!currentUser) return null;

    if (acceptedFriendIds.has(userId)) {
      return 'accepted';
    }
    if (incomingFriendRequestIds.has(userId)) {
      return 'incoming';
    }
    if (outgoingFriendRequestIds.has(userId)) {
      return 'pending';
    }

    const legacyRequest = friendRequests.find(
      r =>
        ('sender_id' in r
          ? (r as any).sender_id === currentUser.id && (r as any).recipient_id === userId
          : (r as any).user_id === currentUser.id && (r as any).friend_id === userId) ||
        ('sender_id' in r
          ? (r as any).sender_id === userId && (r as any).recipient_id === currentUser.id
          : (r as any).user_id === userId && (r as any).friend_id === currentUser.id)
    );

    if (!legacyRequest) {
      return null;
    }

    if ((legacyRequest as any).status === 'accepted') {
      return 'accepted';
    }

    if ('sender_id' in legacyRequest) {
      return (legacyRequest as any).sender_id === currentUser.id ? 'pending' : 'incoming';
    }

    return legacyRequest.status || null;
  };

  // Accept/decline friend request
  // Add these network-safe functions to CommunityScreen.tsx:

  // Network-safe fetch with retry logic - ENHANCED VERSION
  const fetchWithRetry = async (operation: () => Promise<any>, retries = 3): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Network attempt ${i + 1}/${retries}`);
        const result = await withTimeout(operation(), 8000); // 8 second timeout
        console.log(`✅ Network operation succeeded on attempt ${i + 1}`);
        return result;
      } catch (error: any) {
        console.log(`❌ Attempt ${i + 1} failed:`, error.message);
        
        if (i === retries - 1) {
          // Last attempt failed
          console.log(`🚫 All ${retries} attempts failed`);
          throw new Error(`Network operation failed after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Enhanced network status checker
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout;
    let isComponentMounted = true;
    let lastCheckTime = 0;

    const checkNetworkStatus = async () => {
      if (!isComponentMounted) return;
      
      // Prevent too frequent checks (debounce)
      const now = Date.now();
      if (now - lastCheckTime < 10000) { // Minimum 10 seconds between checks
        return;
      }
      lastCheckTime = now;
      
      try {
        console.log('🌐 Checking network status...');
        const start = Date.now();
        
        await withTimeout(
          supabase.from('profiles').select('count').limit(1),
          5000
        );
        
        const elapsed = Date.now() - start;
        console.log(`⏱️ Network check completed in ${elapsed}ms`);
        
        if (elapsed > 3000) {
          console.log('🐌 Slow connection detected');
          setNetworkStatus('slow');
        } else {
          console.log('🚀 Good connection');
          setNetworkStatus('online');
        }
        
      } catch (error: any) {
        console.log('❌ Network check failed:', error.message);
        
        if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
          setNetworkStatus('slow');
        } else {
          setNetworkStatus('offline');
        }
      }
    };

    // Initial check with delay
    const timeoutId = setTimeout(checkNetworkStatus, 1000);
    
    // Set up periodic checks (less frequent)
    statusCheckInterval = setInterval(checkNetworkStatus, 60000); // Every 60 seconds instead of 30
    
    return () => {
      isComponentMounted = false;
      clearTimeout(timeoutId);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, []);

  // Add emergency offline mode data
  const getOfflineFallbackData = () => {
    console.log('📱 Switching to offline mode with cached data');
    
    // Return minimal fallback data
    return {
      users: [],
      friendRequests: [],
      studyRooms: [],
      conversations: []
    };
  };

  // Update your useEffect to use fallback data when network fails completely
  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchUsersAndRequests();
      } catch (criticalError) {
        console.log('🚨 Critical network failure, using offline mode');
        const fallbackData = getOfflineFallbackData();
        setUsers(fallbackData.users);
        setFriendRequests(fallbackData.friendRequests);
        setFriendsList([]);
        setIncomingFriendRequests([]);
        setOutgoingFriendRequests([]);
        setStudyRooms([]);
        setUserConversations([]);
        setError('App is running in offline mode. Some features may be limited.');
      }
    };

    if (currentUser) {
      initializeData();
    }
  }, [currentUser]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          {/* Unified Header */}
          <UnifiedHeader title="Pathfinder" onClose={() => navigation.navigate('Home')} />

          {/* Search Bar with Friend Request Button */}
          <View style={[styles.searchContainer, { backgroundColor: theme.card, marginTop: 20 }]}>
            <Ionicons name="search" size={20} color={theme.primary} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search users, messages, or study rooms.."
              placeholderTextColor={theme.text + '99'}
              value={search}
              onChangeText={setSearch}
            />
            {/* Friend Request Button */}
            {incomingFriendRequests.length > 0 && (
              <TouchableOpacity
                style={styles.friendRequestButton}
                onPress={() => setShowFriendRequestNotification(!showFriendRequestNotification)}
              >
                <Ionicons name="person-add" size={20} color={theme.primary} />
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>{incomingFriendRequests.length}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabRow, { backgroundColor: theme.card }]}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && [styles.activeTab, { backgroundColor: theme.primary + '22' }]]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText, { color: activeTab === tab ? theme.primary : theme.text + '99' }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content based on active tab */}
          {activeTab === 'Friends' && (
            <>
              {incomingFriendRequests.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: theme.primary, marginBottom: 6 }}>
                    Friend Requests
                  </Text>
                  {incomingFriendRequests.map(request => {
                    const senderProfile =
                      request.sender ||
                      userProfileMap.get(request.sender_id) ||
                      {};
                    const displayName =
                      (senderProfile as any).full_name ||
                      (senderProfile as any).username ||
                      (senderProfile as any).email ||
                      'New Study Friend';

                    return (
                      <View
                        key={request.id}
                        style={[
                          styles.friendCard,
                          { backgroundColor: theme.card, borderColor: theme.primary },
                        ]}
                      >
                        <View style={styles.avatarCircle}>
                          {(senderProfile as any).avatar_url ? (
                            <Image source={{ uri: (senderProfile as any).avatar_url }} style={styles.avatarCircle} />
                          ) : (
                            <Text style={[styles.avatarText, { color: theme.primary }]}>
                              {displayName[0] || '?'}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.friendName, { color: theme.text }]}>{displayName}</Text>
                          <Text style={[styles.friendJoined, { color: theme.text + '99' }]}>
                            {request.message
                              ? `"${request.message}"`
                              : 'sent you a friend request'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity
                            style={styles.friendIconBtn}
                            onPress={() => handleAcceptFriendRequest(request.id)}
                          >
                            <Ionicons name="checkmark" size={22} color={theme.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.friendIconBtn}
                            onPress={() => handleDeclineFriendRequest(request.id)}
                          >
                            <Ionicons name="close" size={22} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <FlatList
                data={friendsList}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const profile =
                    item.friend_profile ||
                    userProfileMap.get(item.friend_id) ||
                    {};
                  const displayName =
                    (profile as any).full_name ||
                    (profile as any).username ||
                    (profile as any).email ||
                    'Study Friend';

                  return (
                    <View
                      style={[
                        styles.friendCard,
                        { backgroundColor: theme.card, borderColor: theme.primary },
                      ]}
                    >
                      <View style={styles.avatarCircle}>
                        {(profile as any).avatar_url ? (
                          <Image source={{ uri: (profile as any).avatar_url }} style={styles.avatarCircle} />
                        ) : (
                          <Text style={[styles.avatarText, { color: theme.primary }]}>
                            {displayName[0] || '?'}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.friendName, { color: theme.text }]}>{displayName}</Text>
                        <Text style={[styles.friendJoined, { color: theme.text + '99' }]}>
                          Connected on{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : 'recently'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.friendIconBtn}
                        onPress={() =>
                          navigation.navigate('MessageScreen' as any, {
                            contact: {
                              id: (profile as any).id || item.friend_id,
                              name: displayName,
                              avatar: (profile as any).avatar_url,
                              status: getStatusLabel((profile as any).status),
                            },
                          })
                        }
                      >
                        <Ionicons name="chatbubble-outline" size={22} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                refreshing={loading}
                onRefresh={refreshData}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.text }]}>No friends yet</Text>
                    <Text style={[styles.emptySubtext, { color: theme.text + '99' }]}>
                      Start connecting with others in the All Users tab!
                    </Text>
                  </View>
                }
              />
            </>
          )}

          {/* Messages Tab */}
          {activeTab === 'Messages' && (
            <FlatList
              data={userConversations}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshing={loading}
              onRefresh={async () => {
                setLoading(true);
                await refreshData();
                setLoading(false);
              }}
              renderItem={({ item }) => {
                const partner = item.partner;
                const lastMessage = item.lastMessage;
                const timeAgo = lastMessage ? new Date(lastMessage.created_at).toLocaleString() : '';
                
                return (
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('MessageScreen' as any, {
                        contact: {
                          id: partner.id,
                          name: partner.full_name || partner.username || partner.email,
                          avatar: partner.avatar_url,
                          status: getStatusLabel(partner.status)
                        }
                      });
                    }}
                  >
                    <View style={[styles.friendCard, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
                      <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '22' }]}>
                        {partner.avatar_url ? (
                          <Image source={{ uri: partner.avatar_url }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '22' }]}>
                            <Text style={[styles.avatarText, { color: theme.primary }]}>
                              {partner.full_name?.[0] || partner.username?.[0] || partner.email?.[0] || '?'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.friendName, { color: theme.text }]}>
                          {partner.full_name || partner.username || partner.email}
                        </Text>
                        <Text style={[styles.lastMessage, { color: theme.text + '99' }]} numberOfLines={1}>
                          {lastMessage.sender_id === currentUser?.id ? 'You: ' : ''}
                          {lastMessage.content}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.timeText, { color: theme.text + '99' }]}>{timeAgo}</Text>
                        {item.unreadCount > 0 && (
                          <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.text }]}>No conversations yet</Text>
                  <Text style={[styles.emptySubtext, { color: theme.text + '99' }]}>Start a conversation with someone!</Text>
                </View>
              }
            />
          )}

          {/* All Users Tab */}
          {activeTab === 'All Users' && (
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              refreshing={loading}
              onRefresh={refreshData}
              renderItem={({ item }) => {
                const friendStatus = getFriendStatus(item.id);
                const incomingRequestForUser = incomingFriendRequests.find(
                  req => req.sender_id === item.id
                );
                return (
                  <View key={item.id} style={[styles.userCardCompact, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
                    {/* Left: Avatar/Initial and Info */}
                    <View style={styles.userInfoCompact}>
                      <View style={[styles.avatarCircleCompact, { backgroundColor: theme.primary + '22' }]}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.avatarCircleCompact} />
                        ) : (
                          <Text style={[styles.avatarTextCompact, { color: theme.primary }]}>
                            {item.full_name ? item.full_name[0] : item.email[0]}
                          </Text>
                        )}
                      </View>
                      <View>
                        <Text style={[styles.userNameCompact, { color: theme.text }]}>
                          {item.full_name || item.username || 'Anonymous User'}
                        </Text>
                        <Text style={[styles.userJoinedCompact, { color: theme.text + '99' }]}>
                          Joined {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </Text>
                      </View>
                    </View>
                    {/* Right: Action Buttons */}
                    <View style={styles.actionButtonsCompact}>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('MessageScreen' as any, {
                          contact: {
                            id: item.id,
                            name: item.full_name || item.username || item.email,
                            avatar: item.avatar_url,
                            status: getStatusLabel(item.status)
                          }
                        })}
                        style={styles.messageButtonCompact}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
                      </TouchableOpacity>
                      {!friendStatus && !pendingFriendRequestIds.includes(item.id) && (
                        <TouchableOpacity
                          onPress={() => handleAddFriend(item.id)}
                          style={styles.addFriendButtonCompact}
                        >
                          <Ionicons 
                            name="person-add-outline"
                            size={20} 
                            color="#4CAF50"
                          />
                        </TouchableOpacity>
                      )}
                      {pendingFriendRequestIds.includes(item.id) && (
                        <View style={styles.pendingBadgeCompact}>
                          <Ionicons name="hourglass-outline" size={18} color="#FF9800" />
                        </View>
                      )}
                      {friendStatus === 'incoming' && incomingRequestForUser && (
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity
                            style={styles.addFriendButtonCompact}
                            onPress={() => handleAcceptFriendRequest(incomingRequestForUser.id)}
                          >
                            <Ionicons name="checkmark" size={18} color="#4CAF50" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addFriendButtonCompact}
                            onPress={() => handleDeclineFriendRequest(incomingRequestForUser.id)}
                          >
                            <Ionicons name="close" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                      {(friendStatus === 'pending' && !pendingFriendRequestIds.includes(item.id)) && (
                        <View style={styles.pendingBadgeCompact}>
                          <Text style={styles.pendingTextCompact}>Pending</Text>
                        </View>
                      )}
                      {friendStatus === 'accepted' && (
                        <View style={styles.friendBadgeCompact}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Study Rooms Tab */}
          {activeTab === 'Study Rooms' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <TouchableOpacity style={[styles.createRoomBtn, { backgroundColor: theme.card, borderColor: theme.primary }]} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={[styles.createRoomBtnText, { color: theme.text }]}>Create Study Room</Text>
              </TouchableOpacity>
              
              {studyRooms.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.text }]}>No study rooms yet</Text>
                  <Text style={[styles.emptySubtext, { color: theme.text + '99' }]}>Create or join a study room to start collaborating!</Text>
                </View>
              ) : (
                studyRooms.map(room => (
                  <View key={room.id} style={[styles.studyRoomCard, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[styles.studyRoomTitle, { fontWeight: 'bold', color: theme.text }]}>{room.name}</Text>
                      {room.current_participants > 0 && (
                        <View style={styles.liveBadge}>
                          <Text style={styles.liveBadgeText}>Active</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity style={styles.joinNowBtn} onPress={() => handleJoinRoom(room)}>
                        <Text style={styles.joinNowBtnText}>Enter</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Ionicons name="people-outline" size={16} color={theme.text + '99'} style={{ marginRight: 4 }} />
                      <Text style={[styles.studyRoomParticipants, { color: theme.text + '99' }]}>
                        {room.current_participants || 0} participants
                      </Text>
                    </View>
                    {room.description && (
                      <Text style={[styles.studyRoomDescription, { color: theme.text + '99' }]} numberOfLines={2}>
                        {room.description}
                      </Text>
                    )}
                    <Text style={[styles.studyRoomCreator, { color: theme.text + '99' }]}>
                      Created by {room.creator?.full_name || room.creator?.username || 'Unknown'}
                    </Text>
                  </View>
                ))
              )}
              
              {/* Create Room Modal */}
              <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCreateModal(false)}
              >
                <View style={styles.modalOverlay}>
                  <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                  >
                    <ScrollView 
                      contentContainerStyle={styles.scrollContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={[styles.modalContentLarge, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCreateModal(false)}>
                          <Ionicons name="close" size={26} color={theme.text + '99'} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitleLarge, { color: theme.text }]}>Create Study Room</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.text + '99' }]}>Create a new study room to collaborate with other students</Text>

                        <Text style={[styles.modalLabel, { color: theme.text }]}>Room Name *</Text>
                        <TextInput
                          style={[styles.modalInputLarge, { borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
                          placeholder="e.g. Math Study Group"
                          placeholderTextColor={theme.text + '66'}
                          value={newRoomName}
                          onChangeText={setNewRoomName}
                          autoCorrect={false}
                        />

                        <Text style={[styles.modalLabel, { color: theme.text }]}>Topic *</Text>
                        <TextInput
                          style={[styles.modalInputLarge, { borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
                          placeholder="e.g. Calculus 101"
                          placeholderTextColor={theme.text + '66'}
                          value={newTopic}
                          onChangeText={setNewTopic}
                          autoCorrect={false}
                        />

                        <Text style={[styles.modalLabel, { color: theme.text }]}>Description</Text>
                        <TextInput
                          style={[styles.modalInputLarge, { height: 80, textAlignVertical: 'top', borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
                          placeholder="Describe what you'll be studying..."
                          placeholderTextColor={theme.text + '66'}
                          value={newDescription}
                          onChangeText={setNewDescription}
                          multiline
                          autoCorrect={false}
                        />

                        <Text style={[styles.modalLabel, { color: theme.text }]}>Schedule</Text>
                        <TextInput
                          style={[styles.modalInputLarge, { borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
                          placeholder="e.g. Mondays at 5pm (optional)"
                          placeholderTextColor={theme.text + '66'}
                          value={newSchedule}
                          onChangeText={setNewSchedule}
                          autoCorrect={false}
                        />

                        <Text style={[styles.modalLabel, { color: theme.text }]}>Duration</Text>
                        <TextInput
                          style={[styles.modalInputLarge, { borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
                          placeholder="e.g. 1 hour (optional)"
                          placeholderTextColor={theme.text + '66'}
                          value={newDuration}
                          onChangeText={setNewDuration}
                          autoCorrect={false}
                        />

                        <TouchableOpacity
                          style={[styles.modalCreateRoomBtn, (!newRoomName.trim() || !newTopic.trim()) && styles.disabledButton]}
                          onPress={handleCreateRoom}
                          disabled={!newRoomName.trim() || !newTopic.trim()}
                        >
                          <Text style={styles.modalCreateRoomBtnText}>Create Room</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalCancelBtnLarge} onPress={() => setShowCreateModal(false)}>
                          <Text style={styles.modalCancelTextLarge}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                </View>
              </Modal>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Message {selectedUser?.full_name || selectedUser?.username}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMessageModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.text + '99'} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.messageInput, { borderColor: theme.primary + '33', backgroundColor: theme.background, color: theme.text }]}
              placeholder="Type your message..."
              placeholderTextColor={theme.text + '66'}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Network Status Banner */}
      {networkStatus !== 'online' && (
        <View style={[styles.networkBanner, 
          networkStatus === 'offline' ? styles.offlineBanner : styles.slowBanner
        ]}>
          <Ionicons 
            name={networkStatus === 'offline' ? 'wifi-outline' : 'hourglass-outline'} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.networkText}>
            {networkStatus === 'offline' 
              ? 'No internet connection' 
              : 'Slow connection detected'
            }
          </Text>
        </View>
      )}

      {/* Friend Request Notification */}
      <FriendRequestNotification
        visible={showFriendRequestNotification}
        onClose={() => setShowFriendRequestNotification(false)}
        onUpdate={loadFriendsData}
      />

      {/* Message Notification */}
      <MessageNotification
        visible={showMessageNotification}
        onClose={() => setShowMessageNotification(false)}
      />

      {/* Study Room Invitations */}
      <StudyRoomInvitations
        visible={showStudyRoomInvitations}
        onClose={() => setShowStudyRoomInvitations(false)}
        onUpdate={loadFriendsData}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Community" />
    </View>
  );
};

// Timeout wrapper for network requests
const withTimeout = <T extends any>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};

// Add the missing styles to your existing styles object:
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20, // Reduced padding
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 8, 
    marginHorizontal: 16, 
    marginBottom: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 6 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#222' 
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  friendName: { fontWeight: 'bold', fontSize: 16 },
  friendJoined: { fontSize: 13, marginTop: 2 },
  friendIconBtn: { marginLeft: 8, padding: 4 },
  lastMessage: { fontSize: 14 },
  timeText: { fontSize: 12, marginBottom: 2 },
  createRoomBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 16, marginBottom: 16, marginTop: 4, alignSelf: 'flex-start' },
  createRoomBtnText: { fontWeight: 'bold', fontSize: 15, marginLeft: 6 },
  studyRoomCard: { borderRadius: 14, marginHorizontal: 16, marginBottom: 18, padding: 16, borderWidth: 1 },
  studyRoomTitle: { fontWeight: 'bold', fontSize: 17, marginRight: 8 },
  liveBadge: { backgroundColor: '#2ECC40', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  liveBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  joinNowBtn: { backgroundColor: '#1B5E20', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16 },
  joinNowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  studyRoomParticipants: { fontSize: 14 },
  studyRoomTopic: { fontSize: 14 },
  studyRoomCreator: { fontSize: 13, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentLarge: {
    borderRadius: 18,
    padding: 24,
    width: 360,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 40,
    borderWidth: 1,
  },
  modalTitleLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    fontSize: 15,
  },
  modalInputLarge: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addSubjectBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginLeft: 8,
  },
  addSubjectBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noSubjectsText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 2,
  },
  subjectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  subjectChipText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    marginRight: 4,
  },
  modalCreateRoomBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCreateRoomBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  modalCancelBtnLarge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelTextLarge: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 17,
  },
  userCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  userInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircleCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarTextCompact: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  userNameCompact: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  userJoinedCompact: {
    fontSize: 13,
    marginTop: 2,
  },
  actionButtonsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  messageButtonCompact: {
    padding: 8,
  },
  addFriendButtonCompact: {
    padding: 8,
  },
  pendingBadgeCompact: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#FF9800',
  },
  pendingTextCompact: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  friendBadgeCompact: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  listContainer: { paddingBottom: 24 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  studyRoomDescription: {
    fontSize: 14,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  // Missing styles for message functionality
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F8E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#BDBDBD',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Network status banner styles
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  offlineBanner: {
    backgroundColor: '#ef4444',
  },
  slowBanner: {
    backgroundColor: '#f97316',
  },
  networkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Music control styles
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicControlBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 8,
  },
  volumeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  autoPlayStatus: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  volumeControl: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  volumeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  volumeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeSlider: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
  },
  volumeTrack: {
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  volumeFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    left: 0,
    top: 0,
  },
  
  // Subtask styles
  subtasksList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  subtasksTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subtaskText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  subtaskCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  moreSubtasks: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 24,
  },
  
  // Due date badge
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  dueDateText: {
    fontSize: 10,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 2,
  },
  
  // Friend request button and badge
  friendRequestButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // ...rest of existing styles...
});

export default CommunityScreen;
