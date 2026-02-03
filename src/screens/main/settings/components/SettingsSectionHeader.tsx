import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { Typography, Spacing } from '../../../../theme/premiumTheme';

interface SettingsSectionHeaderProps {
  title: string;
}

const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ title }) => {
  const { theme } = useTheme();

  return (
    <Text style={[styles.header, { color: theme.primary }]}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  header: {
    ...Typography.label,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.md + 4,
  },
});

export default SettingsSectionHeader;
