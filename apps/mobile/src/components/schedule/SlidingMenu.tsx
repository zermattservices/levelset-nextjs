/**
 * SlidingMenu Component
 * Claude-style drawer: the sidebar sits BEHIND the main content.
 * The main content panel slides right with rounded corners to reveal it.
 *
 * This component renders the sidebar content (always mounted, positioned
 * on the left). The parent (index.tsx) handles the content panel animation
 * and the edge swipe gestures.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingMenu, type MenuTab } from "../../context/SlidingMenuContext";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";

// Same tab bar constant for matching bottom spacing
const TAB_BAR_HEIGHT = 49;

export function SlidingMenu() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { activeTab, setActiveTab, menuTabs } = useSlidingMenu();

  const handleTabPress = (tabId: MenuTab) => {
    haptics.selection();
    setActiveTab(tabId);
  };

  // Bottom padding accounts for tab bar + safe area
  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + Math.round(insets.bottom / 2);

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
        Schedule
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
                name={tab.icon as string}
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
});

export default SlidingMenu;
