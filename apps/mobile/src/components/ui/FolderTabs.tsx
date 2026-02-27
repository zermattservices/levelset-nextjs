/**
 * FolderTabs
 * Custom manila folder-style tab bar with two tabs.
 * Active tab appears elevated with glass effect, connected to content below.
 * Inactive tab appears recessed with muted styling.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { typography, fontWeights } from "../../lib/fonts";

interface FolderTab {
  key: string;
  label: string;
  badge?: React.ReactNode;
}

interface FolderTabsProps {
  tabs: FolderTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function FolderTabs({ tabs, activeTab, onTabChange }: FolderTabsProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: spacing[4],
        gap: spacing[1],
        alignItems: "flex-end",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <FolderTab
            key={tab.key}
            tab={tab}
            isActive={isActive}
            onPress={() => {
              if (!isActive) {
                haptics.selection();
                onTabChange(tab.key);
              }
            }}
            colors={colors}
            GlassView={GlassView}
          />
        );
      })}
    </View>
  );
}

interface FolderTabProps {
  tab: FolderTab;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  GlassView: any;
}

function FolderTab({
  tab,
  isActive,
  onPress,
  colors,
  GlassView,
}: FolderTabProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0.7, { duration: 200 }),
    transform: [
      {
        translateY: withTiming(isActive ? 0 : 2, { duration: 200 }),
      },
    ],
  }));

  const tabShape = {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderCurve: "continuous" as const,
  };

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
      }}
    >
      <Text
        style={[
          typography.labelLarge,
          {
            fontWeight: isActive ? fontWeights.semibold : fontWeights.regular,
            color: isActive ? colors.onSurface : colors.onSurfaceVariant,
          },
        ]}
      >
        {tab.label}
      </Text>
      {tab.badge}
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={animatedStyle}>
        {isActive && GlassView ? (
          <GlassView
            style={[
              tabShape,
              {
                overflow: "hidden",
              },
            ]}
          >
            {content}
          </GlassView>
        ) : (
          <View
            style={[
              tabShape,
              {
                backgroundColor: isActive
                  ? colors.surface
                  : colors.surfaceVariant,
                borderWidth: isActive ? 0 : 0,
              },
            ]}
          >
            {content}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default FolderTabs;
