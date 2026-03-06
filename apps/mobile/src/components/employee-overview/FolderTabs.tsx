/**
 * FolderTabs Component
 * Row of folder-style tabs where the active tab connects to content below.
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";

interface FolderTabsProps {
  tabs: string[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function FolderTabs({ tabs, activeIndex, onTabChange }: FolderTabsProps) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row" }}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;

        return (
          <Pressable
            key={tab}
            onPress={() => {
              if (!isActive) {
                haptics.selection();
                onTabChange(index);
              }
            }}
            style={{
              flex: 1,
              paddingVertical: spacing[3],
              alignItems: "center",
              ...(isActive
                ? {
                    backgroundColor: colors.primary,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderCurve: "continuous" as const,
                  }
                : {
                    backgroundColor: "transparent",
                    borderBottomWidth: 2,
                    borderBottomColor: colors.outline,
                  }),
            }}
          >
            <Text
              style={{
                ...typography.labelMedium,
                fontWeight: fontWeights.semibold,
                textAlign: "center",
                color: isActive ? colors.onPrimary : colors.onSurfaceVariant,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default FolderTabs;
