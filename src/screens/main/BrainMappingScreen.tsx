import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";
import {
  hasBrainMappingAccess,
  hasFullBrainMapping,
} from "../../utils/tierGating";
const { useUserAppData } = require("../../utils/userAppData");
// Lazy load OBJBrain3D to avoid Three.js URL errors at module load time
const OBJBrain3D = React.lazy(() => import("../../components/OBJBrain3D"));
import {
  generateBrainVisualizationData,
  Brain3DRegion,
  BrainDataInput,
} from "../../utils/brain3DData";
import BrainAreaCard from "../../components/brain/BrainAreaCard";
import BrainDetailModal, {
  BrainAreaDetail,
} from "../../components/brain/BrainDetailModal";
import { MainTabParamList } from "../../navigation/types";
import ReAnimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useFocusAnimationKey } from "../../utils/animationUtils";

type Selection =
  | { type: "group"; id: string }
  | { type: "region"; id: string }
  | null;

// Keep in step with OBJBrain3D's CANVAS_SIZE so the Suspense placeholder is the
// same size as the canvas that replaces it and the page doesn't jump.
const BRAIN_CANVAS_SIZE = Math.min(Dimensions.get("window").width - 40, 400);

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const BrainMappingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const focusKey = useFocusAnimationKey();

  const { currentTier, isLoading: tierLoading } = useSubscriptionTier();
  const canAccess = hasBrainMappingAccess(currentTier);
  const canSeeDetail = hasFullBrainMapping(currentTier);

  const [selection, setSelection] = useState<Selection>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const {
    data: userData,
    isLoading: userDataLoading,
    error: userDataError,
  } = useUserAppData() as {
    data: BrainDataInput | null;
    isLoading: boolean;
    error: unknown;
  };

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const brain = useMemo(
    () =>
      generateBrainVisualizationData({
        sessions: userData?.sessions,
        tasks: userData?.tasks,
      }),
    [userData?.sessions, userData?.tasks],
  );

  // The detailed list is Elite-only. Deriving it from the entitlement (rather
  // than from showDetail alone) means a tier change while the screen is open
  // cannot leave gated content on screen.
  const detailView = showDetail && canSeeDetail;

  // Which anatomical regions the 3D model highlights. Selecting a plain-language
  // group lights up every region inside it.
  const selectedRegionIds = useMemo(() => {
    if (!selection) return [];
    if (selection.type === "region") return [selection.id];
    const group = brain.groups.find((g) => g.id === selection.id);
    return group ? group.regionIds : [];
  }, [selection, brain.groups]);

  // Normalize whichever thing is selected into one shape for the detail sheet.
  const detail: BrainAreaDetail | null = useMemo(() => {
    if (!selection) return null;

    if (selection.type === "group") {
      const group = brain.groups.find((g) => g.id === selection.id);
      if (!group) return null;
      return {
        title: group.name,
        subtitle: group.tagline,
        description: group.description,
        color: group.color,
        icon: group.icon as keyof typeof Ionicons.glyphMap,
        activity: group.activity,
        studyMinutes: group.studyMinutes,
        lastActive: group.lastActive,
        subjects: group.subjects,
      };
    }

    const region = brain.regions.find((r) => r.id === selection.id);
    if (!region) return null;
    const parent = brain.groups.find((g) => g.id === region.groupId);
    return {
      title: region.name,
      subtitle: parent ? `Part of ${parent.name}` : "Brain region",
      description: region.description,
      color: region.color,
      icon: "pulse",
      activity: region.activity,
      studyMinutes: region.studyMinutes,
      lastActive: region.lastActive,
      subjects: [],
    };
  }, [selection, brain.groups, brain.regions]);

  // A tap on the model returns an anatomical region; in the core view we roll it
  // up to its group so casual users stay in plain language.
  const handleModelRegionPress = (region: Brain3DRegion) => {
    setSelection(
      detailView
        ? { type: "region", id: region.id }
        : { type: "group", id: region.groupId },
    );
    setModalVisible(true);
  };

  // The highlight deliberately outlives the modal — dismissing the sheet leaves
  // the region glowing on the model, which is the point of the feature. Tapping
  // the same card again, or "Clear highlight", lets the brain go back to rest.
  const closeModal = () => setModalVisible(false);

  const clearSelection = () => {
    setSelection(null);
    setModalVisible(false);
  };

  const toggleSelection = (next: NonNullable<Selection>) => {
    if (selection?.type === next.type && selection.id === next.id) {
      clearSelection();
      return;
    }
    setSelection(next);
    setModalVisible(true);
  };

  const goToSubscription = () => navigation.navigate("Subscription");

  const goToHistory = () => {
    setModalVisible(false);
    navigation.navigate("SessionHistory");
  };

  const header = (
    <ReAnimated.View
      entering={FadeIn.delay(50).duration(200)}
      style={[styles.customHeader, { backgroundColor: theme.background }]}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate("Bonuses")}
        style={[styles.backButton, { backgroundColor: theme.card }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>
        Brain Mapping
      </Text>
      <View style={styles.headerSpacer} />
    </ReAnimated.View>
  );

  // ---------------------------------------------------------------------
  // Tier still resolving — never flash the upgrade wall at a paying member.
  // ---------------------------------------------------------------------
  if (tierLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------
  // Locked (Free / Basic)
  // ---------------------------------------------------------------------
  if (!canAccess) {
    return (
      <ReAnimated.View
        key={`locked-${focusKey}`}
        entering={FadeIn.duration(250)}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {header}
        <View style={styles.centered}>
          <View style={[styles.lockedIcon, { backgroundColor: "#9C27B018" }]}>
            <Ionicons name="lock-closed" size={40} color="#9C27B0" />
          </View>
          <Text style={[styles.lockedTitle, { color: theme.text }]}>
            See your brain light up
          </Text>
          <Text style={[styles.lockedBody, { color: theme.text + "99" }]}>
            Brain Mapping turns your focus sessions into a living 3D map — the
            areas you exercise most glow brightest. Studying maths lights up one
            region; languages light up another.
          </Text>
          <Text style={[styles.lockedBody, { color: theme.text + "99" }]}>
            Included with Pro. Elite unlocks the full anatomical breakdown.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: "#9C27B0" }]}
            onPress={goToSubscription}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </ReAnimated.View>
    );
  }

  // ---------------------------------------------------------------------
  // Unlocked
  // ---------------------------------------------------------------------
  const sortedGroups = [...brain.groups].sort(
    (a, b) => b.activity - a.activity,
  );
  const sortedRegions = [...brain.regions].sort(
    (a, b) => b.activity - a.activity,
  );

  return (
    <ReAnimated.View
      key={`container-${focusKey}`}
      entering={FadeIn.duration(250)}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {header}

      <ReAnimated.ScrollView
        entering={FadeInUp.delay(100).duration(300)}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Past-4-weeks summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.summaryLabel, { color: theme.text + "99" }]}>
            YOUR BRAIN — PAST 4 WEEKS
          </Text>

          {userDataLoading ? (
            // Never claim "no activity" before the data has actually arrived.
            <>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>
                Reading your sessions…
              </Text>
              <ActivityIndicator
                style={styles.summaryLoader}
                color={theme.text}
              />
            </>
          ) : userDataError ? (
            <>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>
                Couldn't load your study data
              </Text>
              <Text style={[styles.summaryHint, { color: theme.text + "99" }]}>
                Your brain map may be incomplete. Check your connection, then
                come back into this screen to retry.
              </Text>
            </>
          ) : brain.hasActivity ? (
            <>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>
                {formatMinutes(brain.totalMinutes)} of focused study
              </Text>
              <Text style={[styles.summaryHint, { color: theme.text + "99" }]}>
                Your most-exercised areas — tap one to find it on the model.
              </Text>
              <View style={styles.chipRow}>
                {brain.topSubjects.map((item) => {
                  const group = brain.groups.find((g) => g.id === item.groupId);
                  const color = group?.color ?? "#4CAF50";
                  return (
                    <TouchableOpacity
                      key={item.subject}
                      style={[styles.chip, { backgroundColor: color + "1F" }]}
                      onPress={() =>
                        toggleSelection({ type: "group", id: item.groupId })
                      }
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, { color }]}>
                        {item.subject} · {formatMinutes(item.minutes)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>
                Your brain is resting
              </Text>
              <Text style={[styles.summaryHint, { color: theme.text + "99" }]}>
                Finish a focus session and the regions you exercised will light
                up here. Tap any region on the model to learn what it does.
              </Text>
            </>
          )}
        </View>

        {/* 3D model */}
        <View style={styles.brain3DContainer}>
          <Suspense
            fallback={
              <View style={styles.brain3DFallback}>
                <ActivityIndicator size="large" color="#8B9DC3" />
              </View>
            }
          >
            <OBJBrain3D
              regions={brain.regions}
              selectedRegionIds={selectedRegionIds}
              onRegionPress={handleModelRegionPress}
              autoRotate
              onInteractionStart={() => setScrollEnabled(false)}
              onInteractionEnd={() => setScrollEnabled(true)}
            />
          </Suspense>

          {selection ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSelection}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons
                name="close-circle"
                size={14}
                color={theme.text + "99"}
              />
              <Text style={[styles.brainHint, { color: theme.text + "99" }]}>
                Clear highlight
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.brainHint, { color: theme.text + "80" }]}>
              Drag to rotate · Tap a region to explore it
            </Text>
          )}
        </View>

        {/* Areas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {detailView ? "Anatomical Regions" : "What You've Been Exercising"}
          </Text>

          {detailView
            ? sortedRegions.map((region) => (
                <BrainAreaCard
                  key={region.id}
                  title={region.name}
                  subtitle={region.description}
                  valueLabel={
                    region.activity > 0
                      ? `${Math.round(region.activity * 100)}%`
                      : "Resting"
                  }
                  activity={region.activity}
                  color={region.color}
                  icon="pulse"
                  isSelected={
                    selection?.type === "region" && selection.id === region.id
                  }
                  onPress={() =>
                    toggleSelection({ type: "region", id: region.id })
                  }
                />
              ))
            : sortedGroups.map((group) => (
                <BrainAreaCard
                  key={group.id}
                  title={group.name}
                  subtitle={
                    group.subjects.length > 0
                      ? group.subjects.slice(0, 3).join(" · ")
                      : group.tagline
                  }
                  valueLabel={
                    group.studyMinutes > 0
                      ? formatMinutes(group.studyMinutes)
                      : "Resting"
                  }
                  activity={group.activity}
                  color={group.color}
                  icon={group.icon as keyof typeof Ionicons.glyphMap}
                  isSelected={
                    selection?.type === "group" && selection.id === group.id
                  }
                  onPress={() =>
                    toggleSelection({ type: "group", id: group.id })
                  }
                />
              ))}

          {/* Progressive disclosure: plain-language by default, anatomy on request */}
          {canSeeDetail ? (
            <TouchableOpacity
              style={[styles.detailToggle, { borderColor: theme.text + "22" }]}
              onPress={() => {
                setShowDetail((prev) => !prev);
                clearSelection();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons
                name={detailView ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.text + "99"}
              />
              <Text
                style={[styles.detailToggleText, { color: theme.text + "99" }]}
              >
                {detailView
                  ? "Back to the simple view"
                  : "Show more detail — all 12 regions"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.detailToggle, { borderColor: theme.text + "22" }]}
              onPress={goToSubscription}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="lock-closed" size={14} color="#9C27B0" />
              <Text style={[styles.detailToggleText, { color: "#9C27B0" }]}>
                Unlock the full anatomical view with Elite
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ReAnimated.ScrollView>

      <BrainDetailModal
        visible={modalVisible}
        detail={detail}
        formatMinutes={formatMinutes}
        onClose={closeModal}
        onViewHistory={goToHistory}
      />
    </ReAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },

  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: { width: 40 },

  // Locked state
  lockedIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  lockedBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 12,
  },
  upgradeButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 44,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  // Summary
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 18,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  summaryHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryLoader: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
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

  // 3D
  brain3DContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  brain3DFallback: {
    width: BRAIN_CANVAS_SIZE,
    height: BRAIN_CANVAS_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
  },
  brainHint: {
    marginTop: 10,
    fontSize: 12,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },

  // Areas
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },
  detailToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default BrainMappingScreen;
