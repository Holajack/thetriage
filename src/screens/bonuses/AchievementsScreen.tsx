import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  useConvexAchievements,
  useConvexLeaderboard,
} from "../../hooks/useConvex";
import { useTheme } from "../../context/ThemeContext";
import { StaggeredItem } from "../../components/premium/StaggeredList";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import {
  useCounterAnimation,
  useFocusAnimationKey,
} from "../../utils/animationUtils";

const BADGE_SIZE = 84;

// ---------------------------------------------------------------------------
// Buddy theme palette (warm forest hues -- no neon)
// ---------------------------------------------------------------------------
type BuddyId = "fox" | "bear" | "deer" | "nora" | "wolf" | "lion";

interface BuddyTheme {
  g1: string;
  g2: string;
  shadow: string;
  accent: string;
}

const BUDDY_THEME: Record<BuddyId, BuddyTheme> = {
  fox: { g1: "#F4B86C", g2: "#E89B6C", shadow: "#C97A4F", accent: "#7A3F2A" },
  bear: { g1: "#E5C39A", g2: "#B89270", shadow: "#8C6648", accent: "#4A2F1F" },
  deer: { g1: "#D4E5E0", g2: "#9CC4B7", shadow: "#6B9A8B", accent: "#234E3E" },
  nora: { g1: "#B8D8DC", g2: "#7CB1B8", shadow: "#3D7A80", accent: "#1F4A50" },
  wolf: { g1: "#C5CFD3", g2: "#8E9CA3", shadow: "#5A6A72", accent: "#2A3942" },
  lion: { g1: "#F4D87C", g2: "#E0A847", shadow: "#A87324", accent: "#5C3F12" },
};

// Trail-buddy sprite images
const BUDDY_IMAGES: Record<BuddyId, ImageSourcePropType> = {
  fox: require("../../../assets/trail-buddies/fox-frames/fox_frame_00.webp"),
  bear: require("../../../assets/trail-buddies/bear-frames/bear_frame_00.webp"),
  deer: require("../../../assets/trail-buddies/deer-frames/deer_frame_00.webp"),
  nora: require("../../../assets/trail-buddies/nora-frames/nora_frame_00.webp"),
  wolf: require("../../../assets/trail-buddies/wolf-frames/wolf_frame_00.webp"),
  lion: require("../../../assets/trail-buddies/lion-frames/lion_frame_00.webp"),
};

// ---------------------------------------------------------------------------
// Achievement category definitions
// ---------------------------------------------------------------------------
interface Award {
  id: string;
  name: string;
  count: number;
  tier: "bronze" | "silver" | "gold" | "epic" | "legendary";
  earned: boolean;
  isNew: boolean;
}

interface Category {
  id: string;
  name: string;
  buddy: BuddyId;
  blurb: string;
  awards: Award[];
}

const CATEGORY_DEFS: Category[] = [
  {
    id: "streaks",
    name: "Streaks",
    buddy: "fox",
    blurb: "Days in a row",
    awards: [
      {
        id: "s3",
        name: "First Spark",
        count: 3,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "s7",
        name: "On A Roll",
        count: 7,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "s30",
        name: "Steady Climber",
        count: 30,
        tier: "gold",
        earned: false,
        isNew: false,
      },
      {
        id: "s100",
        name: "Centurion",
        count: 100,
        tier: "epic",
        earned: false,
        isNew: false,
      },
      {
        id: "s365",
        name: "Year of Habit",
        count: 365,
        tier: "legendary",
        earned: false,
        isNew: false,
      },
    ],
  },
  {
    id: "focus",
    name: "Focus Hours",
    buddy: "lion",
    blurb: "Deep work logged",
    awards: [
      {
        id: "f10",
        name: "First Trail",
        count: 10,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "f50",
        name: "Half Marathon",
        count: 50,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "f100",
        name: "Summit Bound",
        count: 100,
        tier: "gold",
        earned: false,
        isNew: false,
      },
      {
        id: "f250",
        name: "Trailblazer",
        count: 250,
        tier: "epic",
        earned: false,
        isNew: false,
      },
      {
        id: "f1000",
        name: "Mountain Pass",
        count: 1000,
        tier: "legendary",
        earned: false,
        isNew: false,
      },
    ],
  },
  {
    id: "sessions",
    name: "Sessions",
    buddy: "bear",
    blurb: "Pomodoros completed",
    awards: [
      {
        id: "p10",
        name: "Tenderfoot",
        count: 10,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "p50",
        name: "Pathfinder",
        count: 50,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "p200",
        name: "Backpacker",
        count: 200,
        tier: "gold",
        earned: false,
        isNew: false,
      },
      {
        id: "p500",
        name: "Through-Hiker",
        count: 500,
        tier: "epic",
        earned: false,
        isNew: false,
      },
    ],
  },
  {
    id: "rooms",
    name: "Study Rooms",
    buddy: "nora",
    blurb: "Sessions with friends",
    awards: [
      {
        id: "r1",
        name: "Hello Camp",
        count: 1,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "r10",
        name: "Trail Crew",
        count: 10,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "r25",
        name: "Pack Leader",
        count: 25,
        tier: "gold",
        earned: false,
        isNew: false,
      },
    ],
  },
  {
    id: "subjects",
    name: "Subjects",
    buddy: "deer",
    blurb: "Topics studied",
    awards: [
      {
        id: "t3",
        name: "Curious",
        count: 3,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "t7",
        name: "Polymath",
        count: 7,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "t15",
        name: "Renaissance",
        count: 15,
        tier: "gold",
        earned: false,
        isNew: false,
      },
    ],
  },
  {
    id: "breaks",
    name: "Smart Breaks",
    buddy: "wolf",
    blurb: "Rest taken on time",
    awards: [
      {
        id: "b10",
        name: "Rest Easy",
        count: 10,
        tier: "bronze",
        earned: false,
        isNew: false,
      },
      {
        id: "b50",
        name: "Recharge Pro",
        count: 50,
        tier: "silver",
        earned: false,
        isNew: false,
      },
      {
        id: "b150",
        name: "Mind Master",
        count: 150,
        tier: "gold",
        earned: false,
        isNew: false,
      },
    ],
  },
];

// Map achievement_type to category + award id for matching Convex data
const ACHIEVEMENT_TYPE_MAP: Record<
  string,
  { categoryId: string; awardId: string }
> = {
  // Streaks
  streak_3: { categoryId: "streaks", awardId: "s3" },
  streak_7: { categoryId: "streaks", awardId: "s7" },
  streak_30: { categoryId: "streaks", awardId: "s30" },
  streak_100: { categoryId: "streaks", awardId: "s100" },
  streak_365: { categoryId: "streaks", awardId: "s365" },
  week_warrior: { categoryId: "streaks", awardId: "s7" },
  // Focus
  focus_10: { categoryId: "focus", awardId: "f10" },
  focus_50: { categoryId: "focus", awardId: "f50" },
  focus_100: { categoryId: "focus", awardId: "f100" },
  focus_250: { categoryId: "focus", awardId: "f250" },
  focus_1000: { categoryId: "focus", awardId: "f1000" },
  deep_focus: { categoryId: "focus", awardId: "f10" },
  // Sessions
  session_10: { categoryId: "sessions", awardId: "p10" },
  session_50: { categoryId: "sessions", awardId: "p50" },
  session_200: { categoryId: "sessions", awardId: "p200" },
  session_500: { categoryId: "sessions", awardId: "p500" },
  // Rooms
  room_1: { categoryId: "rooms", awardId: "r1" },
  room_10: { categoryId: "rooms", awardId: "r10" },
  room_25: { categoryId: "rooms", awardId: "r25" },
  social_1: { categoryId: "rooms", awardId: "r1" },
  // Subjects
  subject_3: { categoryId: "subjects", awardId: "t3" },
  subject_7: { categoryId: "subjects", awardId: "t7" },
  subject_15: { categoryId: "subjects", awardId: "t15" },
  // Breaks
  break_10: { categoryId: "breaks", awardId: "b10" },
  break_50: { categoryId: "breaks", awardId: "b50" },
  break_150: { categoryId: "breaks", awardId: "b150" },
};

// ---------------------------------------------------------------------------
// Merge Convex achievements into category definitions
// ---------------------------------------------------------------------------
interface EarnedAchievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon?: string;
  pointsAwarded?: number;
  category?: string;
  earned_at?: string;
}

function mergeAchievements(earned: EarnedAchievement[]): {
  categories: Category[];
  totalEarned: number;
  newCount: number;
} {
  // Deep-clone the template
  const categories: Category[] = JSON.parse(JSON.stringify(CATEGORY_DEFS));

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let totalEarned = 0;
  let newCount = 0;

  // Also try matching by category field from Convex
  for (const ea of earned) {
    const mapping = ACHIEVEMENT_TYPE_MAP[ea.achievement_type];
    let matched = false;

    if (mapping) {
      const cat = categories.find((c) => c.id === mapping.categoryId);
      const award = cat?.awards.find((a) => a.id === mapping.awardId);
      if (award && !award.earned) {
        award.earned = true;
        totalEarned++;
        if (ea.earned_at && new Date(ea.earned_at).getTime() > oneWeekAgo) {
          award.isNew = true;
          newCount++;
        }
        matched = true;
      }
    }

    // Fallback: match by category name from Convex
    if (!matched && ea.category) {
      const catName = ea.category.toLowerCase();
      const cat = categories.find(
        (c) => c.id === catName || c.name.toLowerCase() === catName,
      );
      if (cat) {
        // Find first unearned award
        const award = cat.awards.find((a) => !a.earned);
        if (award) {
          award.earned = true;
          totalEarned++;
          if (ea.earned_at && new Date(ea.earned_at).getTime() > oneWeekAgo) {
            award.isNew = true;
            newCount++;
          }
        }
      }
    }
  }

  return { categories, totalEarned, newCount };
}

// ---------------------------------------------------------------------------
// BuddyBadge component
// ---------------------------------------------------------------------------
interface BuddyBadgeProps {
  buddy: BuddyId;
  size?: number;
  count?: number | string;
  locked?: boolean;
  isNew?: boolean;
}

const BuddyBadge: React.FC<BuddyBadgeProps> = ({
  buddy,
  size = BADGE_SIZE,
  count,
  locked = false,
  isNew = false,
}) => {
  const t = BUDDY_THEME[buddy];
  const ringW = Math.max(2, size * 0.04);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Ambient glow */}
      {!locked && (
        <View
          style={{
            position: "absolute",
            top: -size * 0.08,
            left: -size * 0.08,
            right: -size * 0.08,
            bottom: -size * 0.08,
            borderRadius: size,
            backgroundColor: t.g1 + "35",
          }}
        />
      )}

      {/* Outer gradient disc */}
      <LinearGradient
        colors={locked ? ["#E4EBE8", "#C8D7D1"] : [t.g1, t.g2, t.shadow]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
      >
        {/* Top highlight */}
        {!locked && (
          <View
            style={{
              position: "absolute",
              top: "6%",
              left: "15%",
              right: "15%",
              height: "30%",
              borderRadius: size,
              backgroundColor: "rgba(255,255,255,0.35)",
            }}
          />
        )}
      </LinearGradient>

      {/* Ring */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringW,
          borderColor: locked
            ? "rgba(255,255,255,0.5)"
            : "rgba(255,255,255,0.75)",
        }}
      />

      {/* Buddy image */}
      <Image
        source={BUDDY_IMAGES[buddy]}
        style={{
          width: size * 0.7,
          height: size * 0.7,
          opacity: locked ? 0.35 : 1,
        }}
        resizeMode="contain"
      />

      {/* Lock overlay */}
      {locked && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="lock-closed" size={size * 0.28} color="#9CA3AF" />
        </View>
      )}

      {/* Count banner */}
      {count != null && (
        <View
          style={{
            position: "absolute",
            bottom: locked ? size * 0.08 : size * 0.04,
            alignSelf: "center",
            paddingHorizontal: size * 0.11,
            paddingVertical: size * 0.025,
            borderRadius: 999,
            backgroundColor: "#fff",
            borderWidth: Math.max(1, size * 0.012),
            borderColor: locked ? "#E4EBE8" : "rgba(255,255,255,0.95)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: locked ? 0.05 : 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: locked ? "#9CA3AF" : t.accent,
              fontWeight: "800",
              fontSize: size * 0.18,
              lineHeight: size * 0.22,
              fontVariant: ["tabular-nums"],
              letterSpacing: -0.5,
            }}
          >
            {locked ? "—" : count}
          </Text>
        </View>
      )}

      {/* NEW pill */}
      {isNew && !locked && (
        <View
          style={{
            position: "absolute",
            top: -size * 0.04,
            right: -size * 0.06,
            paddingHorizontal: size * 0.09,
            paddingVertical: size * 0.025,
            borderRadius: 999,
            backgroundColor: "#EF4444",
            borderWidth: 2,
            borderColor: "#fff",
            shadowColor: "#DC2626",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: size * 0.12,
              fontWeight: "800",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            New
          </Text>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Personal record card
// ---------------------------------------------------------------------------
interface PersonalRecord {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  buddy: BuddyId;
}

const PersonalRecordCard: React.FC<{
  record: PersonalRecord;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}> = ({ record, isDark, theme }) => {
  const t = BUDDY_THEME[record.buddy];
  return (
    <View
      style={[
        styles.prCard,
        {
          backgroundColor: isDark ? theme.card : "#fff",
          borderColor: isDark ? theme.border : "#E8E8E5",
        },
      ]}
    >
      {/* Top gradient wash */}
      <LinearGradient
        colors={[t.g1 + "30", "transparent"]}
        style={styles.prCardWash}
      />
      <View style={{ alignItems: "center", zIndex: 1 }}>
        <BuddyBadge buddy={record.buddy} size={56} count={record.value} />
      </View>
      <View style={{ marginTop: 6, alignItems: "center", zIndex: 1 }}>
        <Text
          style={[styles.prLabel, { color: isDark ? theme.text : "#1A2A23" }]}
          numberOfLines={2}
        >
          {record.label}
        </Text>
        <Text
          style={[
            styles.prUnit,
            { color: isDark ? theme.textSecondary : "#6B7280" },
          ]}
        >
          {record.unit}
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Hero card
// ---------------------------------------------------------------------------
const HeroCard: React.FC<{
  categories: Category[];
  isDark: boolean;
}> = ({ categories, isDark }) => {
  // Find most recently unlocked (isNew first, then last earned)
  let hero: Award | null = null;
  let heroCat: Category | null = null;
  for (const c of categories) {
    const n = c.awards.find((a) => a.isNew);
    if (n) {
      hero = n;
      heroCat = c;
      break;
    }
  }
  if (!hero) {
    for (const c of categories) {
      const lastEarned = [...c.awards].reverse().find((a) => a.earned);
      if (lastEarned) {
        hero = lastEarned;
        heroCat = c;
        break;
      }
    }
  }
  if (!hero || !heroCat) return null;

  const t = BUDDY_THEME[heroCat.buddy];

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(500)}
      style={styles.heroWrapper}
    >
      <LinearGradient
        colors={[t.g1, t.g2, t.shadow]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Radial highlight overlay */}
        <View style={styles.heroHighlight} />

        <View style={styles.heroContent}>
          {/* Badge (slightly rotated) */}
          <View style={{ transform: [{ rotate: "-5deg" }] }}>
            <BuddyBadge
              buddy={heroCat.buddy}
              size={100}
              count={hero.count}
              isNew={hero.isNew}
            />
          </View>

          {/* Info */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroEyebrow}>
              {hero.isNew ? "JUST UNLOCKED" : "LATEST AWARD"}
            </Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {hero.name}
            </Text>
            <Text style={styles.heroSubtitle}>
              {heroCat.name} {"·"} {heroCat.blurb.toLowerCase()}
            </Text>

            <TouchableOpacity
              style={styles.heroShareButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.heroShareText, { color: t.accent }]}>
                Share
              </Text>
              <Ionicons name="share-outline" size={12} color={t.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Category "deck row" -- collapsed card stack or expanded badge row
// ---------------------------------------------------------------------------
const DeckRow: React.FC<{
  category: Category;
  index: number;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}> = ({ category, index, isDark, theme }) => {
  const [expanded, setExpanded] = useState(false);
  const t = BUDDY_THEME[category.buddy];
  const earnedCount = category.awards.filter((a) => a.earned).length;
  const totalCount = category.awards.length;
  const newest =
    category.awards.find((a) => a.isNew) ||
    [...category.awards].reverse().find((a) => a.earned) ||
    category.awards[0];
  const next = category.awards.find((a) => !a.earned);

  const cardBg = isDark ? theme.card : "#fff";
  const borderColor = isDark ? theme.border : "#E8E8E5";
  const forestColor = isDark ? theme.text : "#1A2A23";
  const fg2Color = isDark ? theme.textSecondary : "#6B7280";
  const sageBg = isDark ? theme.surface2 : "#F0F5F3";

  return (
    <StaggeredItem index={index} delay="fast">
      <View style={styles.deckSection}>
        {/* Section header */}
        <View style={styles.deckHeader}>
          {/* Buddy chip */}
          <LinearGradient colors={[t.g1, t.g2]} style={styles.deckBuddyChip}>
            <Image
              source={BUDDY_IMAGES[category.buddy]}
              style={styles.deckBuddyIcon}
              resizeMode="contain"
            />
          </LinearGradient>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.deckCategoryName, { color: forestColor }]}>
              {category.name}
            </Text>
            <Text style={[styles.deckCategoryBlurb, { color: fg2Color }]}>
              {category.blurb}
            </Text>
          </View>

          {/* Count pill */}
          <View
            style={[styles.deckCountPill, { backgroundColor: t.g1 + "40" }]}
          >
            <Text style={[styles.deckCountText, { color: t.accent }]}>
              {earnedCount}/{totalCount}
            </Text>
          </View>
        </View>

        {/* Tappable deck area */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(!expanded);
          }}
        >
          {!expanded ? (
            /* ===== STACKED VIEW ===== */
            <View style={styles.deckCollapsed}>
              {/* Left: card stack */}
              <View
                style={[
                  styles.deckStack,
                  { width: BADGE_SIZE + 30, height: BADGE_SIZE + 60 },
                ]}
              >
                {/* Back card */}
                {earnedCount >= 3 && (
                  <View
                    style={[
                      styles.stackCard,
                      styles.stackCardBack,
                      { backgroundColor: cardBg, borderColor },
                    ]}
                  />
                )}
                {/* Middle card */}
                {earnedCount >= 2 && (
                  <View
                    style={[
                      styles.stackCard,
                      styles.stackCardMiddle,
                      { backgroundColor: cardBg, borderColor },
                    ]}
                  />
                )}
                {/* Front card */}
                <View
                  style={[
                    styles.stackCard,
                    styles.stackCardFront,
                    {
                      backgroundColor: cardBg,
                      borderColor,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    },
                  ]}
                >
                  <View
                    style={{
                      alignItems: "center",
                      flex: 1,
                      justifyContent: "center",
                    }}
                  >
                    <BuddyBadge
                      buddy={category.buddy}
                      count={newest.count}
                      size={BADGE_SIZE - 16}
                      isNew={newest.isNew}
                      locked={!newest.earned}
                    />
                  </View>
                  <Text
                    style={[styles.stackLabel, { color: forestColor }]}
                    numberOfLines={1}
                  >
                    {newest.name}
                  </Text>
                </View>
              </View>

              {/* Right: info panel */}
              <View style={styles.deckInfo}>
                {/* Latest */}
                <View
                  style={[
                    styles.deckInfoCard,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  <Text style={[styles.deckInfoLabel, { color: fg2Color }]}>
                    LATEST
                  </Text>
                  <Text
                    style={[styles.deckInfoValue, { color: forestColor }]}
                    numberOfLines={1}
                  >
                    {newest.name}
                  </Text>
                </View>

                {/* Next */}
                {next && (
                  <View
                    style={[
                      styles.deckInfoCard,
                      styles.deckInfoCardDashed,
                      { backgroundColor: sageBg, borderColor: borderColor },
                    ]}
                  >
                    <Text style={[styles.deckInfoLabel, { color: fg2Color }]}>
                      NEXT
                    </Text>
                    <Text
                      style={[styles.deckInfoValue, { color: forestColor }]}
                      numberOfLines={1}
                    >
                      {next.name}
                    </Text>
                    <Text style={[styles.deckInfoHint, { color: fg2Color }]}>
                      {next.count}
                      {category.id === "focus" ? " hrs" : ""} to unlock
                    </Text>
                  </View>
                )}

                {/* Expand hint */}
                <View style={styles.deckExpandHint}>
                  <Text style={styles.deckExpandText}>Tap to expand</Text>
                  <Ionicons name="chevron-down" size={12} color="#4A9E8E" />
                </View>
              </View>
            </View>
          ) : (
            /* ===== EXPANDED VIEW ===== */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.deckExpanded}
            >
              {category.awards.map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.deckExpandedCard,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  <BuddyBadge
                    buddy={category.buddy}
                    count={a.count}
                    size={BADGE_SIZE - 20}
                    locked={!a.earned}
                    isNew={a.isNew}
                  />
                  <Text
                    style={[
                      styles.deckExpandedLabel,
                      { color: a.earned ? forestColor : "#9CA3AF" },
                    ]}
                    numberOfLines={2}
                  >
                    {a.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>
      </View>
    </StaggeredItem>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
const AchievementsScreen = () => {
  const navigation = useNavigation();
  const { achievements: earnedAchievements, loading } = useConvexAchievements();
  const { leaderboard: myStats, loading: statsLoading } =
    useConvexLeaderboard();
  const { theme, isDark } = useTheme();
  const focusKey = useFocusAnimationKey();

  const safeAchievements = earnedAchievements ?? [];

  // Merge real data into category defs
  const { categories, totalEarned, newCount } = useMemo(
    () => mergeAchievements(safeAchievements),
    [safeAchievements],
  );

  const earnedCounter = useCounterAnimation(totalEarned, 800);

  // Build personal records from leaderboard stats
  const personalRecords: PersonalRecord[] = useMemo(() => {
    if (!myStats) return [];
    const records: PersonalRecord[] = [];
    if (myStats.longest_streak) {
      records.push({
        id: "pr1",
        label: "Longest Streak",
        value: myStats.longest_streak,
        unit: "days",
        buddy: "fox",
      });
    }
    if (myStats.total_focus_time) {
      const hours = Math.round((myStats.total_focus_time / 60) * 10) / 10;
      records.push({
        id: "pr2",
        label: "Total Focus",
        value: hours,
        unit: "hours",
        buddy: "lion",
      });
    }
    if (myStats.total_sessions) {
      records.push({
        id: "pr3",
        label: "Total Sessions",
        value: myStats.total_sessions,
        unit: "sessions",
        buddy: "bear",
      });
    }
    if (myStats.current_streak) {
      records.push({
        id: "pr4",
        label: "Current Streak",
        value: myStats.current_streak,
        unit: "days",
        buddy: "deer",
      });
    }
    return records;
  }, [myStats]);

  const forestColor = isDark ? theme.text : "#1A2A23";
  const fg2Color = isDark ? theme.textSecondary : "#6B7280";

  // Loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Bonuses" as never)}
          >
            <View
              style={[
                styles.backButtonCircle,
                {
                  backgroundColor: isDark ? theme.text + "20" : "#fff",
                  borderColor: isDark ? "transparent" : "#E8E8E5",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={18} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Achievements
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContent}>
          <ShimmerLoader
            variant="card"
            height={140}
            style={{ marginBottom: 24, marginHorizontal: 16 }}
          />
          <ShimmerLoader
            variant="text"
            width={120}
            height={16}
            style={{ marginBottom: 16, marginHorizontal: 20 }}
          />
          <View style={styles.loadingGrid}>
            <ShimmerLoader
              variant="card"
              width={130}
              height={130}
              style={{ borderRadius: 18 }}
            />
            <ShimmerLoader
              variant="card"
              width={130}
              height={130}
              style={{ borderRadius: 18 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Bonuses" as never);
          }}
        >
          <View
            style={[
              styles.backButtonCircle,
              {
                backgroundColor: isDark ? theme.text + "20" : "#fff",
                borderColor: isDark ? "transparent" : "#E8E8E5",
                borderWidth: isDark ? 0 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Achievements
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER SUMMARY ===== */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.summarySection}
        >
          <Text style={[styles.summaryEyebrow, { color: "#4A9E8E" }]}>
            TRAIL JOURNAL
          </Text>
          <Animated.Text style={[styles.summaryTitle, { color: forestColor }]}>
            {Math.round(earnedCounter.value)} awards earned
          </Animated.Text>
          <Text style={[styles.summarySubtitle, { color: fg2Color }]}>
            {categories.length} categories
            {newCount > 0 && (
              <>
                {" "}
                {"·"}{" "}
                <Text style={{ color: forestColor, fontWeight: "700" }}>
                  {newCount} new
                </Text>{" "}
                this week
              </>
            )}
          </Text>
        </Animated.View>

        {/* ===== HERO CARD ===== */}
        {totalEarned > 0 && (
          <HeroCard categories={categories} isDark={isDark} />
        )}

        {/* ===== PERSONAL RECORDS ===== */}
        {personalRecords.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: forestColor }]}>
                Personal Records
              </Text>
              <Text style={[styles.sectionHint, { color: fg2Color }]}>
                {"·"} all-time
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prScroll}
            >
              {personalRecords.map((r) => (
                <PersonalRecordCard
                  key={r.id}
                  record={r}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ===== AWARDS SECTION ===== */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: forestColor }]}>
            Awards
          </Text>
          <Text style={[styles.sectionHint, { color: fg2Color }]}>
            {"·"} tap a stack to fan out
          </Text>
        </View>

        {/* Empty state */}
        {totalEarned === 0 && (
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: "#4A9E8E" + "10" },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={48}
                color={"#4A9E8E" + "40"}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: forestColor }]}>
              No awards yet
            </Text>
            <Text style={[styles.emptySubtext, { color: fg2Color }]}>
              Complete focus sessions, build streaks, and explore features to
              unlock your first award.
            </Text>
          </Animated.View>
        )}

        {/* Category deck rows */}
        {categories.map((c, i) => (
          <DeckRow
            key={c.id}
            category={c}
            index={i}
            isDark={isDark}
            theme={theme}
          />
        ))}

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
  },

  // Loading
  loadingContent: {
    paddingTop: 20,
  },
  loadingGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 24,
  },

  // Summary header
  summarySection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  // Hero
  heroWrapper: {
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
  },
  heroHighlight: {
    position: "absolute",
    top: "-30%",
    left: "-10%",
    width: "70%",
    height: "120%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 200,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroInfo: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#fff",
    opacity: 0.9,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 25,
    marginTop: 4,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 4,
    color: "#fff",
    opacity: 0.92,
    fontWeight: "500",
  },
  heroShareButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  heroShareText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12,
  },

  // Personal Records
  prScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  prCard: {
    width: 130,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1A2A23",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  prCardWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  prLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  prUnit: {
    fontSize: 10,
    marginTop: 2,
  },

  // Deck section
  deckSection: {
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  deckHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deckBuddyChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  deckBuddyIcon: {
    width: 26,
    height: 26,
  },
  deckCategoryName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  deckCategoryBlurb: {
    fontSize: 11,
    marginTop: 1,
  },
  deckCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deckCountText: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.3,
  },

  // Deck collapsed
  deckCollapsed: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  deckStack: {
    position: "relative",
    flexShrink: 0,
  },
  stackCard: {
    position: "absolute",
    borderRadius: 20,
    borderWidth: 1,
  },
  stackCardBack: {
    top: 16,
    left: 14,
    right: 14,
    bottom: 12,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#1A2A23",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  stackCardMiddle: {
    top: 8,
    left: 6,
    right: 6,
    bottom: 16,
    transform: [{ rotate: "2deg" }],
    shadowColor: "#1A2A23",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  stackCardFront: {
    padding: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#1A2A23",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  stackLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.1,
    marginTop: 4,
  },

  // Deck info panel
  deckInfo: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  deckInfoCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  deckInfoCardDashed: {
    borderStyle: "dashed",
  },
  deckInfoLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  deckInfoValue: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  deckInfoHint: {
    fontSize: 11,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  deckExpandHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: "auto",
  },
  deckExpandText: {
    fontSize: 11,
    color: "#4A9E8E",
    fontWeight: "700",
  },

  // Deck expanded
  deckExpanded: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  deckExpandedCard: {
    width: BADGE_SIZE - 4,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    gap: 4,
    shadowColor: "#1A2A23",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  deckExpandedLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 12,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default AchievementsScreen;
