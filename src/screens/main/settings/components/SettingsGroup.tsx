import React from 'react';
import { ViewStyle } from 'react-native';
import { LiquidGlassCard } from '../../../../components/premium/LiquidGlass';
import { BorderRadius } from '../../../../theme/premiumTheme';

interface SettingsGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ children, style }) => {
  return (
    <LiquidGlassCard
      intensity="subtle"
      borderRadius={BorderRadius.lg}
      padding={0}
      style={style}
    >
      {children}
    </LiquidGlassCard>
  );
};

export default SettingsGroup;
