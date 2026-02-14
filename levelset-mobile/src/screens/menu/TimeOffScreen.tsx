/**
 * TimeOffScreen
 * Displays time off requests and balances (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";

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
  balanceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  balanceCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  balanceValue: {
    ...typography.h2,
    color: colors.onSurface,
    marginBottom: 4,
  },
  balanceLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  emptyRequestsCard: {
    alignItems: "center",
    paddingVertical: 24,
    opacity: 0.6,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
});
