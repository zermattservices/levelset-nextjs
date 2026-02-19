/**
 * ToolCallCard — compact row showing a tool call in progress or completed.
 * Mimics Claude-style tool call indicators with icon + label + status.
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import type { ToolCallEvent } from "../../context/LeviChatContext";

/** Map tool names to SF Symbol icon names */
function getToolIcon(name: string): string {
  switch (name) {
    case "lookup_employee":
      return "magnifyingglass";
    case "list_employees":
      return "person.2";
    case "get_employee_ratings":
      return "star";
    case "get_employee_infractions":
      return "exclamationmark.triangle";
    default:
      return "wrench";
  }
}

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const colors = useColors();
  const isDone = toolCall.status === "done";

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.outline,
        },
      ]}
    >
      <AppIcon
        name={getToolIcon(toolCall.name)}
        size={14}
        tintColor={colors.onSurfaceVariant}
      />
      <Text
        style={[styles.label, { color: colors.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {toolCall.label}
      </Text>
      {isDone ? (
        <AppIcon name="checkmark.circle.fill" size={16} tintColor={colors.success} />
      ) : (
        <ActivityIndicator size="small" color={colors.primary} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  label: {
    ...typography.labelSmall,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
});

export default ToolCallCard;
