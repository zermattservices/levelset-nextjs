/**
 * SchedulingScreen
 * Displays scheduling management interface (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

export default function SchedulingScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Text style={styles.infoIcon}>📋</Text>
          <Text style={styles.infoTitle}>Scheduling</Text>
          <Text style={styles.infoDescription}>
            Manage team schedules, create shifts, and handle coverage requests.
          </Text>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </View>
      </GlassCard>

      {/* Placeholder sections for future features */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <GlassCard style={styles.actionCard}>
        <Text style={styles.actionTitle}>Create Shift</Text>
        <Text style={styles.actionDescription}>Add a new shift to the schedule</Text>
      </GlassCard>

      <GlassCard style={styles.actionCard}>
        <Text style={styles.actionTitle}>View Calendar</Text>
        <Text style={styles.actionDescription}>See the full team calendar</Text>
      </GlassCard>

      <GlassCard style={styles.actionCard}>
        <Text style={styles.actionTitle}>Coverage Requests</Text>
        <Text style={styles.actionDescription}>Manage shift swap requests</Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.onSurface,
    marginBottom: spacing[2],
  },
  infoDescription: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  comingSoon: {
    ...typography.labelMedium,
    color: colors.primary,
    backgroundColor: colors.primaryTransparent,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  actionCard: {
    marginBottom: spacing[3],
    opacity: 0.6,
  },
  actionTitle: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing[1],
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
