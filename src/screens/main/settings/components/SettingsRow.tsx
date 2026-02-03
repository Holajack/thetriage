import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { Typography, Spacing } from '../../../../theme/premiumTheme';

interface SettingsRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
  isLast?: boolean;
  children?: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  label,
  description,
  value,
  onPress,
  showChevron,
  toggle,
  toggleValue,
  onToggleChange,
  disabled = false,
  danger = false,
  isLast = false,
  children,
}) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const resolvedIconColor = danger
    ? (isDark ? '#ff6b6b' : '#ff4444')
    : (iconColor ?? theme.primary);
  const labelColor = danger ? (isDark ? '#ff6b6b' : '#ff4444') : theme.text;
  const descColor = danger
    ? `${isDark ? '#ff6b6b' : '#ff4444'}99`
    : (theme.textSecondary ?? (isDark ? '#A6A6A6' : '#666'));
  const borderColor = theme.border ?? (isDark ? '#2F2F2F' : '#E0E0E0');
  const shouldShowChevron = showChevron ?? (!!onPress && !toggle);

  const content = (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={22}
        color={resolvedIconColor}
        style={styles.icon}
      />
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: descColor }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {children}
      </View>
      {value ? (
        <Text style={[styles.value, { color: theme.primary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{
            false: isDark ? '#525252' : '#E0E0E0',
            true: theme.primary,
          }}
          thumbColor={
            toggleValue
              ? (isDark ? (theme.secondary ?? '#A5D6A7') : '#FFFFFF')
              : (isDark ? '#888' : '#FFFFFF')
          }
        />
      ) : null}
      {shouldShowChevron ? (
        <Ionicons
          name="chevron-forward-outline"
          size={20}
          color={theme.textSecondary ?? (isDark ? '#A6A6A6' : '#999')}
        />
      ) : null}
    </View>
  );

  if (onPress && !toggle) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={disabled}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md + 4,
  },
  icon: {
    marginRight: Spacing.sm,
    width: 24,
    textAlign: 'center',
  },
  labelContainer: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
  description: {
    ...Typography.caption,
    marginTop: 2,
  },
  value: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
});

export default SettingsRow;
