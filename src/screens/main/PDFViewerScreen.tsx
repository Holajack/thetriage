import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { useTheme } from "../../context/ThemeContext";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";

interface PDFViewerParams {
  url: string;
  title: string;
  bookData: any;
}

const PDFViewerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { theme } = useTheme();
  const { url, title, bookData } = route.params as PDFViewerParams;
  const { hasNoraAccess } = useSubscriptionTier();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // A PDF WebView (native rendering on iOS, the Google Docs gview iframe on
  // Android) fires onLoadStart/onLoadEnd repeatedly after the document is
  // already visible — internal page navigation, lazy-loaded pages, gview's
  // own iframe reloads. Without this guard, each one re-triggers the
  // full-screen loading overlay over content that's already rendered,
  // which is exactly the "glitchy" flicker reported from device testing.
  // Only the FIRST load cycle should show the overlay.
  const hasLoadedOnce = useRef(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this PDF: ${title}`,
        url: url,
        title: title,
      });
    } catch (error) {
      // Share error
    }
  };

  // PDF analysis is a Nora (Elite) capability — Patrick can't read documents.
  const askNora = () => {
    if (hasNoraAccess) {
      navigation.navigate("NoraScreen", {
        initialPdfTitle: title,
        initialMessage: `Help me study from "${title}".`,
      });
    } else {
      Alert.alert(
        "Nora can read this PDF",
        "Nora AI on the Elite plan can analyze your PDFs — study guides, practice questions, and summaries.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "View Plans",
            onPress: () => navigation.navigate("Subscription"),
          },
        ],
      );
    }
  };

  const openInExternalApp = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open PDF in external app");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open PDF");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text + "99" }]}>
            PDF Document
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={openInExternalApp}
            style={styles.headerButton}
          >
            <Ionicons name="open-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={askNora} style={styles.headerButton}>
            <Ionicons name="chatbox-outline" size={24} color="#FF5722" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ShimmerLoader variant="circle" size={48} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading PDF...
            </Text>
            <TouchableOpacity
              style={[
                styles.openExternalButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={openInExternalApp}
            >
              <Text style={styles.openExternalButtonText}>
                Open in External App
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={theme.text + "33"}
            />
            <Text style={[styles.errorText, { color: theme.text }]}>
              Could not load PDF in app
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={openInExternalApp}
            >
              <Text style={styles.retryButtonText}>Open in External App</Text>
            </TouchableOpacity>
          </View>
        )}

        <WebView
          source={{
            uri:
              Platform.OS === "ios"
                ? url
                : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`,
          }}
          style={styles.webview}
          onLoadStart={() => {
            if (!hasLoadedOnce.current) setLoading(true);
          }}
          onLoadEnd={() => {
            hasLoadedOnce.current = true;
            setLoading(false);
          }}
          onError={(syntheticEvent) => {
            // WebView error
            setLoading(false);
            setError(true);
          }}
          onHttpError={(syntheticEvent) => {
            // Only the top-level document failing is a real "can't load
            // this PDF" — a sub-resource 404 inside an already-rendered
            // document (e.g. gview's own analytics/asset requests on
            // Android) isn't fatal and shouldn't kick the user to the
            // error screen once content is already visible.
            if (hasLoadedOnce.current) return;
            setLoading(false);
            setError(true);
          }}
          scalesPageToFit={Platform.OS === "android"}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={askNora}
        >
          <Ionicons name="chatbox-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Ask Nora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.text + "15" }]}
          onPress={() =>
            navigation.navigate("StudySessionScreen" as any, {
              taskName: `Study ${title}`,
              fromPDF: true,
            })
          }
        >
          <Ionicons name="timer-outline" size={20} color={theme.text} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>
            Start Study Session
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  pdfContainer: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    zIndex: 10,
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  openExternalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openExternalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontWeight: "bold",
    color: "#fff",
  },
});

export default PDFViewerScreen;
