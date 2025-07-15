import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from '../data/achievements';
import { useTheme } from '../context/ThemeContext';

interface BadgeDisplayProps {
  badges: Badge[];
  compact?: boolean;
  maxDisplay?: number;
  onBadgePress?: (badge: Badge) => void;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ 
  badges, 
  compact = false, 
  maxDisplay, 
  onBadgePress 
}) => {
  const { theme } = useTheme();
  
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const hasMore = maxDisplay && badges.length > maxDisplay;

  const getTierLabel = (tier: number): string => {
    const labels = ['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legend'];
    return labels[tier] || 'Unknown';
  };

  const renderBadge = (badge: Badge, index: number) => {
    const isHighTier = badge.tier >= 5;
    
    return (
      <TouchableOpacity
        key={badge.id}
        style={[
          compact ? styles.compactBadge : styles.badge,
          { 
            backgroundColor: badge.color + '20',
            borderColor: badge.color,
            borderWidth: isHighTier ? 2 : 1
          }
        ]}
        onPress={() => onBadgePress?.(badge)}
        activeOpacity={0.8}
      >
        <View style={[
          compact ? styles.compactIconContainer : styles.iconContainer,
          { backgroundColor: badge.color }
        ]}>
          <MaterialCommunityIcons 
            name={badge.icon as any} 
            size={compact ? 16 : 24} 
            color="#FFF" 
          />
          {isHighTier && (
            <View style={styles.tierIndicator}>
              <Text style={styles.tierText}>{badge.tier}</Text>
            </View>
          )}
        </View>
        
        {!compact && (
          <View style={styles.badgeInfo}>
            <Text style={[styles.badgeName, { color: badge.color }]} numberOfLines={1}>
              {badge.name}
            </Text>
            <Text style={[styles.badgeTier, { color: theme.text + '99' }]}>
              {getTierLabel(badge.tier)} • Tier {badge.tier}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (badges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="trophy-outline" size={48} color={theme.text + '40'} />
        <Text style={[styles.emptyText, { color: theme.text + '60' }]}>
          No badges earned yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.text + '40' }]}>
          Complete activities to earn your first badge!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal={compact} 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={compact ? styles.compactContainer : styles.gridContainer}
      >
        {displayBadges.map((badge, index) => renderBadge(badge, index))}
        
        {hasMore && (
          <View style={[
            compact ? styles.compactBadge : styles.badge,
            styles.moreBadge,
            { backgroundColor: theme.card, borderColor: theme.text + '20' }
          ]}>
            <View style={[
              compact ? styles.compactIconContainer : styles.iconContainer,
              { backgroundColor: theme.text + '20' }
            ]}>
              <MaterialCommunityIcons 
                name="plus" 
                size={compact ? 16 : 24} 
                color={theme.text} 
              />
            </View>
            {!compact && (
              <View style={styles.badgeInfo}>
                <Text style={[styles.badgeName, { color: theme.text }]}>
                  +{badges.length - maxDisplay!} more
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  compactContainer: {
    paddingHorizontal: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 140,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactBadge: {
    padding: 8,
    margin: 4,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tierIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  badgeTier: {
    fontSize: 12,
  },
  moreBadge: {
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BadgeDisplay;