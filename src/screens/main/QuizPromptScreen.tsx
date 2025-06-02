import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const QUIZ_OPTIONS = [
  { label: 'Create a quiz on my current topic', icon: <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#1B5E20" /> },
  { label: 'Practice with a random quiz', icon: <Ionicons name="shuffle-outline" size={22} color="#1B5E20" /> },
  { label: 'Teach me this topic', icon: <Ionicons name="school-outline" size={22} color="#1B5E20" /> },
  { label: 'Review my quiz results', icon: <Ionicons name="bar-chart-outline" size={22} color="#1B5E20" /> },
  { label: 'More quiz options', icon: <Ionicons name="ellipsis-horizontal" size={22} color="#1B5E20" /> },
];

const QuizPromptScreen: React.FC = () => {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={styles.container}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>What quiz help do you need?</Text>
          </View>
          <View style={styles.bottomSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
              {QUIZ_OPTIONS.map((option, idx) => (
                <TouchableOpacity key={option.label} style={styles.optionBtn}>
                  {option.icon}
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.inputBarRow}>
              <TextInput style={styles.inputBar} placeholder="Ask anything about quizzes..." placeholderTextColor="#BDBDBD" />
              <TouchableOpacity style={styles.micBtn}>
                <Ionicons name="mic" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF6' },
  titleContainer: { paddingTop: 48, alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center' },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FAFAF6',
  },
  optionsRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 16 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, marginRight: 14, elevation: 1 },
  optionLabel: { color: '#1B5E20', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  inputBarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F6E9', borderRadius: 24, marginHorizontal: 20, paddingHorizontal: 10, paddingVertical: 6, marginTop: 18 },
  inputBar: { flex: 1, fontSize: 16, color: '#222', paddingVertical: 8 },
  micBtn: { backgroundColor: '#1B5E20', borderRadius: 20, padding: 10, marginLeft: 8 },
});

export default QuizPromptScreen; 