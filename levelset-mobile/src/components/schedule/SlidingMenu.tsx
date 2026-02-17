/**
 * SlidingMenu Component
 * A sliding drawer menu with Liquid Glass effect for the Schedule tab
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
} from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { useSlidingMenu, MenuTab } from "../../context/SlidingMenuContext";
import { AppIcon } from "../../components/ui";
import { colors } from "../../lib/colors";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";

export function SlidingMenu() {
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const MENU_WIDTH = SCREEN_WIDTH * 0.75;
  const { isMenuOpen, closeMenu, activeTab, setActiveTab, menuTabs } =
    useSlidingMenu();

  const slideX = useSharedValue(-MENU_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    slideX.value = withSpring(isMenuOpen ? 0 : -MENU_WIDTH, {
      damping: 28,
      stiffness: 300,
      mass: 0.8,
    });
    backdropOpacity.value = withTiming(isMenuOpen ? 1 : 0, { duration: 200 });
  }, [isMenuOpen]);

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetX(-20)
    .onUpdate((e) => {
      if (e.translationX < 0) {
        slideX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -MENU_WIDTH * 0.3) {
        slideX.value = withSpring(-MENU_WIDTH, {
          damping: 28,
          stiffness: 300,
          mass: 0.8,
        });
        runOnJS(closeMenu)();
      } else {
        slideX.value = withSpring(0, { damping: 28, stiffness: 300, mass: 0.8 });
      }
    });

  const handleTabPress = (tabId: MenuTab) => {
    haptics.selection();
    setActiveTab(tabId);
  };

  const menuContent = (
    <View style={[styles.menuInner, { paddingTop: insets.top + spacing[4] }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {menuTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <AppIcon
                  name={tab.icon as string}
                  size={22}
                  tintColor={
                    isActive ? colors.primary : colors.onSurfaceVariant
                  }
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    isActive && styles.menuLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      {/* Backdrop */}
      <ReAnimated.View
        style={[
          styles.backdrop,
          backdropStyle,
          {
            pointerEvents: isMenuOpen ? "auto" : "none",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
      </ReAnimated.View>

      {/* Menu */}
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={[styles.menuContainer, { width: MENU_WIDTH }, menuStyle]}>
          {useGlassEffect && GlassView ? (
            <GlassView
              style={styles.glassMenu}
              glassEffectStyle="regular"
              tintColor={colors.glassTintLight}
            >
              {menuContent}
            </GlassView>
          ) : (
            <View style={styles.fallbackMenu}>{menuContent}</View>
          )}
        </ReAnimated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    zIndex: 100,
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 101,
  },
  glassMenu: {
    flex: 1,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fallbackMenu: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    borderCurve: "continuous",
    borderRightWidth: 1,
    borderRightColor: colors.outline,
  },
  menuInner: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  header: {
    marginBottom: spacing[6],
    paddingHorizontal: spacing[2],
  },
  headerTitle: {
    ...typography.h3,
    color: colors.onSurface,
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    marginBottom: spacing[1],
  },
  menuItemActive: {
    backgroundColor: colors.primaryTransparent,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing[4],
  },
  menuIcon: {
    width: 22,
    height: 22,
  },
  menuLabel: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  activeIndicator: {
    width: 4,
    height: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default SlidingMenu;
