/**
 * SchedulingScreen
 * Displays scheduling management interface (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

export default function SchedulingScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Text style={styles.infoIcon}>📋</Text>
          <Text style={[styles.infoTitle, { color: colors.onSurface }]}>Scheduling</Text>
          <Text style={[styles.infoDescription, { color: colors.onSurfaceVariant }]}>
            Manage team schedules, create shifts, and handle coverage requests.
          </Text>
          <Text style={[styles.comingSoon, { color: colors.primary, backgroundColor: colors.primaryTransparent }]}>Coming Soon</Text>
        </View>
      </GlassCard>

      {/* Placeholder sections for future features */}
      <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Quick Actions</Text>

      <GlassCard style={styles.actionCard}>
        <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Create Shift</Text>
        <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>Add a new shift to the schedule</Text>
      </GlassCard>

      <GlassCard style={styles.actionCard}>
        <Text style={[styles.actionTitle, { color: colors.onSurface }]}>View Calendar</Text>
        <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>See the full team calendar</Text>
      </GlassCard>

      <GlassCard style={styles.actionCard}>
        <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Coverage Requests</Text>
        <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>Manage shift swap requests</Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    flexGrow: 1,
  },
  infoCard: {
    marginBottom: spacing[6],
  },
  infoContent: {
    alignItems: "center",
    paddingVertical: spacing[6],
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  infoTitle: {
    ...typography.h3,
    marginBottom: spacing[2],
  },
  infoDescription: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  comingSoon: {
    ...typography.labelMedium,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  sectionTitle: {
    ...typography.labelLarge,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  actionCard: {
    marginBottom: spacing[3],
    opacity: 0.6,
  },
  actionTitle: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing[1],
  },
  actionDescription: {
    ...typography.bodySmall,
  },
});
