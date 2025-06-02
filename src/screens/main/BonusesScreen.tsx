import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const BonusesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bonusItems = [
    {
      icon: 'trophy-variant',
      title: 'Achievements',
      description: 'Track your progress and unlock rewards',
      colors: ['#FFF8E1', '#FFE082'] as [string, string],
      route: 'Achievements',
    },
    {
      icon: 'book-open-page-variant',
      title: 'E-Book Uploads',
      description: 'Upload and organize your study materials',
      colors: ['#E8F5E9', '#C8E6C9'] as [string, string],
      route: 'EBooks',
    },
    {
      icon: 'lightbulb-on-outline',
      title: 'Self-Discovery Quizzes',
      description: 'Understand your learning style better',
      colors: ['#FFF3E0', '#FFE0B2'] as [string, string],
      route: 'SelfDiscoveryQuiz',
    },
    {
      icon: 'brain',
      title: 'Brain Mapping',
      description: 'Visualize your cognitive activity',
      colors: ['#E8EAF6', '#C5CAE9'] as [string, string],
      route: 'BrainMapping',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primary }]}>Bonus Features</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.text }]}>Enhance your learning experience</Text>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {bonusItems.map((item, index) => (
          <Animated.View
            key={item.title}
            style={[
              {
                opacity: fadeAnim,
                transform: [{ 
                  translateY: Animated.add(
                    slideAnim,
                    Animated.multiply(slideAnim, index * 0.3)
                  )
                }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={item.colors}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons 
                    name={item.icon as any}
                    size={48} 
                    color={theme.primary} 
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.primary }]}>{item.title}</Text>
                  <Text style={[styles.cardDescription, { color: theme.text }]}>{item.description}</Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={theme.primary} 
                  style={styles.chevron}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={styles.infoSection}>
          <MaterialCommunityIcons name="information-outline" size={24} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            These features are designed to complement your study sessions and help you achieve better learning outcomes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAF6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    minHeight: 120,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chevron: {
    marginLeft: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#388E3C',
    lineHeight: 20,
  },
});

export default BonusesScreen; 