/**
 * TabBar Component
 * Horizontal scrollable row of liquid glass pill buttons for tab navigation.
 */

import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pe", label: "Positional Excellence" },
  { key: "discipline", label: "Discipline" },
  { key: "schedule", label: "Schedule" },
  { key: "pathway", label: "Pathway" },
  { key: "reviews", label: "Reviews" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing[5],
        gap: spacing[2],
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;

        if (isActive) {
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                haptics.selection();
                onTabChange(tab.key);
              }}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 9999,
                paddingVertical: spacing[2],
                paddingHorizontal: spacing[4],
                borderCurve: "continuous",
                overflow: "hidden",
              }}
            >
              <Text
                style={{
                  ...typography.labelMedium,
                  fontWeight: fontWeights.semibold,
                  color: colors.onPrimary,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        }

        // Inactive tab — glass or fallback
        if (GlassView) {
          return (
            <GlassView
              key={tab.key}
              isInteractive
              style={{
                borderRadius: 9999,
                borderCurve: "continuous",
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => {
                  haptics.selection();
                  onTabChange(tab.key);
                }}
                style={{
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[4],
                }}
              >
                <Text
                  style={{
                    ...typography.labelMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            </GlassView>
          );
        }

        // Fallback (non-iOS)
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              haptics.selection();
              onTabChange(tab.key);
            }}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.outline,
              borderRadius: 9999,
              paddingVertical: spacing[2],
              paddingHorizontal: spacing[4],
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <Text
              style={{
                ...typography.labelMedium,
                fontWeight: fontWeights.semibold,
                color: colors.onSurfaceVariant,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export { TABS };
export default TabBar;
