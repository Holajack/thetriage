import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface FlintIconProps {
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Flint Currency Icon Component
 * Displays the arrowhead flint icon from assets
 * Shows the original colors from the image (dark brown with light brown accents)
 */
export const FlintIcon: React.FC<FlintIconProps> = ({
  size = 24,
  color = '#FF5700',
  style
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={require('../assets/flint shop/arrow_head_flint.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
