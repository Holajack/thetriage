import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Types ──

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  /** Measurement keys to spotlight. Empty = no spotlight (centered card). */
  spotlightKeys: string[];
  /** Shape of the cutout */
  spotlightShape: 'circle' | 'roundedRect';
  /** Extra padding around the measured area */
  spotlightPadding: number;
  /** Where to place the tooltip relative to the spotlight */
  tooltipPosition: 'above' | 'below' | 'center';
  /** Icon shown in tooltip header */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

// ── Component ──

interface InteractiveWalkthroughProps {
  visible: boolean;
  onComplete: () => void;
  measurements: Record<string, LayoutRect>;
  steps: WalkthroughStep[];
  /** Called when the active step changes — use to scroll the parent to the relevant element */
  onStepChange?: (stepIndex: number, step: WalkthroughStep) => void;
}

export default function InteractiveWalkthrough({
  visible,
  onComplete,
  measurements,
  steps,
  onStepChange,
}: InteractiveWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Animation values
  const overlayOpacity = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.85);
  const ringScale = useSharedValue(1);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // ── Show/hide ──

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setCurrentStep(0);
      overlayOpacity.value = withTiming(1, { duration: 400 });
      tooltipOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      tooltipScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 120 }));
      // Start ring pulse
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (isVisible) {
      overlayOpacity.value = withTiming(0, { duration: 250 });
      tooltipOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setIsVisible)(false);
          runOnJS(setCurrentStep)(0);
        }
      });
      tooltipScale.value = withTiming(0.85, { duration: 200 });
    }
  }, [visible]);

  // ── Step transitions ──

  const animateToStep = useCallback((nextStep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade out tooltip
    tooltipOpacity.value = withTiming(0, { duration: 150 });
    tooltipScale.value = withTiming(0.9, { duration: 150 });

    // After fade out, update step and fade in
    setTimeout(() => {
      setCurrentStep(nextStep);
      onStepChange?.(nextStep, steps[nextStep]);
      tooltipOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));
      tooltipScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 120 }));
    }, 180);
  }, [onStepChange, steps]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } else {
      animateToStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, onComplete, animateToStep]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  }, [onComplete]);

  // ── Spotlight geometry ──

  const getSpotlightRect = (): LayoutRect | null => {
    if (step.spotlightKeys.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const key of step.spotlightKeys) {
      const m = measurements[key];
      if (!m) return null;
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + m.width);
      maxY = Math.max(maxY, m.y + m.height);
    }

    const pad = step.spotlightPadding;
    return {
      x: minX - pad,
      y: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2,
    };
  };

  const spotlightRect = getSpotlightRect();

  // ── Tooltip positioning ──

  const getTooltipStyle = () => {
    const base = { left: 20, right: 20 };

    if (step.tooltipPosition === 'center' || !spotlightRect) {
      return { ...base, top: SCREEN_H / 2 - 100 };
    }

    if (step.tooltipPosition === 'above') {
      // Place tooltip above the spotlight, with 20px gap
      const tooltipBottom = spotlightRect.y - 20;
      // Estimate tooltip height ~160px, position from top
      const tooltipTop = Math.max(60, tooltipBottom - 180);
      return { ...base, top: tooltipTop };
    }

    // below
    const tooltipTop = spotlightRect.y + spotlightRect.height + 20;
    return { ...base, top: Math.min(tooltipTop, SCREEN_H - 220) };
  };

  // ── Animated styles ──

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const tooltipAnimStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ scale: tooltipScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  // ── Render ──

  if (!isVisible) return null;

  const renderSvgOverlay = () => {
    if (!spotlightRect) {
      // No spotlight — just a dark overlay
      return (
        <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
          <Rect width={SCREEN_W} height={SCREEN_H} fill="rgba(0,0,0,0.78)" />
        </Svg>
      );
    }

    const { x, y, width, height } = spotlightRect;

    if (step.spotlightShape === 'circle') {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.max(width, height) / 2;

      return (
        <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="spotlight-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
              <Rect width={SCREEN_W} height={SCREEN_H} fill="white" />
              <Circle cx={cx} cy={cy} r={r} fill="black" />
            </Mask>
          </Defs>
          <Rect
            width={SCREEN_W}
            height={SCREEN_H}
            fill="rgba(0,0,0,0.78)"
            mask="url(#spotlight-mask)"
          />
        </Svg>
      );
    }

    // roundedRect
    const rx = 20;
    return (
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="spotlight-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
            <Rect width={SCREEN_W} height={SCREEN_H} fill="white" />
            <Rect x={x} y={y} width={width} height={height} rx={rx} ry={rx} fill="black" />
          </Mask>
        </Defs>
        <Rect
          width={SCREEN_W}
          height={SCREEN_H}
          fill="rgba(0,0,0,0.78)"
          mask="url(#spotlight-mask)"
        />
      </Svg>
    );
  };

  const renderHighlightRing = () => {
    if (!spotlightRect) return null;

    const { x, y, width, height } = spotlightRect;

    if (step.spotlightShape === 'circle') {
      const size = Math.max(width, height);
      const cx = x + width / 2 - size / 2;
      const cy = y + height / 2 - size / 2;

      return (
        <Animated.View
          style={[
            styles.highlightRing,
            ringAnimStyle,
            {
              left: cx - 3,
              top: cy - 3,
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
            },
          ]}
        />
      );
    }

    // roundedRect
    return (
      <Animated.View
        style={[
          styles.highlightRing,
          ringAnimStyle,
          {
            left: x - 3,
            top: y - 3,
            width: width + 6,
            height: height + 6,
            borderRadius: 23,
          },
        ]}
      />
    );
  };

  const tooltipPos = getTooltipStyle();

  return (
    <Modal visible={isVisible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        {/* SVG dark overlay with spotlight cutout */}
        {renderSvgOverlay()}

        {/* Pulsing highlight ring */}
        {renderHighlightRing()}

        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Tooltip card */}
        <Animated.View style={[styles.tooltip, tooltipPos, tooltipAnimStyle]}>
          <LinearGradient
            colors={['#1B4A3A', '#2E5D4F', '#1B4A3A']}
            locations={[0, 0.5, 1]}
            style={styles.tooltipGradient}
          >
            {/* Header with icon */}
            <View style={styles.tooltipHeader}>
              {step.icon && (
                <View style={[styles.tooltipIconCircle, { backgroundColor: (step.iconColor || '#4CAF50') + '20' }]}>
                  <Ionicons name={step.icon} size={22} color={step.iconColor || '#4CAF50'} />
                </View>
              )}
              <Text style={styles.tooltipTitle}>{step.title}</Text>
            </View>

            <Text style={styles.tooltipDescription}>{step.description}</Text>

            {/* Footer: progress dots + next button */}
            <View style={styles.tooltipFooter}>
              <View style={styles.progressDots}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentStep && styles.progressDotActive,
                      index < currentStep && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {isLastStep ? "Let's Go!" : 'Next'}
                  </Text>
                  <Ionicons
                    name={isLastStep ? 'rocket-outline' : 'arrow-forward'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(76, 175, 80, 0.6)',
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  tooltipGradient: {
    padding: 20,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  tooltipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8F5E9',
    flex: 1,
  },
  tooltipDescription: {
    fontSize: 15,
    color: '#B8E6C1',
    lineHeight: 22,
    marginBottom: 18,
  },
  tooltipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 7,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(232, 245, 233, 0.25)',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
