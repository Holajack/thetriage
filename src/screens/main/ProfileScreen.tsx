import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSupabaseProfile, Profile } from '../../utils/supabaseHooks';
import { useTheme } from '../../context/ThemeContext';

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const [uploading, setUploading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { profile, updateProfile, uploadProfileImage, updateStatus, loading, error } = useSupabaseProfile();
  const { theme } = useTheme();

  const STATUS_OPTIONS = [
    { 
      value: 'available', 
      label: 'Available', 
      color: theme.primary, 
      icon: 'checkmark-circle',
      description: 'Ready to study and collaborate'
    },
    { 
      value: 'busy', 
      label: 'Busy', 
      color: '#FF9800', 
      icon: 'time',
      description: 'In a focus session or studying'
    },
    { 
      value: 'offline', 
      label: 'Offline', 
      color: '#9E9E9E', 
      icon: 'moon',
      description: 'Taking a break or unavailable'
    },
  ] as const;

  const PROFILE_OPTIONS = [
    { label: 'Personal Information', icon: 'person-outline', onPress: () => navigation.navigate('PersonalInformation') },
    { label: 'Education', icon: 'school-outline', onPress: () => navigation.navigate('Education') },
    { label: 'Location and Time', icon: 'location-outline', onPress: () => navigation.navigate('LocationAndTime') },
    { label: 'Privacy', icon: 'lock-closed-outline', onPress: () => navigation.navigate('Privacy') },
    { label: 'Preferences', icon: 'options-outline', onPress: () => navigation.navigate('Preferences') },
    { label: 'Stop Service', icon: 'close-circle-outline', onPress: () => {} },
  ];

  const getCurrentStatus = () => {
    return STATUS_OPTIONS.find(option => option.value === (profile?.status || 'available')) || STATUS_OPTIONS[0];
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'You need to allow access to your photos to set a profile image.');
        return;
      }
      
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await uploadProfileImage(uri);
        Alert.alert('Success', 'Profile image updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not update profile image.');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (status: 'available' | 'busy' | 'offline') => {
    try {
      await updateStatus(status);
      setShowStatusModal(false);
      Alert.alert('Status Updated', `Your status has been set to ${status}.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not update status.');
    }
  };

  const currentStatus = getCurrentStatus();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 32 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: currentStatus.color + '20', borderColor: currentStatus.color }]}
            onPress={() => setShowStatusModal(true)}
          >
            <Ionicons name={currentStatus.icon as any} size={16} color={currentStatus.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
            <Ionicons name="chevron-down" size={16} color={currentStatus.color} />
          </TouchableOpacity>
        </View>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.avatarTouchable}>
            {profile && profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: theme.primary + '22' }]}>
                <Ionicons name="person" size={45} color={theme.primary} />
              </View>
            )}
            <View style={[styles.editIconCircle, uploading && styles.uploadingIcon]}>
              <Ionicons name={uploading ? "hourglass" : "camera"} size={20} color={theme.primary} />
            </View>
            {/* Status indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: currentStatus.color }]} />
          </TouchableOpacity>
          {profile && (
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {profile.full_name || profile.username || 'Set your name'}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text + '99' }]}>{profile.email}</Text>
              {profile.university && (
                <Text style={[styles.profileUniversity, { color: theme.text + '99' }]}>{profile.university}</Text>
              )}
            </View>
          )}
        </View>
        <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
          {PROFILE_OPTIONS.map((option, idx) => (
            <TouchableOpacity
              key={option.label}
              style={[styles.optionRow, idx === PROFILE_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Ionicons name={option.icon as any} size={22} color={theme.primary} style={{ marginRight: 16 }} />
                <Text style={[styles.optionLabel, { color: theme.text }]}>{option.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text + '55'} />
            </TouchableOpacity>
          ))}
        </View>
        {loading && <Text style={[styles.loadingText, { color: theme.text + '99' }]}>Loading...</Text>}
        {error && <Text style={[styles.errorText, { color: '#D32F2F' }]}>{error}</Text>}
        {/* Status Modal */}
        <Modal
          visible={showStatusModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Set Your Status</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text + '99'} />
                </TouchableOpacity>
              </View>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    profile?.status === option.value && [styles.statusOptionActive, { backgroundColor: theme.primary + '22' }]
                  ]}
                  onPress={() => handleStatusChange(option.value)}
                >
                  <View style={styles.statusOptionLeft}>
                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                    <View style={styles.statusOptionText}>
                      <Text style={[styles.statusOptionTitle, { color: option.color }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.statusOptionDescription, { color: theme.text + '99' }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {profile?.status === option.value && (
                    <Ionicons name="checkmark" size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarTouchable: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#C8E6C9',
  },
  editIconCircle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  optionsList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 12,
    paddingVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  defaultAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  profileUniversity: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 12,
  },
  errorText: {
    textAlign: 'center',
    color: '#D32F2F',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  statusOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusOptionText: {
    marginLeft: 16,
  },
  statusOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  statusOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  uploadingIcon: {
    borderColor: '#FF9800',
  },
});

export default ProfileScreen; 