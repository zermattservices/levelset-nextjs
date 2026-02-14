/**
 * SlidingMenu Component
 * A sliding drawer menu with Liquid Glass effect for the Schedule tab
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { useSlidingMenu, MenuTab } from "../../context/SlidingMenuContext";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";
import { borderRadius } from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export function SlidingMenu() {
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();
  const insets = useSafeAreaInsets();
  const { isMenuOpen, closeMenu, activeTab, setActiveTab, menuTabs } =
    useSlidingMenu();

  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMenuOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -MENU_WIDTH,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMenuOpen, slideAnim, backdropAnim]);

  const handleTabPress = (tabId: MenuTab) => {
    setActiveTab(tabId);
  };

  const menuContent = (
    <View style={[styles.menuInner, { paddingTop: insets.top + 16 }]}>
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
                {Platform.OS === "ios" ? (
                  <SymbolView
                    name={tab.icon as any}
                    size={22}
                    tintColor={isActive ? colors.primary : colors.onSurfaceVariant}
                    style={styles.menuIcon}
                  />
                ) : (
                  <View
                    style={[
                      styles.menuIconPlaceholder,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.onSurfaceVariant,
                      },
                    ]}
                  />
                )}
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
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
            pointerEvents: isMenuOpen ? "auto" : "none",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
      </Animated.View>

      {/* Menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
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
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 100,
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: MENU_WIDTH,
    zIndex: 101,
  },
  glassMenu: {
    flex: 1,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    overflow: "hidden",
  },
  fallbackMenu: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    borderRightWidth: 1,
    borderRightColor: colors.outline,
  },
  menuInner: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 8,
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: colors.primaryTransparent,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 14,
    width: 22,
    height: 22,
  },
  menuIconPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 4,
    marginRight: 14,
  },
  menuLabel: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  activeIndicator: {
    width: 4,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default SlidingMenu;
