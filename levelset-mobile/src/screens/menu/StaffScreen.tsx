/**
 * StaffScreen
 * Displays team members and their info (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSchedule } from "../../context/ScheduleContext";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

export default function StaffScreen() {
  const { staff } = useSchedule();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {staff.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Staff Members</Text>
            <Text style={styles.emptyDescription}>
              Staff information will appear here once the system is connected.
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Team Members</Text>
          {staff.map((member) => (
            <GlassCard key={member.id} style={styles.staffCard}>
              <View style={styles.staffRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </>
      )}
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
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  emptyCard: {
    marginTop: spacing[6],
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: spacing[2],
  },
  emptyDescription: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  staffCard: {
    marginBottom: spacing[3],
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.h4,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    fontWeight: fontWeights.semibold,
  },
  staffRole: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
