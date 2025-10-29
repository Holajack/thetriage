import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  Modal, 
  ActivityIndicator,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../utils/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';

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

  const [books, setBooks] = useState<UploadedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  /* ----------  Fetch existing files  ---------- */
  const fetchBooks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return;

    try {
      // Fetch from storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from(BUCKET)
        .list(`${userId}/`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (storageError) {
        console.warn('Storage fetch error:', storageError);
      }

      // Fetch metadata from database with error handling
      let dbData = [];
      try {
        const { data, error: dbError } = await supabase
          .from('user_ebooks')
          .select('*')
          .eq('user_id', userId)
          .order('upload_date', { ascending: false });

        if (dbError) {
          console.warn('Database fetch error:', dbError);
        } else {
          dbData = data || [];
        }
      } catch (dbError) {
        console.warn('Database table access error:', dbError);
      }

      // Combine storage and database data
      const combinedData = (storageData || [])
        .filter((f) => f.metadata?.mimetype === 'application/pdf' || f.name.endsWith('.pdf'))
        .map((f) => {
          const dbRecord = dbData.find(record => record.file_path.endsWith(f.name));
          return {
            id: f.id || f.name,
            name: dbRecord?.title || f.name.replace('.pdf', ''),
            file_size: f.metadata?.size || dbRecord?.file_size || 0,
            upload_date: dbRecord?.upload_date || f.created_at,
            file_path: `${userId}/${f.name}`,
            storage_path: f.name
          };
        });

      setBooks(combinedData);
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    }
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
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
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

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.user) {
        throw new Error('You must be logged in to upload files.');
      }

      const userId = session.user.id;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${userId}/${fileName}`;

      console.log('Starting direct file upload...');
      
      try {
        // Method 1: Direct FormData upload (React Native compatible)
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: 'application/pdf',
          name: fileName,
        } as any);

        // Upload using Supabase storage with FormData
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, formData);

        if (uploadError) {
          console.log('FormData upload failed, trying alternative method...');
          
          // Method 2: Base64 string upload
          const base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Upload base64 string directly
          const { error: base64UploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, base64Data, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (base64UploadError) {
            console.log('Base64 upload failed, trying file URI method...');
            
            // Method 3: Direct file URI (React Native specific)
            const { error: uriUploadError } = await supabase.storage
              .from(BUCKET)
              .upload(filePath, {
                uri: file.uri,
                type: 'application/pdf',
                name: fileName,
              } as any);

            if (uriUploadError) {
              throw new Error(`All upload methods failed. Last error: ${uriUploadError.message}`);
            }
          }
        }

        console.log('Upload successful, saving metadata...');

        // Save metadata to database
        try {
          const { error: dbError } = await supabase
            .from('user_ebooks')
            .insert({
              user_id: userId,
              title: file.name.replace('.pdf', ''),
              file_path: filePath,
              file_size: file.size,
              upload_date: new Date().toISOString()
            });

          if (dbError) {
            console.warn('Database save error:', dbError);
            Alert.alert(
              'File Uploaded', 
              'Your file was uploaded successfully, but there was an issue saving the metadata.'
            );
          } else {
            Alert.alert('Success', 'Your e-book has been uploaded successfully!');
          }
        } catch (metadataError) {
          console.error('Metadata save failed:', metadataError);
          Alert.alert('File Uploaded', 'Your file was uploaded successfully.');
        }

        await fetchBooks();
        setShowDisclaimer(false);

      } catch (uploadError) {
        console.error('All upload methods failed:', uploadError);
        throw new Error('Unable to upload the file. Please check your internet connection and try again.');
      }

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
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.user) return;

              // Delete from storage
              const { error: storageError } = await supabase.storage
                .from(BUCKET)
                .remove([book.file_path]);

              if (storageError) {
                console.warn('Storage delete error:', storageError);
              }

              // Delete from database
              const { error: dbError } = await supabase
                .from('user_ebooks')
                .delete()
                .eq('file_path', book.file_path);

              if (dbError) {
                console.warn('Database delete error:', dbError);
              }

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
    try {
      setLoading(true);
      
      // Get signed URL for the PDF
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(book.file_path, 3600); // 1 hour expiry

      if (error) {
        throw new Error('Failed to get PDF URL');
      }

      if (data?.signedUrl) {
        // Navigate to PDF viewer screen
        navigation.navigate('PDFViewer', { 
          url: data.signedUrl, 
          title: book.name,
          bookData: book 
        });
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      Alert.alert('Error', 'Could not open PDF. Please try again.');
    } finally {
      setLoading(false);
    }
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
                setLoading(true);
                
                // Get signed URL for Nora
                const { data, error } = await supabase.storage
                  .from(BUCKET)
                  .createSignedUrl(book.file_path, 7200); // 2 hours for Nora processing

                if (error) {
                  throw new Error('Failed to get PDF URL for Nora');
                }

                // Navigate to NoraScreen with the PDF context
                navigation.navigate('NoraScreen' as never, {
                  initialMessage: `I've uploaded a textbook: "${book.name}". Can you help me study from it?`,
                  pdfContext: {
                    title: book.name,
                    url: data.signedUrl,
                    fileSize: book.file_size
                  }
                } as never);
                
              } catch (error) {
                console.error('Error sending to Nora:', error);
                Alert.alert('Error', 'Could not send PDF to Nora. Please try again.');
              } finally {
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
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Upload your textbooks and class materials to access them anytime, anywhere.
        </Text>

        <TouchableOpacity
          style={[styles.uploadArea, { borderColor: theme.primary }]}
          onPress={() => setShowDisclaimer(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="cloud-upload" size={40} color={theme.primary} />
              <Text style={[styles.uploadText, { color: theme.text }]}>
                Upload New E-Book
              </Text>
              <Text style={[styles.uploadSubtext, { color: theme.text + '99' }]}>
                Tap to select PDF files (up to 100MB)
              </Text>
            </>
          )}
        </TouchableOpacity>

        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.bookItem, { backgroundColor: theme.card }]}>
              <View style={styles.bookIcon}>
                <MaterialCommunityIcons name="file-pdf-box" size={32} color={theme.primary} />
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
                  <MaterialCommunityIcons name="robot" size={18} color="#FF5722" />
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
              <MaterialCommunityIcons name="book-open-page-variant" size={64} color={theme.text + '33'} />
              <Text style={[styles.emptyText, { color: theme.text + '99' }]}>
                No e-books uploaded yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.text + '66' }]}>
                Upload your first textbook to get started
              </Text>
            </View>
          }
        />
      </View>

      {/* Enhanced Disclaimer Modal */}
      <Modal visible={showDisclaimer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="shield-check" size={32} color={theme.primary} />
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
