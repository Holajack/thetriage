import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';

interface PDFViewerParams {
  url: string;
  title: string;
  bookData: any;
}

const PDFViewerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { url, title, bookData } = route.params as PDFViewerParams;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this PDF: ${title}`,
        url: url,
        title: title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const sendToPatrick = () => {
    navigation.navigate('Patrick' as any, { 
      initialMessage: `I'm looking at "${title}". Can you help me study from this textbook?`,
      pdfContext: {
        title: title,
        url: url,
        fileSize: bookData?.file_size
      }
    });
  };

  const openInExternalApp = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open PDF in external app');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open PDF');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text + '99' }]}>
            PDF Document
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openInExternalApp} style={styles.headerButton}>
            <Ionicons name="open-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={sendToPatrick} style={styles.headerButton}>
            <Ionicons name="chatbot-outline" size={24} color="#FF5722" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ShimmerLoader variant="circular" size={48} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading PDF...
            </Text>
            <TouchableOpacity
              style={[styles.openExternalButton, { backgroundColor: theme.primary }]}
              onPress={openInExternalApp}
            >
              <Text style={styles.openExternalButtonText}>Open in External App</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.text + '33'} />
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
            uri: Platform.OS === 'ios' ? url : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
          }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            console.error('WebView error:', syntheticEvent.nativeEvent);
            setLoading(false);
            setError(true);
          }}
          onHttpError={(syntheticEvent) => {
            console.error('WebView HTTP error:', syntheticEvent.nativeEvent);
            setLoading(false);
            setError(true);
          }}
          startInLoadingState
          scalesPageToFit={Platform.OS === 'android'}
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
          onPress={sendToPatrick}
        >
          <Ionicons name="chatbot-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Ask Patrick</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.text + '15' }]}
          onPress={() => navigation.navigate('StudySessionScreen' as any, {
            taskName: `Study ${title}`,
            fromPDF: true
          })}
        >
          <Ionicons name="timer-outline" size={20} color={theme.text} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Start Study Session</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default PDFViewerScreen;