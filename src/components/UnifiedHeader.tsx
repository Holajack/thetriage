import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface UnifiedHeaderProps {
  title?: string;
  onClose?: () => void;
  showMenu?: boolean;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title = 'Traveller',
  onClose,
  showMenu = false
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
      >
        <View style={[styles.closeButtonCircle, { backgroundColor: theme.text + '20' }]}>
          <Ionicons name="close" size={24} color={theme.text} />
        </View>
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>

      <View style={styles.headerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
});
