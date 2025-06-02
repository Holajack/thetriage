import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../utils/supabase';

interface UploadedBook {
  id: string;             // full path in Storage (eg. userId/123_file.pdf)
  title: string;          // "Human Anatomy"
  file_size: number;      // bytes
  upload_date: string;    // ISO string
  public_url: string;     // CDN url for download
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const BUCKET = 'e-books';

const EBooksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [books, setBooks] = useState<UploadedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  /* ----------  Header styling  ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'E‑Book Uploads',
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.primary,
      headerTitleStyle: { fontWeight: 'bold', color: theme.primary },
    });
  }, [navigation, theme]);

  /* ----------  Fetch existing files  ---------- */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) return;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${userId}/`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.warn('Fetch list error', error);
        return;
      }

      const mapped = data
        .filter((f) => f.metadata?.mimetype === 'application/pdf')
        .map((f) => {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${f.name}`);
          return {
            id: `${userId}/${f.name}`,
            title: f.name.replace(/\.pdf$/i, '').replace(/^\d+_/, ''),
            file_size: f.metadata?.size ?? 0,
            upload_date: f.updated_at ?? new Date().toISOString(),
            public_url: urlData.publicUrl,
          } as UploadedBook;
        });

      setBooks(mapped);
    })();
  }, []);

  /* ----------  Helpers  ---------- */
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** exp).toFixed(2)} ${units[exp]}`;
  };

  /* ----------  Upload flow  ---------- */
  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];

      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert('File too large', 'Please choose a file smaller than 50 MB.');
        return;
      }

      setLoading(true);

      // ----------  Ensure user is authenticated ----------
      // Prefer getSession() since it exists in every supabase‑js version
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr || !session?.user) {
        throw new Error('You must be logged in to upload files.');
      }

      const userId = session.user.id;
      const filePath = `${userId}/${Date.now()}_${file.name}`;

      // Convert local file‑system URI to Blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage.from(BUCKET).getPublicUrl(filePath);

      setBooks((prev) => [
        {
          id: filePath,
          title: file.name.replace(/\.pdf$/i, ''),
          file_size: file.size ?? 0,
          upload_date: new Date().toISOString(),
          public_url: urlData.publicUrl,
        },
        ...prev,
      ]);

      Alert.alert('Success', 'E‑book uploaded successfully!');

    } catch (err: any) {
      console.error('Upload error', err);
      Alert.alert('Upload Error', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ----------  Delete flow  ---------- */
  const deleteBook = (book: UploadedBook) => {
    Alert.alert('Delete E‑Book', 'Are you sure you want to delete this e‑book?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.storage.from(BUCKET).remove([book.id]);
            if (error) console.warn('Storage deletion failed', error);
          } catch (e) {
            console.warn(e);
          } finally {
            setBooks((prev) => prev.filter((b) => b.id !== book.id));
          }
        },
      },
    ]);
  };

  /* ----------  Render  ---------- */
  const renderBookItem = ({ item }: { item: UploadedBook }) => (
    <View style={styles.bookCard}>
      <MaterialCommunityIcons name="file-pdf-box" size={40} color="#1B5E20" />
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.primary }]}>{item.title}</Text>
        <Text style={[styles.meta, { color: theme.accent }]}>{formatFileSize(item.file_size)}</Text>
        <Text style={[styles.meta, { color: theme.text }]}>
          {new Date(item.upload_date).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => deleteBook(item)}>
        <Ionicons name="trash-outline" size={20} color="#FF5252" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Upload your class PDFs to access them anytime, anywhere.
      </Text>

      <TouchableOpacity
        style={styles.uploadArea}
        onPress={() => setShowDisclaimer(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <>
            <MaterialCommunityIcons name="cloud-upload" size={40} color={theme.primary} />
            <Text style={[styles.uploadText, { color: theme.primary }]}>
              Tap to upload a PDF
            </Text>
            <Text style={[styles.uploadSubtext, { color: theme.text }]}>
              Max file size 50 MB
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Uploaded files</Text>
        <Text style={[styles.bookCount, { color: theme.text }]}>{books.length}</Text>
      </View>

      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />

      {/* --- Copyright disclaimer --- */}
      <Modal
        visible={showDisclaimer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disclaimerModal}>
            <View style={styles.disclaimerHeader}>
              <MaterialCommunityIcons name="alert-circle" size={48} color="#FF9800" />
              <Text style={[styles.disclaimerTitle, { color: theme.primary }]}>
                Copyright Notice
              </Text>
            </View>

            <ScrollView style={styles.disclaimerContent}>
              <Text style={[styles.disclaimerText, { color: theme.text }]}>
                <Text style={[styles.boldText, { color: theme.primary }]}>
                  IMPORTANT COPYRIGHT DISCLAIMER:
                </Text>
                {'\n\n'}
                We do not condone the practice of uploading copyrighted material without the
                purchase of that material.
                {'\n\n• '}You own the rights to this material OR have proper authorization.
                {'\n• '}You upload at your own risk.
                {'\n• '}We cooperate with authorities if requested.
                {'\n• '}Any violation is your sole responsibility.
                {'\n\n'}
                <Text style={[styles.boldText, { color: theme.primary }]}>
                  Please upload only material you legally own or have permission to use.
                </Text>
              </Text>
            </ScrollView>

            <View style={styles.disclaimerActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background }]}
                onPress={() => setShowDisclaimer(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proceedButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowDisclaimer(false);
                  pickAndUpload();
                }}
              >
                <Text style={[styles.proceedButtonText, { color: theme.background }]}>
                  I Understand, Proceed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ----------  Styles  ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  uploadArea: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    borderStyle: 'dashed',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  uploadText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  uploadSubtext: { fontSize: 14, marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  bookCount: { fontSize: 14 },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  info: { flex: 1, marginLeft: 16 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disclaimerModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    width: '100%',
  },
  disclaimerHeader: { alignItems: 'center', marginBottom: 20 },
  disclaimerTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  disclaimerContent: { maxHeight: 300 },
  disclaimerText: { fontSize: 14, lineHeight: 20 },
  boldText: { fontWeight: 'bold' },
  disclaimerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 0.45,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  proceedButton: {
    flex: 0.45,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  proceedButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

export default EBooksScreen;
