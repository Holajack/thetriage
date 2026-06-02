import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { glassStyles } from "../../components/premium/LiquidGlass";
import { Typography, Spacing, PremiumColors } from "../../theme/premiumTheme";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useFocusAnimationKey } from "../../utils/animationUtils";

const BUCKET = "e-books";

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
  const isDark = theme.isDark;
  const focusKey = useFocusAnimationKey();

  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Live ebook list from Convex.
  const convexEbooks = useQuery(api.ebooks.listForCurrentUser, {});
  const generateUploadUrl = useMutation(api.ebooks.generateUploadUrl);
  const registerUpload = useMutation(api.ebooks.registerUpload);
  const deleteEbookMutation = useMutation(api.ebooks.deleteEbook);

  // Map Convex rows to the screen's existing UploadedBook shape so the renderer
  // doesn't need to change.
  const books: UploadedBook[] = (convexEbooks ?? []).map((e: any) => ({
    id: e._id,
    name: e.title,
    file_size: e.fileSize ?? 0,
    upload_date: e.uploadedAt ?? new Date().toISOString(),
    file_path: e.storageId,
    storage_path: e.storageId,
  }));

  /* ----------  Upload Function (Convex storage + OpenAI ingestion)  ---------- */
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB for textbooks

      if (file.size && file.size > MAX_SIZE) {
        Alert.alert(
          "File too large",
          "Please choose a file smaller than 100 MB.",
        );
        return;
      }

      setLoading(true);

      // 1. Get a one-shot upload URL from Convex.
      const uploadUrl = await generateUploadUrl({});

      // 2. POST the PDF bytes directly to that URL.
      const fileBlob = await fetch(file.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: fileBlob,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed (${uploadRes.status})`);
      }
      const { storageId } = await uploadRes.json();

      // 3. Register the upload — schedules OpenAI ingestion in the background.
      await registerUpload({
        storageId,
        title: file.name?.replace(/\.pdf$/i, "") ?? "Untitled PDF",
        fileSize: file.size ?? 0,
      });

      setShowDisclaimer(false);
      Alert.alert(
        "Uploaded",
        "Your e-book is uploading. Nora will be able to reference it in chat once processing finishes.",
      );
    } catch (error: any) {
      // Upload error
      let errorMessage = "There was an error uploading your file.";
      if (error?.message?.includes("Network request failed")) {
        errorMessage =
          "Network connection issue. Please check your internet connection and try again.";
      } else if (error?.message?.includes("too large")) {
        errorMessage =
          "File is too large. Please choose a file smaller than 100MB.";
      }
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ----------  Delete Function  ---------- */
  const deleteBook = async (book: UploadedBook) => {
    Alert.alert(
      "Delete E-Book",
      `Are you sure you want to delete "${book.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEbookMutation({ ebookId: book.id as any });
            } catch (error) {
              // Delete error
              Alert.alert("Error", "Failed to delete the file.");
            }
          },
        },
      ],
    );
  };

  /* ----------  View PDF Function  ---------- */
  const viewPDF = async (book: UploadedBook) => {
    // TODO: View PDF from Convex file storage
    Alert.alert(
      "Feature Coming Soon",
      "PDF viewing will be available in the next update!",
    );
  };

  /* ----------  Send to Nora Function  ---------- */
  const sendToNora = async (book: UploadedBook) => {
    try {
      Alert.alert(
        "Send to Nora",
        `Send "${book.name}" to Nora for study assistance?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send",
            onPress: async () => {
              try {
                // TODO: Send PDF to Nora from Convex file storage
                Alert.alert(
                  "Feature Coming Soon",
                  "Sending PDFs to Nora will be available in the next update!",
                );
                setLoading(false);
              } catch (error) {
                // Error sending to Nora
                setLoading(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      // Send to Nora error
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Bonuses" as never);
          }}
        >
          <View
            style={[
              styles.backButtonCircle,
              { backgroundColor: theme.text + "20" },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>E-Books</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        key={focusKey}
        data={books}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ===== UPLOAD SECTION ===== */}
            <Animated.View entering={FadeIn.delay(100).duration(400)}>
              <Text
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                UPLOAD
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(150).duration(400)}>
              <TouchableOpacity
                style={[
                  styles.uploadArea,
                  glassStyles.subtleCard(isDark),
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.primary + "40",
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDisclaimer(true);
                }}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ShimmerLoader variant="circle" width={48} height={48} />
                ) : (
                  <>
                    <View
                      style={[
                        styles.uploadIconCircle,
                        { backgroundColor: theme.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={32}
                        color={theme.primary}
                      />
                    </View>
                    <Text style={[styles.uploadText, { color: theme.text }]}>
                      Upload New E-Book
                    </Text>
                    <Text
                      style={[
                        styles.uploadSubtext,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Tap to select PDF files (up to 100MB)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* ===== LIBRARY SECTION ===== */}
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <Text
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                YOUR LIBRARY
              </Text>
            </Animated.View>
          </>
        }
        renderItem={({ item, index }) => (
          <StaggeredItem
            key={item.id}
            index={index}
            delay="normal"
            direction="up"
          >
            <View
              style={[
                styles.bookItem,
                glassStyles.subtleCard(isDark),
                { backgroundColor: theme.card },
              ]}
            >
              <View
                style={[
                  styles.bookIconCircle,
                  { backgroundColor: theme.primary + "15" },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={26}
                  color={theme.primary}
                />
              </View>
              <View style={styles.bookInfo}>
                <Text
                  style={[styles.bookTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {formatFileSize(item.file_size)} •{" "}
                  {new Date(item.upload_date).toLocaleDateString()}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    viewPDF(item);
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name="eye-outline"
                    size={18}
                    color={theme.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    sendToNora(item);
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: "#FF5722" + "15" },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#FF5722"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    deleteBook(item);
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: (theme.error ?? "#EF4444") + "15" },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.error ?? "#EF4444"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </StaggeredItem>
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.delay(250).duration(400)}>
            <View
              style={[
                styles.emptyContainer,
                glassStyles.subtleCard(isDark),
                { backgroundColor: theme.card },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.textSecondary + "15" },
                ]}
              >
                <Ionicons
                  name="book-outline"
                  size={40}
                  color={theme.textSecondary}
                />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No e-books uploaded yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: theme.textSecondary }]}
              >
                Upload your first textbook to get started
              </Text>
            </View>
          </Animated.View>
        }
      />

      {/* ===== DISCLAIMER MODAL ===== */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconCircle,
                  { backgroundColor: theme.primary + "15" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={28}
                  color={theme.primary}
                />
              </View>
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

              <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                Files are stored securely and are only accessible by you.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <AnimatedButton
                title={loading ? "Uploading..." : "I Agree & Upload"}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleUpload();
                }}
                variant="primary"
                size="large"
                gradient
                gradientColors={
                  PremiumColors.gradients.primary as [
                    string,
                    string,
                    ...string[],
                  ]
                }
                disabled={loading}
              />

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { borderColor: theme.text + "33" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDisclaimer(false);
                }}
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

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },

  // ===== SCROLL =====
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ===== SECTION LABELS =====
  sectionLabel: {
    ...Typography.label,
    marginTop: 24,
    marginBottom: 12,
  },

  // ===== UPLOAD AREA =====
  uploadArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginBottom: 8,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 13,
  },

  // ===== BOOK LIST =====
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  bookIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // ===== EMPTY STATE =====
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
  },
  modalHeader: {
    alignItems: "center",
    padding: 24,
    paddingBottom: 16,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  disclaimerText: {
    fontSize: 15,
    fontWeight: "600",
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
    fontStyle: "italic",
    textAlign: "center",
  },
  modalActions: {
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EBooksScreen;
