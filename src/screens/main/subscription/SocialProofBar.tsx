import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Spacing } from '../../../theme/premiumTheme';

const SocialProofBar: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.delay(900).duration(400)} style={styles.container}>
      <Text style={[styles.headline, { color: theme.text }]}>
        Join 10,000+ students studying smarter
      </Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= 4 ? 'star' : 'star-half'}
            size={18}
            color="#F59E0B"
          />
        ))}
        <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
          4.8 from 2,400+ reviews
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headline: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...Typography.caption,
    marginLeft: 8,
  },
});

export default SocialProofBar;
