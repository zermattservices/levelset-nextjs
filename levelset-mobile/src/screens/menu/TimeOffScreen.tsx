/**
 * TimeOffScreen
 * Displays time off requests and balances (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

export default function TimeOffScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Text style={styles.infoIcon}>✈️</Text>
          <Text style={styles.infoTitle}>Time Off</Text>
          <Text style={styles.infoDescription}>
            Request time off, view your balances, and track pending requests.
          </Text>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </View>
      </GlassCard>

      {/* Placeholder for time off balance */}
      <Text style={styles.sectionTitle}>Balances</Text>

      <View style={styles.balanceRow}>
        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceValue}>--</Text>
          <Text style={styles.balanceLabel}>Vacation</Text>
        </GlassCard>

        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceValue}>--</Text>
          <Text style={styles.balanceLabel}>Sick</Text>
        </GlassCard>

        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceValue}>--</Text>
          <Text style={styles.balanceLabel}>Personal</Text>
        </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>Recent Requests</Text>

      <GlassCard style={styles.emptyRequestsCard}>
        <Text style={styles.emptyText}>No recent requests</Text>
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
  balanceRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  balanceCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[4],
  },
  balanceValue: {
    ...typography.h2,
    color: colors.onSurface,
    marginBottom: spacing[1],
  },
  balanceLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  emptyRequestsCard: {
    alignItems: "center",
    paddingVertical: spacing[6],
    opacity: 0.6,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
});
