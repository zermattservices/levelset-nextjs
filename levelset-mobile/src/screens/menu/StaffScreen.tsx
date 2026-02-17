/**
 * StaffScreen
 * Displays team members and their info (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSchedule } from "../../context/ScheduleContext";
import { GlassCard } from "../../components/glass";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

export default function StaffScreen() {
  const colors = useColors();
  const { staff } = useSchedule();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {staff.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Staff Members</Text>
            <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>
              Staff information will appear here once the system is connected.
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Team Members</Text>
          {staff.map((member) => (
            <GlassCard key={member.id} style={styles.staffCard}>
              <View style={styles.staffRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryTransparent }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={[styles.staffName, { color: colors.onSurface }]}>{member.name}</Text>
                  <Text style={[styles.staffRole, { color: colors.onSurfaceVariant }]}>{member.role}</Text>
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
  },
  scrollContent: {
    padding: spacing[4],
    flexGrow: 1,
  },
  sectionTitle: {
    ...typography.labelLarge,
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
    marginBottom: spacing[2],
  },
  emptyDescription: {
    ...typography.bodyMedium,
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.h4,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  staffRole: {
    ...typography.bodySmall,
  },
});
