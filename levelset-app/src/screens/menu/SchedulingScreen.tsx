/**
 * SchedulingScreen
 * Displays scheduling management interface (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";

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
    padding: 16,
    flexGrow: 1,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoContent: {
    alignItems: "center",
    paddingVertical: 24,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: 8,
  },
  infoDescription: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 12,
  },
  comingSoon: {
    ...typography.labelMedium,
    color: colors.primary,
    backgroundColor: colors.primaryTransparent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionCard: {
    marginBottom: 12,
    opacity: 0.6,
  },
  actionTitle: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
