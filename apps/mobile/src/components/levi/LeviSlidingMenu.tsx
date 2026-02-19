/**
 * LeviSlidingMenu Component
 * Claude-style drawer: the sidebar sits BEHIND the main content.
 * The main content panel slides right with rounded corners to reveal it.
 *
 * This component renders the sidebar content (always mounted, positioned
 * on the left). The parent (index.tsx) handles the content panel animation
 * and the edge swipe gestures via the shared `progress` value from context.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { useLeviMenu, type LeviMenuTab } from "../../context/LeviMenuContext";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";
import { useTranslation } from "react-i18next";

// Same tab bar constant as ChatInput for matching bottom spacing
const TAB_BAR_HEIGHT = 49;

export function LeviSlidingMenu() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { GlassView } = useGlass();
  const glassAvailable = isGlassAvailable();

  const {
    closeMenu,
    activeTab,
    setActiveTab,
    menuTabs,
    openSettings,
  } = useLeviMenu();

  const handleTabPress = (tabId: LeviMenuTab) => {
    haptics.selection();
    setActiveTab(tabId);
  };

  const handleSettingsPress = () => {
    haptics.selection();
    openSettings();
    closeMenu();
  };

  // Bottom padding matches ChatInput spacing
  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + Math.round(insets.bottom / 2);

  const settingsButtonContent = (
    <Pressable
      onPress={handleSettingsPress}
      style={styles.settingsButtonInner}
    >
      <AppIcon
        name="gear"
        size={18}
        tintColor={colors.onSurfaceVariant}
      />
      <Text style={[styles.settingsLabel, { color: colors.onSurfaceVariant }]}>
        {t("levi.settings")}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing[4],
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {/* Bold title */}
      <Text selectable style={[styles.title, { color: colors.onSurface }]}>
        Levi
      </Text>

      {/* Navigation items */}
      <View style={styles.navSection}>
        {menuTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.6}
            >
              <AppIcon
                name={tab.icon}
                size={20}
                tintColor={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: colors.onSurfaceVariant },
                  isActive && {
                    color: colors.primary,
                    fontWeight: fontWeights.semibold,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Settings button — full width, liquid glass */}
      <View style={styles.settingsContainer}>
        {glassAvailable && GlassView ? (
          <GlassView isInteractive style={styles.glassButton}>
            {settingsButtonContent}
          </GlassView>
        ) : (
          <View
            style={[
              styles.fallbackButton,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            {settingsButtonContent}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  title: {
    ...typography.h1,
    marginBottom: spacing[6],
  },
  navSection: {
    gap: spacing[1],
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  navLabel: {
    ...typography.bodyLarge,
  },
  spacer: {
    flex: 1,
  },
  settingsContainer: {
    paddingHorizontal: spacing[2],
  },
  settingsButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  settingsLabel: {
    ...typography.labelMedium,
    fontWeight: fontWeights.medium,
  },
  glassButton: {
    borderRadius: 9999,
  },
  fallbackButton: {
    borderRadius: 9999,
  },
});

export default LeviSlidingMenu;
