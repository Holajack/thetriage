import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import { supabase } from '../../utils/supabase';
import { sendQRFriendRequest, waitForQRAcceptance } from '../../utils/qrAcceptanceService';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';

interface ScannedUser {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  university?: string;
  bio?: string;
}

const QRScannerScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [waitingForAcceptance, setWaitingForAcceptance] = useState(false);
  const [isFromGallery, setIsFromGallery] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // Reset scanner state when screen loses focus
  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      console.log('🎥 QR Scanner screen focused');

      return () => {
        // Screen is unfocused - cleanup
        console.log('👋 QR Scanner screen unfocused - resetting scanner');
        setScanned(false);
        setShowPreview(false);
        setScannedUser(null);
        setLoading(false);
        setSending(false);
        setWaitingForAcceptance(false);
        setIsFromGallery(false);
      };
    }, [])
  );

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setIsFromGallery(false); // Camera scan, not gallery

    try {
      let userId: string | null = null;

      // Try to parse as JSON first (our QR code format)
      try {
        const qrData = JSON.parse(data);
        userId = qrData.userId;
      } catch (jsonError) {
        // If JSON parse fails, check if it's a deep link URL
        if (data.startsWith('thetriage://profile/')) {
          userId = data.replace('thetriage://profile/', '');
        } else if (data.includes('profile/')) {
          // Handle other URL formats
          const match = data.match(/profile\/([a-zA-Z0-9-]+)/);
          if (match) {
            userId = match[1];
          }
        }
      }

      if (!userId) {
        console.log('❌ Invalid QR code data:', data.substring(0, 50));
        Alert.alert('Invalid QR Code', 'This QR code does not contain valid user information.');
        setScanned(false);
        return;
      }

      console.log('✅ QR code scanned, user ID:', userId);
      // Fetch user profile
      await fetchUserProfile(userId);
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Could not process this QR code. Please try again.');
      setScanned(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to scan QR codes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Note: Scanning QR from images requires additional library like jsQR
        // For now, show a message that this feature is coming soon
        Alert.alert(
          'Upload QR Code',
          'QR code scanning from images is coming soon! For now, please use the camera to scan QR codes.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      // Query only the essential fields that definitely exist
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, university, location, major, classes')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (profileData) {
        console.log('✅ User profile fetched:', profileData.username);
        setScannedUser({
          userId: profileData.id,
          username: profileData.username || 'user',
          fullName: profileData.full_name || 'User',
          avatarUrl: profileData.avatar_url,
          university: profileData.university,
          bio: profileData.major ? `${profileData.major}` : undefined,
        });
        setShowPreview(true);
      } else {
        console.log('❌ User not found:', userId);
        Alert.alert('User Not Found', 'This user does not exist.');
        setScanned(false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!scannedUser) return;

    setSending(true);
    try {
      // Send QR friend request
      const result = await sendQRFriendRequest(scannedUser.userId, isFromGallery);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send friend request.');
        setScanned(false);
        setSending(false);
        return;
      }

      const requestId = result.requestId!;

      // If this requires waiting (live scan, not gallery), wait for immediate acceptance
      if (result.requiresWait) {
        console.log('⏳ Waiting for QR owner to accept...');
        setWaitingForAcceptance(true);
        setSending(false);

        // Wait up to 30 seconds for acceptance
        const acceptance = await waitForQRAcceptance(requestId, 30);

        setWaitingForAcceptance(false);

        if (acceptance.accepted) {
          // Immediate acceptance!
          Alert.alert(
            'Connected! 🎉',
            `You and ${scannedUser.fullName} are now trail buddies!`,
            [
              {
                text: 'Awesome!',
                onPress: () => {
                  setShowPreview(false);
                  setScannedUser(null);
                  navigation.goBack();
                }
              }
            ]
          );
        } else if (acceptance.error) {
          // Request was declined
          Alert.alert(
            'Request Declined',
            `${scannedUser.fullName} declined the friend request.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowPreview(false);
                  setScannedUser(null);
                  setScanned(false);
                }
              }
            ]
          );
        } else {
          // Timeout - went to pending
          Alert.alert(
            'Request Sent 📬',
            `${scannedUser.fullName} will review your request later. You'll be notified when they respond!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowPreview(false);
                  setScannedUser(null);
                  navigation.goBack();
                }
              }
            ]
          );
        }
      } else {
        // Gallery upload - just send as pending request
        Alert.alert(
          'Friend Request Sent! 📬',
          `Your friend request has been sent to ${scannedUser.fullName}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPreview(false);
                setScannedUser(null);
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
      setScanned(false);
      setWaitingForAcceptance(false);
    } finally {
      setSending(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setScannedUser(null);
    setScanned(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <UnifiedHeader title="Scan QR Code" onClose={() => navigation.navigate('Community' as any, { initialTab: 'friends' })} />
        <View style={styles.centerContainer}>
          <ShimmerLoader variant="circular" size={48} />
          <Text style={[styles.messageText, { color: theme.text }]}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <UnifiedHeader title="Scan QR Code" onClose={() => navigation.navigate('Community' as any, { initialTab: 'friends' })} />
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={80} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Permission Required</Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            We need access to your camera to scan QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <UnifiedHeader title="Scan QR Code" onClose={() => navigation.navigate('Community' as any, { initialTab: 'friends' })} />

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Scanning Overlay */}
          <View style={styles.overlay}>
            {/* Top Mask */}
            <View style={styles.maskTop} />

            {/* Middle Row with Scanner Frame */}
            <View style={styles.middleRow}>
              <View style={styles.maskSide} />
              <View style={styles.scannerFrame}>
                {/* Corner Decorations */}
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.maskSide} />
            </View>

            {/* Bottom Mask */}
            <View style={styles.maskBottom} />
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              {scanned ? 'Processing...' : 'Position QR code within the frame'}
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionsContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
          onPress={handlePickImage}
        >
          <Ionicons name="image-outline" size={24} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Upload from Gallery</Text>
        </TouchableOpacity>

        {scanned && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="refresh-outline" size={24} color={theme.text} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User Profile Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelPreview}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.previewModal, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelPreview}
            >
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ShimmerLoader variant="circular" size={48} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Loading profile...</Text>
              </View>
            ) : scannedUser ? (
              <>
                <Text style={[styles.previewTitle, { color: theme.text }]}>Add Hiker?</Text>

                {/* User Avatar */}
                <View style={styles.avatarContainer}>
                  {scannedUser.avatarUrl ? (
                    <Image source={{ uri: scannedUser.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {scannedUser.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* User Info */}
                <Text style={[styles.userName, { color: theme.text }]}>{scannedUser.fullName}</Text>
                <Text style={[styles.userUsername, { color: theme.textSecondary }]}>@{scannedUser.username}</Text>

                {scannedUser.university && (
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>{scannedUser.university}</Text>
                  </View>
                )}

                {scannedUser.bio && (
                  <Text style={[styles.bioText, { color: theme.textSecondary }]}>{scannedUser.bio}</Text>
                )}

                {/* Waiting State */}
                {waitingForAcceptance && (
                  <View style={styles.waitingContainer}>
                    <ShimmerLoader variant="circular" size={48} />
                    <Text style={[styles.waitingTitle, { color: theme.text }]}>
                      Waiting for {scannedUser.fullName}...
                    </Text>
                    <Text style={[styles.waitingText, { color: theme.textSecondary }]}>
                      They'll see a popup to accept you immediately!
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                {!waitingForAcceptance && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={handleCancelPreview}
                      disabled={sending}
                    >
                      <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sendButton, { backgroundColor: theme.primary }]}
                      onPress={handleSendFriendRequest}
                      disabled={sending}
                    >
                      {sending ? (
                        <ShimmerLoader variant="circular" size={20} />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={20} color="#FFFFFF" />
                          <Text style={styles.sendButtonText}>Send Request</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    marginTop: 16,
    fontSize: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 300,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerFrame: {
    width: 300,
    height: 300,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
  },
  bioText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScannerScreen;
