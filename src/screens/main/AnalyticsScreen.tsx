import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
const { useUserAppData } = require("../../utils/userAppData");
import { BottomTabBar } from "../../components/BottomTabBar";
import { AnimatedCircularChart } from "../../components/CircularChart";
import { UnifiedHeader } from "../../components/UnifiedHeader";
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";

// Session type colors for stacked charts
const SESSION_TYPE_COLORS = {
  deepWork: "#9C27B0", // Purple
  balanced: "#FF9800", // Orange
  sprint: "#2196F3", // Blue
};
import {
  useCounterAnimation,
  useProgressAnimation,
  triggerHaptic,
  useFocusAnimationKey,
} from "../../utils/animationUtils";
import {
  ShimmerLoader,
  SkeletonStatsGrid,
} from "../../components/premium/ShimmerLoader";
import {
  StaggeredList,
  StaggeredItem,
} from "../../components/premium/StaggeredList";
import {
  Typography,
  Spacing,
  AnimationConfig,
  TimingConfig,
} from "../../theme/premiumTheme";
import { navigateHomeWithSlide } from "../../navigation/navHelpers";

const { width } = Dimensions.get("window");

// Animated Bar Column Component - extracted to properly use hooks
interface AnimatedBarColumnProps {
  height: number;
  maxHeight: number;
  index: number;
  label: string;
  theme: any;
  timeRange: string;
  animationProgress: SharedValue<number>;
}

const AnimatedBarColumn: React.FC<AnimatedBarColumnProps> = ({
  height,
  maxHeight,
  index,
  label,
  theme,
  timeRange,
  animationProgress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const percentage = maxHeight > 0 ? (height / maxHeight) * 100 : 0;
    return {
      height: `${percentage * animationProgress.value}%`,
    };
  });

  return (
    <Animated.View
      entering={FadeIn.delay(index * 30).duration(300)}
      style={styles.barColumn}
    >
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: theme.primary },
            animatedStyle,
          ]}
        />
      </View>
      <Text
        style={[
          styles.barLabel,
          { color: theme.primary, fontSize: timeRange === "day" ? 7 : 9 },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
};

// Stacked Bar Column for Week View
interface StackedBarColumnProps {
  data: { deepWork: number; balanced: number; sprint: number; total: number };
  maxHeight: number;
  index: number;
  label: string;
  theme: any;
  animationProgress: SharedValue<number>;
}

const StackedBarColumn: React.FC<StackedBarColumnProps> = ({
  data,
  maxHeight,
  index,
  label,
  theme,
  animationProgress,
}) => {
  const deepWorkPercent = maxHeight > 0 ? (data.deepWork / maxHeight) * 100 : 0;
  const balancedPercent = maxHeight > 0 ? (data.balanced / maxHeight) * 100 : 0;
  const sprintPercent = maxHeight > 0 ? (data.sprint / maxHeight) * 100 : 0;

  const deepWorkStyle = useAnimatedStyle(() => ({
    height: `${deepWorkPercent * animationProgress.value}%`,
  }));

  const balancedStyle = useAnimatedStyle(() => ({
    height: `${balancedPercent * animationProgress.value}%`,
  }));

  const sprintStyle = useAnimatedStyle(() => ({
    height: `${sprintPercent * animationProgress.value}%`,
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      style={styles.barColumn}
    >
      <View style={styles.barWrapper}>
        <View style={styles.stackedBarContainer}>
          <Animated.View
            style={[
              styles.stackedBarSegment,
              { backgroundColor: SESSION_TYPE_COLORS.deepWork },
              deepWorkStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.stackedBarSegment,
              { backgroundColor: SESSION_TYPE_COLORS.balanced },
              balancedStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.stackedBarSegment,
              { backgroundColor: SESSION_TYPE_COLORS.sprint },
              sprintStyle,
            ]}
          />
        </View>
      </View>
      <Text style={[styles.barLabel, { color: theme.primary, fontSize: 9 }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

// Heat Map Component for Month View
interface HeatMapProps {
  data: { day: number; minutes: number; intensity: number }[];
  firstDayOfMonth: number;
  daysInMonth: number;
  theme: any;
}

const HeatMapChart: React.FC<HeatMapProps> = ({
  data,
  firstDayOfMonth,
  daysInMonth,
  theme,
}) => {
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  // Heat map colors (0 = no data, 1-4 = increasing intensity)
  const getHeatColor = (intensity: number) => {
    const colors = [
      theme.text + "15", // 0 - no activity
      "#4CAF5040", // 1 - light
      "#4CAF5080", // 2 - medium
      "#4CAF50B0", // 3 - high
      "#4CAF50", // 4 - max
    ];
    return colors[Math.min(intensity, 4)];
  };

  // Create grid with empty cells for alignment
  const gridCells: ((typeof data)[0] | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(null); // Empty cells before first day
  }
  data.forEach((d) => gridCells.push(d));

  // Fill to complete last week
  const remainder = gridCells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      gridCells.push(null);
    }
  }

  // Split into weeks (rows)
  const weeks: (typeof gridCells)[] = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  return (
    <View style={styles.heatMapContainer}>
      {/* Header row with day labels */}
      <View style={styles.heatMapRow}>
        {weekDays.map((day, index) => (
          <View key={`header-${index}`} style={styles.heatMapHeaderCell}>
            <Text
              style={[styles.heatMapHeaderText, { color: theme.textSecondary }]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Heat map grid */}
      {weeks.map((week, weekIndex) => (
        <Animated.View
          key={`week-${weekIndex}`}
          entering={FadeIn.delay(weekIndex * 100).duration(300)}
          style={styles.heatMapRow}
        >
          {week.map((cell, dayIndex) => (
            <View
              key={`cell-${weekIndex}-${dayIndex}`}
              style={[
                styles.heatMapCell,
                {
                  backgroundColor: cell
                    ? getHeatColor(cell.intensity)
                    : "transparent",
                },
              ]}
            >
              {cell && (
                <Text
                  style={[
                    styles.heatMapDayText,
                    { color: cell.intensity >= 3 ? "#fff" : theme.text },
                  ]}
                >
                  {cell.day}
                </Text>
              )}
            </View>
          ))}
        </Animated.View>
      ))}

      {/* Legend */}
      <View style={styles.heatMapLegend}>
        <Text
          style={[styles.heatMapLegendLabel, { color: theme.textSecondary }]}
        >
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={`legend-${i}`}
            style={[
              styles.heatMapLegendCell,
              { backgroundColor: getHeatColor(i) },
            ]}
          />
        ))}
        <Text
          style={[styles.heatMapLegendLabel, { color: theme.textSecondary }]}
        >
          More
        </Text>
      </View>
    </View>
  );
};

// Stacked Area Chart Component for Year View
interface StackedAreaChartProps {
  data: { deepWork: number; balanced: number; sprint: number; total: number }[];
  labels: string[];
  theme: any;
  maxHeight: number;
}

const StackedAreaChart: React.FC<StackedAreaChartProps> = ({
  data,
  labels,
  theme,
  maxHeight,
}) => {
  const chartWidth = width - 80;
  const chartHeight = 140;
  const padding = 10;

  if (data.length === 0 || maxHeight === 0) {
    return (
      <View style={[styles.areaChartContainer, { height: chartHeight }]}>
        <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
          No data available
        </Text>
      </View>
    );
  }

  const pointSpacing = (chartWidth - padding * 2) / (data.length - 1);

  // Create paths for each layer (stacked from bottom)
  const createAreaPath = (
    getData: (d: (typeof data)[0]) => number,
    baseGetData?: (d: (typeof data)[0]) => number,
  ) => {
    let path = "";
    const baseY = chartHeight - padding;

    // Top line (left to right)
    data.forEach((d, i) => {
      const x = padding + i * pointSpacing;
      const value = getData(d);
      const baseValue = baseGetData ? baseGetData(d) : 0;
      const y =
        baseY - ((value + baseValue) / maxHeight) * (chartHeight - padding * 2);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    // Bottom line (right to left) to close the area
    for (let i = data.length - 1; i >= 0; i--) {
      const x = padding + i * pointSpacing;
      const baseValue = baseGetData ? baseGetData(data[i]) : 0;
      const y = baseY - (baseValue / maxHeight) * (chartHeight - padding * 2);
      path += ` L ${x} ${y}`;
    }

    path += " Z";
    return path;
  };

  const sprintPath = createAreaPath(
    (d) => d.sprint,
    (d) => d.deepWork + d.balanced,
  );
  const balancedPath = createAreaPath(
    (d) => d.balanced,
    (d) => d.deepWork,
  );
  const deepWorkPath = createAreaPath((d) => d.deepWork);

  return (
    <View style={styles.areaChartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="deepWorkGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={SESSION_TYPE_COLORS.deepWork}
              stopOpacity="0.8"
            />
            <Stop
              offset="100%"
              stopColor={SESSION_TYPE_COLORS.deepWork}
              stopOpacity="0.3"
            />
          </LinearGradient>
          <LinearGradient id="balancedGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={SESSION_TYPE_COLORS.balanced}
              stopOpacity="0.8"
            />
            <Stop
              offset="100%"
              stopColor={SESSION_TYPE_COLORS.balanced}
              stopOpacity="0.3"
            />
          </LinearGradient>
          <LinearGradient id="sprintGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={SESSION_TYPE_COLORS.sprint}
              stopOpacity="0.8"
            />
            <Stop
              offset="100%"
              stopColor={SESSION_TYPE_COLORS.sprint}
              stopOpacity="0.3"
            />
          </LinearGradient>
        </Defs>
        <Path d={deepWorkPath} fill="url(#deepWorkGrad)" />
        <Path d={balancedPath} fill="url(#balancedGrad)" />
        <Path d={sprintPath} fill="url(#sprintGrad)" />
      </Svg>

      {/* X-axis labels */}
      <View style={styles.areaChartLabels}>
        {labels.map((label, index) => (
          <Text
            key={index}
            style={[styles.areaChartLabel, { color: theme.primary }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

// Session Type Legend Component
const SessionTypeLegend: React.FC<{ theme: any }> = ({ theme }) => (
  <View style={styles.sessionTypeLegend}>
    <View style={styles.legendItemRow}>
      <View
        style={[
          styles.legendDotSmall,
          { backgroundColor: SESSION_TYPE_COLORS.deepWork },
        ]}
      />
      <Text style={[styles.legendTextSmall, { color: theme.textSecondary }]}>
        Deep Work
      </Text>
    </View>
    <View style={styles.legendItemRow}>
      <View
        style={[
          styles.legendDotSmall,
          { backgroundColor: SESSION_TYPE_COLORS.balanced },
        ]}
      />
      <Text style={[styles.legendTextSmall, { color: theme.textSecondary }]}>
        Balanced
      </Text>
    </View>
    <View style={styles.legendItemRow}>
      <View
        style={[
          styles.legendDotSmall,
          { backgroundColor: SESSION_TYPE_COLORS.sprint },
        ]}
      />
      <Text style={[styles.legendTextSmall, { color: theme.textSecondary }]}>
        Sprint
      </Text>
    </View>
  </View>
);

const AnalyticsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: userData, isLoading } = useUserAppData();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // Calculate real stats from user data
  const { leaderboard } = useAuth();
  const allSessions = userData?.sessions ?? [];
  // Only count completed sessions for analytics
  const sessions = allSessions.filter(
    (s: any) => s.status === "completed" || !s.status,
  );
  const totalSessions = leaderboard?.total_sessions ?? sessions.length ?? 0;
  const totalMinutes = leaderboard?.total_focus_time ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Count session types: Deep Work, Balanced, Sprint (only completed sessions)
  // Note: Convex uses 'sessionType' while legacy data may use 'session_type'
  const deepWorkCount =
    sessions.filter(
      (s: any) =>
        s.sessionType === "deep_work" ||
        s.sessionType === "individual" ||
        s.session_type === "deep_work" ||
        s.session_type === "individual",
    ).length ?? 0;
  const balancedCount =
    sessions.filter(
      (s: any) => s.sessionType === "balanced" || s.session_type === "balanced",
    ).length ?? 0;
  const sprintCount =
    sessions.filter(
      (s: any) => s.sessionType === "sprint" || s.session_type === "sprint",
    ).length ?? 0;

  // Helper function to get session duration in minutes
  const getSessionDuration = (session: any): number => {
    // Handle different duration field names from database (Convex uses durationSeconds)
    if (session.durationSeconds) return session.durationSeconds / 60;
    if (session.duration_minutes) return session.duration_minutes;
    if (session.duration) return session.duration; // Already in minutes
    if (session.duration_seconds) return session.duration_seconds / 60;
    return 0;
  };

  // Helper function to get session date (Convex uses startTime)
  const getSessionDate = (session: any): Date | null => {
    const dateStr =
      session.startTime || session.created_at || session.start_time;
    if (!dateStr) return null;
    return new Date(dateStr);
  };

  // Calculate time spent per subject
  const subjectBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};

    sessions.forEach((session: any) => {
      const subject =
        session.subject || session.task_worked_on || "General Study";
      const duration = getSessionDuration(session);

      if (!breakdown[subject]) {
        breakdown[subject] = 0;
      }
      breakdown[subject] += duration;
    });

    // Convert to array and sort by duration
    return Object.entries(breakdown)
      .map(([subject, minutes]) => ({
        subject,
        minutes: minutes as number,
        hours: Math.floor((minutes as number) / 60),
        remainingMinutes: Math.floor((minutes as number) % 60),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  // Colors for different subjects
  const subjectColors = [
    "#FF6B35",
    "#4ECDC4",
    "#F7B801",
    "#95E1D3",
    "#9B59B6",
    "#E74C3C",
    "#3498DB",
    "#2ECC71",
  ];

  // Generate dynamic insights based on user data
  const dynamicInsights = useMemo(() => {
    const insights: { icon: string; text: string; iconColor?: string }[] = [];
    const now = new Date();
    const currentStreak =
      leaderboard?.current_streak ?? leaderboard?.currentStreak ?? 0;
    const longestStreak =
      leaderboard?.longest_streak ?? leaderboard?.longestStreak ?? 0;

    // Basic stats insight
    if (totalSessions > 0) {
      insights.push({
        icon: "bulb",
        text: `You've completed ${totalSessions} sessions totaling ${totalHours}h ${remainingMinutes}m of focus time.`,
      });
    } else {
      insights.push({
        icon: "bulb",
        text: "Start your first study session to see insights here!",
      });
    }

    // Streak insight
    if (currentStreak > 0) {
      if (currentStreak === longestStreak && currentStreak > 1) {
        insights.push({
          icon: "flame",
          text: `🔥 You're on your longest streak ever: ${currentStreak} days! Keep it going!`,
          iconColor: "#FF5722",
        });
      } else if (currentStreak >= 7) {
        insights.push({
          icon: "flame",
          text: `Amazing! You've maintained a ${currentStreak}-day streak. Your consistency is paying off!`,
          iconColor: "#FF5722",
        });
      } else if (currentStreak >= 3) {
        insights.push({
          icon: "flame",
          text: `Nice ${currentStreak}-day streak! Studies show it takes 21 days to form a habit.`,
          iconColor: "#FF5722",
        });
      }
    }

    // Session type dominance insight
    if (deepWorkCount > 0 || balancedCount > 0 || sprintCount > 0) {
      const totalTyped = deepWorkCount + balancedCount + sprintCount;
      if (deepWorkCount > balancedCount && deepWorkCount > sprintCount) {
        const percent = Math.round((deepWorkCount / totalTyped) * 100);
        insights.push({
          icon: "bulb-outline",
          text: `Deep Work is your preferred method (${percent}% of sessions). Great for complex tasks!`,
          iconColor: "#9C27B0",
        });
      } else if (balancedCount > sprintCount) {
        const percent = Math.round((balancedCount / totalTyped) * 100);
        insights.push({
          icon: "fitness-outline",
          text: `Balanced Focus leads at ${percent}%. A versatile approach for varied work!`,
          iconColor: "#FF9800",
        });
      } else if (sprintCount > 0) {
        const percent = Math.round((sprintCount / totalTyped) * 100);
        insights.push({
          icon: "flash-outline",
          text: `Sprint Focus is your go-to (${percent}%). Quick bursts keep you energized!`,
          iconColor: "#2196F3",
        });
      }
    }

    // Best time of day insight
    const hourlyData: number[] = Array(24).fill(0);
    sessions.forEach((s: any) => {
      const sessionDate = getSessionDate(s);
      if (sessionDate) {
        const hour = sessionDate.getHours();
        hourlyData[hour] += getSessionDuration(s);
      }
    });
    const maxHour = hourlyData.indexOf(Math.max(...hourlyData));
    if (Math.max(...hourlyData) > 0) {
      const timeLabel =
        maxHour < 12
          ? `${maxHour || 12}AM`
          : `${maxHour === 12 ? 12 : maxHour - 12}PM`;
      const period =
        maxHour < 6
          ? "early morning"
          : maxHour < 12
            ? "morning"
            : maxHour < 17
              ? "afternoon"
              : maxHour < 21
                ? "evening"
                : "night";
      insights.push({
        icon: "time-outline",
        text: `Your peak productivity is around ${timeLabel}. You're most focused in the ${period}!`,
        iconColor: "#00BCD4",
      });
    }

    // Weekly comparison insight
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekMinutes = sessions.reduce((sum: number, s: any) => {
      const sessionDate = getSessionDate(s);
      if (sessionDate && sessionDate >= thisWeekStart) {
        return sum + getSessionDuration(s);
      }
      return sum;
    }, 0);

    const lastWeekMinutes = sessions.reduce((sum: number, s: any) => {
      const sessionDate = getSessionDate(s);
      if (
        sessionDate &&
        sessionDate >= lastWeekStart &&
        sessionDate < thisWeekStart
      ) {
        return sum + getSessionDuration(s);
      }
      return sum;
    }, 0);

    if (lastWeekMinutes > 0 && thisWeekMinutes > 0) {
      const change = Math.round(
        ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100,
      );
      if (change > 10) {
        insights.push({
          icon: "trending-up",
          text: `You're up ${change}% this week compared to last week! Great momentum!`,
          iconColor: "#4CAF50",
        });
      } else if (change < -10) {
        insights.push({
          icon: "trending-down",
          text: `Focus time is down ${Math.abs(change)}% this week. Time to get back on track!`,
          iconColor: "#FF5722",
        });
      }
    }

    // Subject diversity insight
    if (subjectBreakdown.length > 3) {
      insights.push({
        icon: "layers-outline",
        text: `You've studied ${subjectBreakdown.length} different subjects. Diverse learning strengthens neural connections!`,
        iconColor: "#9C27B0",
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  }, [
    sessions,
    totalSessions,
    totalHours,
    remainingMinutes,
    leaderboard,
    deepWorkCount,
    balancedCount,
    sprintCount,
    subjectBreakdown,
  ]);

  // Generate chart data based on time range
  const getChartData = () => {
    if (timeRange === "year") {
      return [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
    } else if (timeRange === "month") {
      // Only show odd numbered days to avoid cramping
      return Array.from({ length: 31 }, (_, i) => i + 1)
        .filter((day) => day % 2 === 1)
        .map((day) => day.toString());
    } else if (timeRange === "week") {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    } else {
      // Day view - even hours only (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
      // 0 represents midnight (24:00 / 00:00 in 24-hour format)
      return [
        "0",
        "2",
        "4",
        "6",
        "8",
        "10",
        "12",
        "14",
        "16",
        "18",
        "20",
        "22",
      ];
    }
  };

  // Calculate actual bar heights from user session data
  const getBarHeights = () => {
    const now = currentDate;
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    if (timeRange === "year") {
      // Calculate hours per month for the current year
      return Array.from({ length: 12 }, (_, monthIndex) => {
        const monthSessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          return (
            sessionDate.getFullYear() === year &&
            sessionDate.getMonth() === monthIndex
          );
        });
        return (
          monthSessions.reduce(
            (sum: number, s: any) => sum + getSessionDuration(s),
            0,
          ) / 60
        );
      });
    } else if (timeRange === "month") {
      // Calculate hours per day for current month (only odd days)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: 31 }, (_, dayIndex) => {
        const day = dayIndex + 1;
        if (day % 2 === 0 || day > daysInMonth) return 0; // Skip even days and invalid days

        const daySessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          return (
            sessionDate.getFullYear() === year &&
            sessionDate.getMonth() === month &&
            sessionDate.getDate() === day
          );
        });
        return (
          daySessions.reduce(
            (sum: number, s: any) => sum + getSessionDuration(s),
            0,
          ) / 60
        );
      }).filter((_, i) => (i + 1) % 2 === 1); // Only keep odd indexed items
    } else if (timeRange === "week") {
      // Calculate hours per day for current week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      return Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + dayIndex);

        const daySessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          return sessionDate.toDateString() === day.toDateString();
        });
        return (
          daySessions.reduce(
            (sum: number, s: any) => sum + getSessionDuration(s),
            0,
          ) / 60
        );
      });
    } else {
      // Day view - minutes per 2-hour block (12 blocks: 0-1, 2-3, 4-5, etc.)
      return Array.from({ length: 12 }, (_, blockIndex) => {
        const startHour = blockIndex * 2;
        const endHour = startHour + 2;

        const daySessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          const sessionHour = sessionDate.getHours();
          return (
            sessionDate.toDateString() === now.toDateString() &&
            sessionHour >= startHour &&
            sessionHour < endHour
          );
        });

        // Return minutes (not hours) for day view
        return daySessions.reduce(
          (sum: number, s: any) => sum + getSessionDuration(s),
          0,
        );
      });
    }
  };

  const chartLabels = getChartData();
  const barHeights = getBarHeights();
  const maxHeight = Math.max(...barHeights, 1);

  // Calculate stacked data by session type for Week and Year views
  const getStackedData = () => {
    const now = currentDate;
    const year = now.getFullYear();

    if (timeRange === "week") {
      // Get start of week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      return Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + dayIndex);

        const daySessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          return sessionDate.toDateString() === day.toDateString();
        });

        const deepWork =
          daySessions
            .filter(
              (s: any) =>
                s.sessionType === "deep_work" ||
                s.sessionType === "individual" ||
                s.session_type === "deep_work" ||
                s.session_type === "individual",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;
        const balanced =
          daySessions
            .filter(
              (s: any) =>
                s.sessionType === "balanced" || s.session_type === "balanced",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;
        const sprint =
          daySessions
            .filter(
              (s: any) =>
                s.sessionType === "sprint" || s.session_type === "sprint",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;

        return {
          deepWork,
          balanced,
          sprint,
          total: deepWork + balanced + sprint,
        };
      });
    } else if (timeRange === "year") {
      return Array.from({ length: 12 }, (_, monthIndex) => {
        const monthSessions = sessions.filter((s: any) => {
          const sessionDate = getSessionDate(s);
          if (!sessionDate) return false;
          return (
            sessionDate.getFullYear() === year &&
            sessionDate.getMonth() === monthIndex
          );
        });

        const deepWork =
          monthSessions
            .filter(
              (s: any) =>
                s.sessionType === "deep_work" ||
                s.sessionType === "individual" ||
                s.session_type === "deep_work" ||
                s.session_type === "individual",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;
        const balanced =
          monthSessions
            .filter(
              (s: any) =>
                s.sessionType === "balanced" || s.session_type === "balanced",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;
        const sprint =
          monthSessions
            .filter(
              (s: any) =>
                s.sessionType === "sprint" || s.session_type === "sprint",
            )
            .reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) /
          60;

        return {
          deepWork,
          balanced,
          sprint,
          total: deepWork + balanced + sprint,
        };
      });
    }

    return [];
  };

  // Calculate heat map data for Month view
  const getHeatMapData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const heatMapData: { day: number; minutes: number; intensity: number }[] =
      [];
    let maxMinutes = 0;

    // Calculate minutes for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const daySessions = sessions.filter((s: any) => {
        const sessionDate = getSessionDate(s);
        if (!sessionDate) return false;
        return (
          sessionDate.getFullYear() === year &&
          sessionDate.getMonth() === month &&
          sessionDate.getDate() === day
        );
      });
      const minutes = daySessions.reduce(
        (sum: number, s: any) => sum + getSessionDuration(s),
        0,
      );
      maxMinutes = Math.max(maxMinutes, minutes);
      heatMapData.push({ day, minutes, intensity: 0 });
    }

    // Calculate intensity (0-4 scale)
    heatMapData.forEach((item) => {
      if (maxMinutes > 0) {
        item.intensity = Math.ceil((item.minutes / maxMinutes) * 4);
      }
    });

    return { data: heatMapData, firstDayOfMonth, daysInMonth };
  };

  const stackedData = getStackedData();
  const stackedMaxHeight = Math.max(...stackedData.map((d) => d.total), 1);
  const heatMapInfo = timeRange === "month" ? getHeatMapData() : null;

  // Animated stats counters
  const deepWorkCounter = useCounterAnimation(deepWorkCount, 1000);
  const balancedCounter = useCounterAnimation(balancedCount, 1000);
  const sprintCounter = useCounterAnimation(sprintCount, 1000);
  const totalSessionsCounter = useCounterAnimation(totalSessions, 1200);

  // Bar animation - single shared value for all bars
  const barAnimationProgress = useSharedValue(0);

  // Trigger bar animation when data changes
  useEffect(() => {
    barAnimationProgress.value = 0;
    barAnimationProgress.value = withDelay(
      200,
      withSpring(1, AnimationConfig.gentle),
    );
  }, [timeRange, currentDate, barHeights.length]);

  // Format date display
  const getDateDisplay = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleDateString("en-US", { month: "long" });
    const monthNum = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    if (timeRange === "year") {
      return year.toString();
    } else if (timeRange === "month") {
      return `${month}, ${year}`;
    } else if (timeRange === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${year}.${String(monthNum).padStart(2, "0")}.${String(startOfWeek.getDate()).padStart(2, "0")} - ${year}.${String(monthNum).padStart(2, "0")}.${String(endOfWeek.getDate()).padStart(2, "0")}`;
    } else {
      return `${year}.${String(monthNum).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
    }
  };

  // Navigate date
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    if (timeRange === "year") {
      newDate.setFullYear(
        newDate.getFullYear() + (direction === "next" ? 1 : -1),
      );
    } else if (timeRange === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (timeRange === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  // Animated Stat Card Component with subtle bounce effect
  const AnimatedStatCard = ({
    icon,
    iconColor,
    value,
    label,
    index,
  }: {
    icon: string;
    iconColor: string;
    value: SharedValue<number>;
    label: string;
    index: number;
  }) => {
    // Subtle bounce animation on mount
    const bounceScale = useSharedValue(0.95);

    useEffect(() => {
      // Reset and trigger subtle bounce animation with staggered delay
      bounceScale.value = 0.95;
      bounceScale.value = withDelay(
        200 + index * 100, // Staggered delay
        withSequence(
          withSpring(1.03, { damping: 12, stiffness: 180 }), // Slight overshoot
          withSpring(1, { damping: 14, stiffness: 200 }), // Settle smoothly
        ),
      );
    }, [focusKey]); // Re-trigger on screen focus

    const bounceStyle = useAnimatedStyle(() => ({
      transform: [{ scale: bounceScale.value }],
    }));

    const animatedTextProps = useAnimatedStyle(() => ({
      opacity: withDelay(index * 100, withTiming(1, { duration: 300 })),
    }));

    return (
      <Animated.View
        style={[
          styles.smallStatCard,
          { backgroundColor: theme.card },
          bounceStyle,
        ]}
      >
        <View style={styles.smallStatIcon}>
          <Ionicons name={icon as any} size={28} color={iconColor} />
        </View>
        <Animated.Text
          style={[
            styles.smallStatNumber,
            { color: theme.text },
            animatedTextProps,
          ]}
        >
          {Math.round(value.value)}
        </Animated.Text>
        <Text style={[styles.smallStatLabel, { color: theme.primary }]}>
          {label}
        </Text>
      </Animated.View>
    );
  };

  // Loading state with shimmer
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <UnifiedHeader
          title="Analytics"
          onClose={() => navigateHomeWithSlide(navigation)}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        >
          <View style={{ marginTop: 20 }}>
            <SkeletonStatsGrid columns={3} />
          </View>
          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <ShimmerLoader variant="card" height={200} />
          </View>
          <View style={{ marginBottom: 16 }}>
            <ShimmerLoader variant="card" height={300} />
          </View>
        </ScrollView>
        <BottomTabBar currentRoute="Results" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Unified Header */}
      <UnifiedHeader
        title="Analytics"
        onClose={() => navigateHomeWithSlide(navigation)}
      />

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Time Range Selector */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).duration(400)}
          style={styles.timeRangeContainer}
        >
          {["Day", "Week", "Month", "Year"].map((range, index) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range.toLowerCase() && [
                  styles.timeRangeButtonActive,
                  { backgroundColor: "transparent" },
                ],
              ]}
              onPress={() => {
                triggerHaptic("selection");
                setTimeRange(range.toLowerCase());
              }}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  {
                    color:
                      timeRange === range.toLowerCase()
                        ? theme.primary
                        : theme.text + "66",
                  },
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Date Display */}
        <Animated.View
          entering={FadeIn.delay(200).duration(400)}
          style={styles.dateContainer}
        >
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("buttonPress");
              navigateDate("prev");
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: theme.primary }]}>
            {getDateDisplay()}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("buttonPress");
              navigateDate("next");
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Cards Row - Session Types */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.statsRow}
        >
          <AnimatedStatCard
            icon="bulb"
            iconColor="#9C27B0"
            value={deepWorkCounter.sharedValue}
            label="Deep Work"
            index={0}
          />
          <AnimatedStatCard
            icon="fitness"
            iconColor="#FF9800"
            value={balancedCounter.sharedValue}
            label="Balanced"
            index={1}
          />
          <AnimatedStatCard
            icon="flash"
            iconColor="#2196F3"
            value={sprintCounter.sharedValue}
            label="Sprint"
            index={2}
          />
        </Animated.View>

        {/* Chart - Different types based on time range */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={[styles.chartContainer, { backgroundColor: theme.card }]}
        >
          {/* Day View - Bar Chart */}
          {timeRange === "day" && (
            <>
              <View style={styles.yAxisContainer}>
                <Text style={[styles.axisLabel, { color: theme.text + "88" }]}>
                  Minutes
                </Text>
              </View>
              <View style={styles.chartWithAxis}>
                <View style={styles.yAxisScale}>
                  {[60, 45, 30, 15, 0].map((minute) => (
                    <Text
                      key={minute}
                      style={[
                        styles.yAxisScaleText,
                        { color: theme.text + "66" },
                      ]}
                    >
                      {minute}
                    </Text>
                  ))}
                </View>
                <View style={styles.chartBars}>
                  {barHeights.map((height, index) => (
                    <AnimatedBarColumn
                      key={index}
                      height={height}
                      maxHeight={maxHeight}
                      index={index}
                      label={chartLabels[index]}
                      theme={theme}
                      timeRange={timeRange}
                      animationProgress={barAnimationProgress}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.xAxisLabel, { color: theme.text + "88" }]}>
                Hours of Day
              </Text>
            </>
          )}

          {/* Week View - Stacked Bar Chart */}
          {timeRange === "week" && (
            <>
              <View style={styles.yAxisContainer}>
                <Text style={[styles.axisLabel, { color: theme.text + "88" }]}>
                  Hours
                </Text>
              </View>
              <View style={styles.chartBars}>
                {stackedData.map((data, index) => (
                  <StackedBarColumn
                    key={index}
                    data={data}
                    maxHeight={stackedMaxHeight}
                    index={index}
                    label={chartLabels[index]}
                    theme={theme}
                    animationProgress={barAnimationProgress}
                  />
                ))}
              </View>
              <Text style={[styles.xAxisLabel, { color: theme.text + "88" }]}>
                Days of Week
              </Text>
              <SessionTypeLegend theme={theme} />
            </>
          )}

          {/* Month View - Heat Map */}
          {timeRange === "month" && heatMapInfo && (
            <>
              <Text
                style={[styles.chartSubtitle, { color: theme.textSecondary }]}
              >
                Focus Activity
              </Text>
              <HeatMapChart
                data={heatMapInfo.data}
                firstDayOfMonth={heatMapInfo.firstDayOfMonth}
                daysInMonth={heatMapInfo.daysInMonth}
                theme={theme}
              />
            </>
          )}

          {/* Year View - Stacked Area Chart */}
          {timeRange === "year" && (
            <>
              <View style={styles.yAxisContainer}>
                <Text style={[styles.axisLabel, { color: theme.text + "88" }]}>
                  Hours
                </Text>
              </View>
              <StackedAreaChart
                data={stackedData}
                labels={chartLabels}
                theme={theme}
                maxHeight={stackedMaxHeight}
              />
              <Text style={[styles.xAxisLabel, { color: theme.text + "88" }]}>
                Months
              </Text>
              <SessionTypeLegend theme={theme} />
            </>
          )}

          <Text style={[styles.chartTotal, { color: theme.primary }]}>
            Total: {totalHours}h {remainingMinutes}m
          </Text>
        </Animated.View>

        {/* Subject Distribution - Animated Circular Chart */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={[
            styles.circularChartContainer,
            { backgroundColor: theme.card },
          ]}
        >
          <Text style={[styles.chartSectionTitle, { color: theme.text }]}>
            Time by Subject
          </Text>
          {subjectBreakdown.length > 0 ? (
            <>
              <AnimatedCircularChart
                key={focusKey} // Re-animate on focus
                segments={subjectBreakdown.map((item, index) => ({
                  subject: item.subject,
                  percentage:
                    totalMinutes > 0 ? (item.minutes / totalMinutes) * 100 : 0,
                  color: subjectColors[index % subjectColors.length],
                }))}
                totalHours={totalHours}
                totalMinutes={remainingMinutes}
                size={180}
                strokeWidth={18}
              />
              <StaggeredList delay="fast" style={styles.legendContainer}>
                {subjectBreakdown.map((item, index) => (
                  <View key={item.subject} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            subjectColors[index % subjectColors.length],
                        },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.subject}
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.text }]}>
                      {item.hours}h {item.remainingMinutes}m
                    </Text>
                  </View>
                ))}
              </StaggeredList>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No session data available
            </Text>
          )}
        </Animated.View>

        {/* Insights Section */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={[styles.insightsContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.insightsTitle, { color: theme.text }]}>
            Insights
          </Text>
          <StaggeredList delay="fast">
            {dynamicInsights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Ionicons
                  name={insight.icon as any}
                  size={20}
                  color={insight.iconColor || theme.primary}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.insightText, { color: theme.text }]}>
                  {insight.text}
                </Text>
              </View>
            ))}
          </StaggeredList>
        </Animated.View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Results" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navHeaderTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },
  timeRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    paddingVertical: 12,
    marginTop: 8,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeRangeButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#4CAF50",
  },
  timeRangeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 16, // Increased gap between cards
    marginBottom: 16,
  },
  smallStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(76, 175, 80, 0.3)",
    marginHorizontal: 2, // Additional horizontal margin
  },
  smallStatIcon: {
    marginBottom: 4,
  },
  smallStatNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  smallStatLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  yAxisContainer: {
    marginBottom: 8,
  },
  axisLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  chartWithAxis: {
    marginVertical: 4,
    flexDirection: "row",
  },
  yAxisScale: {
    height: 140,
    justifyContent: "space-between",
    marginRight: 8,
    paddingVertical: 4,
  },
  yAxisScaleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chartBars: {
    flexDirection: "row",
    height: 140,
    marginBottom: 8,
    flex: 1,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    width: "60%",
    height: "80%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: "600",
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  chartTotal: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  circularChartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  chartSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 20,
  },
  legendContainer: {
    marginTop: 16,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  insightsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Stacked Bar Chart Styles
  stackedBarContainer: {
    width: "100%",
    height: "100%",
    flexDirection: "column-reverse", // Stack from bottom
    justifyContent: "flex-start",
    borderRadius: 4,
    overflow: "hidden",
  },
  stackedBarSegment: {
    width: "100%",
    borderRadius: 0,
  },

  // Heat Map Styles
  heatMapContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 8,
  },
  heatMapRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
  },
  heatMapHeaderCell: {
    width: 36,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  heatMapHeaderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  heatMapCell: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  heatMapDayText: {
    fontSize: 11,
    fontWeight: "600",
  },
  heatMapLegend: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  heatMapLegendCell: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  heatMapLegendLabel: {
    fontSize: 11,
    marginHorizontal: 4,
  },

  // Stacked Area Chart Styles
  areaChartContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 8,
  },
  areaChartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 4,
  },
  areaChartLabel: {
    fontSize: 8,
    fontWeight: "600",
  },
  emptyChartText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 60,
  },

  // Session Type Legend
  sessionTypeLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  legendItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextSmall: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Chart subtitle
  chartSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
});

export default AnalyticsScreen;
