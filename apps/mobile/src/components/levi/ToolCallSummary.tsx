/**
 * ToolCallSummary — Collapsible row summarizing tool calls.
 *
 * Shows a single row with a caret + summary text (e.g. "Looked up 3 employees").
 * Tap to expand and see individual tool call details.
 * While tools are still running, shows a spinner and "Working..." text.
 */

import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
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
    case "get_employee_profile":
      return "person.text.rectangle";
    case "get_team_overview":
      return "person.3";
    case "get_discipline_summary":
      return "doc.plaintext";
    case "get_position_rankings":
      return "chart.bar";
    default:
      return "wrench";
  }
}

/** Generate a concise summary of what the tool calls did */
function summarizeToolCalls(toolCalls: ToolCallEvent[]): string {
  if (toolCalls.length === 0) return "Working...";

  const allDone = toolCalls.every((tc) => tc.status === "done");
  if (!allDone) return "Working...";

  // Deduplicate labels
  const uniqueLabels = [...new Set(toolCalls.map((tc) => tc.label))];

  if (uniqueLabels.length === 1) {
    return uniqueLabels[0];
  }

  // Group by action type for concise summary
  const actions: string[] = [];
  const lookup = toolCalls.filter((tc) => tc.name === "lookup_employee");
  const list = toolCalls.filter((tc) => tc.name === "list_employees");
  const ratings = toolCalls.filter((tc) => tc.name === "get_employee_ratings");
  const infractions = toolCalls.filter((tc) => tc.name === "get_employee_infractions");
  const profile = toolCalls.filter((tc) => tc.name === "get_employee_profile");
  const team = toolCalls.filter((tc) => tc.name === "get_team_overview");
  const discipline = toolCalls.filter((tc) => tc.name === "get_discipline_summary");
  const rankings = toolCalls.filter((tc) => tc.name === "get_position_rankings");

  if (lookup.length > 0) actions.push(lookup.length === 1 ? "looked up employee" : `looked up ${lookup.length} employees`);
  if (list.length > 0) actions.push("listed employees");
  if (ratings.length > 0) actions.push(ratings.length === 1 ? "checked ratings" : `checked ${ratings.length} ratings`);
  if (infractions.length > 0) actions.push("checked infractions");
  if (profile.length > 0) actions.push(profile.length === 1 ? "loaded profile" : `loaded ${profile.length} profiles`);
  if (team.length > 0) actions.push("loaded team overview");
  if (discipline.length > 0) actions.push("checked discipline");
  if (rankings.length > 0) actions.push("ranked by position");

  if (actions.length === 0) {
    return `Used ${toolCalls.length} tool${toolCalls.length > 1 ? "s" : ""}`;
  }

  // Capitalize first letter
  const joined = actions.join(", ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

interface ToolCallSummaryProps {
  toolCalls: ToolCallEvent[];
}

export function ToolCallSummary({ toolCalls }: ToolCallSummaryProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const allDone = useMemo(
    () => toolCalls.every((tc) => tc.status === "done"),
    [toolCalls]
  );
  const summary = useMemo(() => summarizeToolCalls(toolCalls), [toolCalls]);

  const handleToggle = () => {
    if (!allDone) return;
    haptics.light();
    setExpanded((prev) => !prev);
  };

  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.container}>
      {/* Summary row */}
      <Pressable
        onPress={handleToggle}
        disabled={!allDone}
        style={[
          styles.summaryRow,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.outline,
          },
        ]}
      >
        {/* Leading icon */}
        {allDone ? (
          <AppIcon
            name={expanded ? "chevron.down" : "chevron.right"}
            size={12}
            tintColor={colors.onSurfaceVariant}
          />
        ) : (
          <ActivityIndicator size="small" color={colors.primary} />
        )}

        {/* Summary text */}
        <Text
          style={[styles.summaryText, { color: colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {summary}
        </Text>

        {/* Count badge */}
        {allDone && toolCalls.length > 1 && (
          <View
            style={[styles.countBadge, { backgroundColor: colors.outline }]}
          >
            <Text style={[styles.countText, { color: colors.onSurfaceVariant }]}>
              {toolCalls.length}
            </Text>
          </View>
        )}

        {/* Done checkmark */}
        {allDone && (
          <AppIcon
            name="checkmark.circle.fill"
            size={16}
            tintColor={colors.success}
          />
        )}
      </Pressable>

      {/* Expanded detail list */}
      {expanded && (
        <Animated.View entering={FadeInDown.duration(150)} style={styles.detailList}>
          {toolCalls.map((tc, index) => (
            <View
              key={`${tc.id}-${index}`}
              style={[styles.detailRow, { borderColor: colors.outline }]}
            >
              <AppIcon
                name={getToolIcon(tc.name)}
                size={12}
                tintColor={colors.onSurfaceDisabled}
              />
              <Text
                style={[styles.detailText, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {tc.label}
              </Text>
              <AppIcon
                name="checkmark.circle.fill"
                size={14}
                tintColor={colors.success}
              />
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  summaryText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  detailList: {
    paddingLeft: spacing[3],
    gap: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: 4,
    paddingHorizontal: spacing[2],
  },
  detailText: {
    ...typography.labelSmall,
    flex: 1,
    fontSize: 12,
  },
});

export default ToolCallSummary;
