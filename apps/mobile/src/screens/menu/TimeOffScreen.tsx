/**
 * TimeOffScreen
 * Displays time off requests and balances (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

export default function TimeOffScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Text style={styles.infoIcon}>✈️</Text>
          <Text style={[styles.infoTitle, { color: colors.onSurface }]}>Time Off</Text>
          <Text style={[styles.infoDescription, { color: colors.onSurfaceVariant }]}>
            Request time off, view your balances, and track pending requests.
          </Text>
          <Text style={[styles.comingSoon, { color: colors.primary, backgroundColor: colors.primaryTransparent }]}>Coming Soon</Text>
        </View>
      </GlassCard>

      {/* Placeholder for time off balance */}
      <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Balances</Text>

      <View style={styles.balanceRow}>
        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceValue, { color: colors.onSurface }]}>--</Text>
          <Text style={[styles.balanceLabel, { color: colors.onSurfaceVariant }]}>Vacation</Text>
        </GlassCard>

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceValue, { color: colors.onSurface }]}>--</Text>
          <Text style={[styles.balanceLabel, { color: colors.onSurfaceVariant }]}>Sick</Text>
        </GlassCard>

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceValue, { color: colors.onSurface }]}>--</Text>
          <Text style={[styles.balanceLabel, { color: colors.onSurfaceVariant }]}>Personal</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Recent Requests</Text>

      <GlassCard style={styles.emptyRequestsCard}>
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No recent requests</Text>
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
    marginBottom: spacing[1],
  },
  balanceLabel: {
    ...typography.labelSmall,
  },
  emptyRequestsCard: {
    alignItems: "center",
    paddingVertical: spacing[6],
    opacity: 0.6,
  },
  emptyText: {
    ...typography.bodyMedium,
  },
});
