/**
 * Levi Tab
 * Claude-style drawer: the sidebar sits BEHIND the main content.
 * The main content panel slides right with rounded corners to reveal it.
 *
 * This component renders the sidebar content (always mounted, positioned
 * on the left). The parent (index.tsx) handles the content panel animation
 * and the edge swipe gestures via the shared `progress` value from context.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LeviSlidingMenu } from "../../../src/components/levi/LeviSlidingMenu";
import { LeviSettingsModal } from "../../../src/components/levi/LeviSettingsModal";
import { useLeviMenu } from "../../../src/context/LeviMenuContext";
import { AppIcon } from "../../../src/components/ui";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, haptics } from "../../../src/lib/theme";
import { useTranslation } from "react-i18next";
import { useGlass, isGlassAvailable } from "../../../src/hooks/useGlass";

// Screen imports
import ChatScreen from "../../../src/components/levi/ChatScreen";
import TasksScreen from "../../../src/screens/levi/TasksScreen";
import MeetingsScreen from "../../../src/screens/levi/MeetingsScreen";
import AlertsScreen from "../../../src/screens/levi/AlertsScreen";

// Spring config for snappy drawer feel
const SPRING_CONFIG = {
  damping: 28,
  stiffness: 280,
  mass: 0.8,
};

// Corner radius when content panel is shifted
const PANEL_RADIUS = 64;

function LeviContent() {
  const { activeTab } = useLeviMenu();

  switch (activeTab) {
    case "chat":
      return <ChatScreen />;
    case "tasks":
      return <TasksScreen />;
    case "meetings":
      return <MeetingsScreen />;
    case "alerts":
      return <AlertsScreen />;
    default:
      return <ChatScreen />;
  }
}

/**
 * Claude-style header:
 *   Left  — sidebar toggle (circle with lines icon)
 *   Center — "Levi" title
 *   Right — spacer (could hold new-chat later)
 */
function LeviHeader({
  onToggle,
}: {
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();

  const menuIcon = (
    <Pressable
      onPress={onToggle}
      hitSlop={12}
      style={styles.headerButtonPressable}
    >
      <AppIcon
        name="line.3.horizontal"
        size={18}
        tintColor={colors.onSurfaceVariant}
      />
    </Pressable>
  );

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
      {/* Sidebar toggle — liquid glass circle */}
      {glassAvail && GlassView ? (
        <GlassView isInteractive style={styles.headerButton}>
          {menuIcon}
        </GlassView>
      ) : (
        <View
          style={[
            styles.headerButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          {menuIcon}
        </View>
      )}

      {/* Center title */}
      <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
        Levi
      </Text>

      {/* Right spacer (matching width of left button for centering) */}
      <View style={styles.headerButtonSpacer} />
    </View>
  );
}

export default function LeviTab() {
  const colors = useColors();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { isMenuOpen, openMenu, closeMenu } = useLeviMenu();

  // How far the content panel slides right (50% of screen)
  const DRAWER_WIDTH = SCREEN_WIDTH * 0.5;

  // Shared value 0 → 1 (closed → open)
  const progress = useSharedValue(0);

  // Sync React state → shared value
  useEffect(() => {
    progress.value = withSpring(isMenuOpen ? 1 : 0, SPRING_CONFIG);
  }, [isMenuOpen]);

  // ── Gesture: edge swipe to open, swipe-back to close ──
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      // When closed, only allow right swipe from left edge
      // When open, only allow left swipe to close
      if (!isMenuOpen) {
        // Opening: map translationX 0→DRAWER_WIDTH to progress 0→1
        const clamped = Math.max(0, Math.min(e.translationX, DRAWER_WIDTH));
        progress.value = clamped / DRAWER_WIDTH;
      } else {
        // Closing: map negative translationX 0→-DRAWER_WIDTH to progress 1→0
        const clamped = Math.max(-DRAWER_WIDTH, Math.min(e.translationX, 0));
        progress.value = 1 + clamped / DRAWER_WIDTH;
      }
    })
    .onEnd((e) => {
      const velocity = e.velocityX;
      const currentProgress = progress.value;

      // Threshold: snap open if >40% or fast fling
      const shouldOpen =
        (!isMenuOpen && (currentProgress > 0.4 || velocity > 500)) ||
        (isMenuOpen && !(currentProgress < 0.6 || velocity < -500));

      progress.value = withSpring(shouldOpen ? 1 : 0, SPRING_CONFIG);

      if (shouldOpen && !isMenuOpen) {
        runOnJS(openMenu)();
      } else if (!shouldOpen && isMenuOpen) {
        runOnJS(closeMenu)();
      }
    });

  // ── Animated styles for content panel ──
  const contentAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [0, DRAWER_WIDTH]);
    const radius = interpolate(progress.value, [0, 1], [0, PANEL_RADIUS]);

    return {
      transform: [{ translateX }],
      borderRadius: radius,
    };
  });

  // ── Tap overlay to close ──
  const handleOverlayPress = () => {
    haptics.light();
    closeMenu();
  };

  const handleToggle = () => {
    haptics.light();
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceVariant }]}>
      {/* ── Sidebar layer (sits BEHIND, always mounted) ── */}
      <View
        style={[
          styles.sidebarContainer,
          {
            width: DRAWER_WIDTH,
          },
        ]}
      >
        <LeviSlidingMenu />
      </View>

      {/* ── Main content panel (slides RIGHT to reveal sidebar) ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.contentPanel,
            {
              backgroundColor: colors.background,
              boxShadow: "-4px 0px 24px rgba(0, 0, 0, 0.2)",
            },
            contentAnimatedStyle,
          ]}
        >
          <LeviHeader onToggle={handleToggle} />
          <LeviContent />

          {/* Tap overlay when menu is open */}
          {isMenuOpen && (
            <Pressable
              style={styles.tapOverlay}
              onPress={handleOverlayPress}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {/* Settings modal (floats above everything) */}
      <LeviSettingsModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  contentPanel: {
    flex: 1,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerButtonPressable: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
  },
  headerButtonSpacer: {
    width: 36,
    height: 36,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
