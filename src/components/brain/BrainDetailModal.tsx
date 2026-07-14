/**
 * Detail sheet for a selected brain area — shown for both a functional group
 * and (in the Elite view) a single anatomical region. The caller normalizes
 * either shape into BrainAreaDetail.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export interface BrainAreaDetail {
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** 0-1. */
  activity: number;
  studyMinutes: number;
  /** Human-readable, "" when never studied. */
  lastActive: string;
  subjects: string[];
}

interface BrainDetailModalProps {
  visible: boolean;
  detail: BrainAreaDetail | null;
  formatMinutes: (minutes: number) => string;
  onClose: () => void;
  onViewHistory: () => void;
}

const BrainDetailModal: React.FC<BrainDetailModalProps> = ({
  visible,
  detail,
  formatMinutes,
  onClose,
  onViewHistory,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible && detail !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.card }]}>
          {detail && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: detail.color + "1F" },
                  ]}
                >
                  <Ionicons name={detail.icon} size={28} color={detail.color} />
                </View>
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    { backgroundColor: theme.text + "12" },
                  ]}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={20} color={theme.text + "99"} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>
                {detail.title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.text + "99" }]}>
                {detail.subtitle}
              </Text>

              <View
                style={[styles.stats, { backgroundColor: theme.text + "0A" }]}
              >
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {detail.activity > 0
                      ? `${Math.round(detail.activity * 100)}%`
                      : "—"}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.text + "99" }]}
                  >
                    Activity
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {detail.studyMinutes > 0
                      ? formatMinutes(detail.studyMinutes)
                      : "—"}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.text + "99" }]}
                  >
                    Study Time
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {detail.lastActive || "Never"}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.text + "99" }]}
                  >
                    Last Active
                  </Text>
                </View>
              </View>

              <Text style={[styles.description, { color: theme.text + "99" }]}>
                {detail.description}
              </Text>

              {detail.subjects.length > 0 && (
                <View style={styles.chipRow}>
                  {detail.subjects.map((subject) => (
                    <View
                      key={subject}
                      style={[
                        styles.chip,
                        { backgroundColor: detail.color + "1F" },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: detail.color }]}>
                        {subject}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.historyButton,
                  { backgroundColor: detail.color },
                ]}
                onPress={onViewHistory}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.historyButtonText}>View Study History</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 18,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 18,
    paddingVertical: 14,
    borderRadius: 16,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  historyButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  historyButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

export default BrainDetailModal;
