import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useFocusAnimationKey } from '../../utils/animationUtils';

const BUCKET = 'e-books';

interface UploadedBook {
  id: string;
  name: string;
  file_size: number;
  upload_date: string;
  file_path: string;
  storage_path: string;
}

const EBooksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  const [books, setBooks] = useState<UploadedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  /* ----------  Fetch existing files  ---------- */
  const fetchBooks = async () => {
    // TODO: Load PDFs from Convex file storage
    // PDF storage will be migrated to Convex in a future phase
    setBooks([]);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'E-Books',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Bonuses' as never)}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => null, // Remove hamburger menu
    });
  }, [navigation, theme]);

  /* ----------  React Native Compatible Upload Function  ---------- */
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB for textbooks

      if (file.size && file.size > MAX_SIZE) {
        Alert.alert('File too large', 'Please choose a file smaller than 100 MB.');
        return;
      }

      setLoading(true);

      // TODO: Upload to Convex file storage
      // PDF upload will be migrated to Convex in a future phase
      setLoading(false);
      Alert.alert(
        'PDF Upload Coming Soon',
        'PDF upload functionality is being enhanced. This feature will be available in the next update!',
        [{ text: 'OK' }]
      );
      setShowDisclaimer(false);
      return;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'There was an error uploading your file.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('Unable to upload')) {
        errorMessage = 'Upload failed. Please try selecting a different file or check your internet connection.';
      } else if (error.message.includes('logged in')) {
        errorMessage = 'Please sign in again to upload files.';
      } else if (error.message.includes('too large')) {
        errorMessage = 'File is too large. Please choose a file smaller than 100MB.';
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ----------  Delete Function  ---------- */
  const deleteBook = async (book: UploadedBook) => {
    Alert.alert(
      'Delete E-Book',
      `Are you sure you want to delete "${book.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Delete from Convex file storage
              // PDF storage will be migrated to Convex in a future phase
              Alert.alert('Feature Coming Soon', 'PDF deletion will be available in the next update.');

              await fetchBooks();
              
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete the file.');
            }
          }
        }
      ]
    );
  };

  /* ----------  View PDF Function  ---------- */
  const viewPDF = async (book: UploadedBook) => {
    // TODO: View PDF from Convex file storage
    // PDF storage will be migrated to Convex in a future phase
    Alert.alert('Feature Coming Soon', 'PDF viewing will be available in the next update!');
  };

  /* ----------  Send to Nora Function  ---------- */
  const sendToNora = async (book: UploadedBook) => {
    try {
      Alert.alert(
        'Send to Nora',
        `Send "${book.name}" to Nora for study assistance?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              try {
                // TODO: Send PDF to Nora from Convex file storage
                // PDF storage will be migrated to Convex in a future phase
                Alert.alert('Feature Coming Soon', 'Sending PDFs to Nora will be available in the next update!');
                setLoading(false);
              } catch (error) {
                console.error('Error:', error);
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Send to Nora error:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        key={`content-${focusKey}`}
        entering={FadeInUp.duration(300)}
        style={styles.content}
      >
        <Animated.Text
          entering={FadeIn.delay(100).duration(250)}
          style={[styles.subtitle, { color: theme.text }]}
        >
          Upload your textbooks and class materials to access them anytime, anywhere.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(150).duration(300)}>
          <TouchableOpacity
            style={[styles.uploadArea, { borderColor: theme.primary }]}
            onPress={() => setShowDisclaimer(true)}
            disabled={loading}
          >
            {loading ? (
              <ShimmerLoader variant="circular" size={48} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={40} color={theme.primary} />
                <Text style={[styles.uploadText, { color: theme.text }]}>
                  Upload New E-Book
                </Text>
                <Text style={[styles.uploadSubtext, { color: theme.text + '99' }]}>
                  Tap to select PDF files (up to 100MB)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.bookItem, { backgroundColor: theme.card }]}>
              <View style={styles.bookIcon}>
                <Ionicons name="document-text-outline" size={32} color={theme.primary} />
              </View>
              <View style={styles.bookInfo}>
                <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: theme.text + '99' }]}>
                  {formatFileSize(item.file_size)} • {new Date(item.upload_date).toLocaleDateString()}
                </Text>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  onPress={() => viewPDF(item)} 
                  style={[styles.actionButton, { backgroundColor: theme.primary + '15' }]}
                >
                  <Ionicons name="eye-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => sendToNora(item)}
                  style={[styles.actionButton, { backgroundColor: '#FF5722' + '15' }]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FF5722" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => deleteBook(item)} 
                  style={[styles.actionButton, { backgroundColor: '#FF5252' + '15' }]}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={64} color={theme.text + '33'} />
              <Text style={[styles.emptyText, { color: theme.text + '99' }]}>
                No e-books uploaded yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.text + '66' }]}>
                Upload your first textbook to get started
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Enhanced Disclaimer Modal */}
      <Modal visible={showDisclaimer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark-outline" size={32} color={theme.primary} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Upload Agreement
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.disclaimerText, { color: theme.text }]}>
                By uploading this file, you confirm that:
              </Text>
              
              <View style={styles.agreementList}>
                <Text style={[styles.agreementItem, { color: theme.text }]}>
                  • You own this content or have permission to upload it
                </Text>
                <Text style={[styles.agreementItem, { color: theme.text }]}>
                  • The file is for personal educational use only
                </Text>
                <Text style={[styles.agreementItem, { color: theme.text }]}>
                  • You will not share copyrighted material without permission
                </Text>
                <Text style={[styles.agreementItem, { color: theme.text }]}>
                  • The file does not contain inappropriate content
                </Text>
              </View>
              
              <Text style={[styles.noteText, { color: theme.text + '99' }]}>
                Files are stored securely and are only accessible by you.
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.agreeButton, { backgroundColor: theme.primary }]}
                onPress={handleUpload}
                disabled={loading}
              >
                <Text style={styles.agreeButtonText}>
                  {loading ? 'Uploading...' : 'I Agree & Upload'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.text + '33' }]}
                onPress={() => setShowDisclaimer(false)}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookIcon: {
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  disclaimerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  agreementList: {
    marginBottom: 16,
  },
  agreementItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalActions: {
    padding: 24,
    paddingTop: 16,
  },
  agreeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EBooksScreen;
