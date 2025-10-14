import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as MessageService from '../utils/messagingService';
import { useAuth } from '../context/AuthContext';

interface MessageNotificationProps {
  visible: boolean;
  onClose: () => void;
}

const MessageNotification: React.FC<MessageNotificationProps> = ({
  visible,
  onClose
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    if (visible) {
      loadUnreadCount();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!user?.id) return;

    // Set up real-time subscription for message notifications
    const unsubscribe = MessageService.subscribeToMessageNotifications(
      user.id,
      () => {
        loadUnreadCount();
      }
    );

    return unsubscribe;
  }, [user?.id]);

  const loadUnreadCount = async () => {
    try {
      const result = await MessageService.getUnreadMessageCount();
      if (result.success) {
        setUnreadCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handlePress = () => {
    onClose();
    // Navigate to messages tab in community screen
    navigation.navigate('CommunityScreen' as any, { initialTab: 'Messages' });
  };

  if (!visible || unreadCount === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={handlePress} style={styles.notification}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={20} color="#FFFFFF" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>New Messages</Text>
          <Text style={styles.subtitle}>
            You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={16} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default MessageNotification;